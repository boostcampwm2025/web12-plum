import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Poll } from '@plum/shared-interfaces';

import { PollManagerService } from './poll-manager.service.js';
import { RedisService } from '../redis.service.js';

describe('PollManagerService', () => {
  let service: PollManagerService;
  let redisClient: any;
  let pipeline: any;
  let eventEmitter: EventEmitter2;

  const mockPolls: Poll[] = [
    { id: 'poll-1', roomId: 'room-1', title: 'Test 1' } as Poll,
    { id: 'poll-2', roomId: 'room-1', title: 'Test 2' } as Poll,
  ];

  beforeEach(async () => {
    pipeline = {
      rpush: jest.fn().mockReturnThis(),
      lrem: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 'OK'],
        [null, 1],
      ]),
    };

    redisClient = {
      pipeline: jest.fn().mockReturnValue(pipeline),
      lrange: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        PollManagerService,
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue(redisClient),
          },
        },
      ],
    }).compile();

    service = module.get<PollManagerService>(PollManagerService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.spyOn(service as any, 'addSaveToPipeline').mockImplementation(() => {});
    jest.spyOn(service as any, 'addDeleteToPipeline').mockImplementation(() => {});
    jest.spyOn(service as any, 'findMany').mockResolvedValue(mockPolls);
  });

  describe('addPollToRoom', () => {
    it('투표를 저장하고 리스트에 ID를 추가해야 한다', async () => {
      await service.addPollToRoom('room-1', mockPolls);

      expect(redisClient.pipeline).toHaveBeenCalled();
      expect(pipeline.rpush).toHaveBeenCalledTimes(mockPolls.length);
      expect(pipeline.exec).toHaveBeenCalled();
    });

    it('Pipeline 실행 중 에러 발생 시 롤백을 수행해야 한다', async () => {
      pipeline.exec.mockResolvedValueOnce([[new Error('Redis Error'), null]]);

      await expect(service.addPollToRoom('room-1', mockPolls)).rejects.toThrow();

      expect(redisClient.pipeline).toHaveBeenCalledTimes(2);
      expect(pipeline.lrem).toHaveBeenCalledTimes(mockPolls.length);
    });
  });

  describe('getPollsInRoom', () => {
    it('lrange로 ID를 조회한 후 상세 데이터를 반환해야 한다', async () => {
      const pollIds = ['poll-1', 'poll-2'];
      redisClient.lrange.mockResolvedValue(pollIds);

      const result = await service.getPollsInRoom('room-1');

      expect(redisClient.lrange).toHaveBeenCalledWith('room:room-1:polls', 0, -1);
      expect(service.findMany).toHaveBeenCalledWith(pollIds);
      expect(result).toEqual(mockPolls);
    });

    it('빈 결과: 저장된 투표가 없으면 빈 배열을 반환해야 한다', async () => {
      redisClient.lrange.mockResolvedValue([]);

      const result = await service.getPollsInRoom('room-1');

      expect(result).toEqual([]);
      expect(service.findMany).not.toHaveBeenCalled();
    });
  });

  describe('startPoll', () => {
    const pollId = 'poll-123';
    const timeLimit = 60;
    const activeKey = `poll:${pollId}:active`;
    const countKey = `poll:${pollId}:counts`;

    const mockPoll = {
      id: pollId,
      options: [
        { id: 0, value: '옵션1' },
        { id: 1, value: '옵션2' },
      ],
    };

    beforeEach(() => {
      jest.spyOn(service as any, 'addUpdatePartialToPipeline').mockImplementation(() => {});
      jest.spyOn(service as any, 'getActiveKey').mockReturnValue(activeKey);
      jest.spyOn(service as any, 'getVoteCountKey').mockReturnValue(countKey);

      jest.spyOn(service, 'findOne').mockResolvedValue(mockPoll as any);
    });

    it('투표 상태를 active로 변경하고 TTL 키를 생성해야 한다', async () => {
      pipeline.set = jest.fn().mockReturnThis();
      pipeline.hset = jest.fn().mockReturnThis();
      pipeline.expire = jest.fn().mockReturnThis();

      pipeline.exec.mockResolvedValueOnce([
        [null, 'OK'],
        [null, 'OK'],
        [null, 'OK'],
        [null, 'OK'],
      ]);

      await service.startPoll(pollId, timeLimit);

      expect(service['addUpdatePartialToPipeline']).toHaveBeenCalledWith(pipeline, pollId, {
        status: 'active',
        startedAt: expect.any(String),
        endedAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(pipeline.hset).toHaveBeenCalledWith(countKey, { '0': '0', '1': '0' });
      expect(pipeline.set).toHaveBeenCalledWith(activeKey, 'true', 'EX', timeLimit);
      expect(pipeline.exec).toHaveBeenCalled();
    });

    it('파이프라인 에러 발생 시 상태를 pending으로 롤백해야 한다', async () => {
      pipeline.set = jest.fn().mockReturnThis();
      pipeline.del = jest.fn().mockReturnThis();

      pipeline.exec
        .mockResolvedValueOnce([[new Error('Redis Error'), null]]) // 메인 실패
        .mockResolvedValueOnce([[null, 'OK']]); // 롤백 성공

      await expect(service.startPoll(pollId, timeLimit)).rejects.toThrow();

      expect(redisClient.pipeline).toHaveBeenCalledTimes(2);

      expect(service['addUpdatePartialToPipeline']).toHaveBeenCalledWith(
        expect.anything(),
        pollId,
        { status: 'pending' },
      );

      expect(pipeline.del).toHaveBeenCalledWith(activeKey);
    });
  });

  describe('submitVote', () => {
    const pollId = 'poll-123';
    const participantId = 'user-456';
    const participantName = 'user-456';
    const optionId = 1;
    const activeKey = `poll:${pollId}:active`;
    const voterKey = `poll:${pollId}:voters`;
    const countKey = `poll:${pollId}:counts`;

    beforeEach(() => {
      redisClient.exists = jest.fn();
      redisClient.hsetnx = jest.fn();

      pipeline.hincrby = jest.fn().mockReturnThis();
      pipeline.expire = jest.fn().mockReturnThis();
      pipeline.hgetall = jest.fn().mockReturnThis();
      pipeline.srem = jest.fn().mockReturnThis();
      pipeline.hdel = jest.fn().mockReturnThis();

      jest.spyOn(service as any, 'getActiveKey').mockReturnValue(activeKey);
      jest.spyOn(service as any, 'getVoterKey').mockReturnValue(voterKey);
      jest.spyOn(service as any, 'getVoteCountKey').mockReturnValue(countKey);
    });

    it('투표 후 정렬된 옵션 리스트를 반환해야 한다', async () => {
      redisClient.exists.mockResolvedValue(1);
      redisClient.hsetnx.mockResolvedValue(1);

      const mockHgetallData = { '1': '5', '0': '10' };

      pipeline.exec.mockResolvedValueOnce([
        [null, 6],
        [null, mockHgetallData],
        [null, 'OK'],
      ]);

      const result = await service.submitVote(pollId, participantId, participantName, optionId);

      expect(redisClient.hsetnx).toHaveBeenCalledWith(
        voterKey,
        participantId,
        `${optionId}:${participantName}`,
      );
      expect(result).toEqual({
        pollId,
        options: [
          { id: 0, count: 10 },
          { id: 1, count: 5 },
        ],
      });
    });

    it('투표가 활성 상태가 아니면 에러를 던져야 한다', async () => {
      redisClient.exists.mockResolvedValue(0);

      await expect(
        service.submitVote(pollId, participantId, participantName, optionId),
      ).rejects.toThrow('Poll is not active');
    });

    it('이미 투표한 유저면 에러를 던져야 한다', async () => {
      redisClient.exists.mockResolvedValue(1);
      redisClient.hsetnx.mockResolvedValue(0);

      await expect(
        service.submitVote(pollId, participantId, participantName, optionId),
      ).rejects.toThrow('Duplicate vote attempt');
    });

    it('파이프라인 에러 발생 시 srem 및 hincrby -1 롤백을 수행해야 한다', async () => {
      redisClient.exists.mockResolvedValue(1);
      redisClient.hsetnx.mockResolvedValue(1);
      pipeline.exec.mockResolvedValueOnce([[new Error('Redis Error'), null]]);

      await expect(
        service.submitVote(pollId, participantId, participantName, optionId),
      ).rejects.toThrow();

      expect(pipeline.hdel).toHaveBeenCalledWith(voterKey, participantId);
      expect(pipeline.hincrby).toHaveBeenCalledWith(countKey, optionId.toString(), -1);
    });
  });

  describe('closePoll', () => {
    const pollId = 'poll-123';
    const mockPoll = {
      id: pollId,
      options: [
        { id: 0, value: '치킨', count: 0 },
        { id: 1, value: '피자', count: 0 },
      ],
    };

    beforeEach(() => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockPoll as any);
      jest.spyOn(service, 'updatePartial').mockResolvedValue(undefined);
      pipeline.hgetall = jest.fn().mockReturnThis();
      pipeline.del = jest.fn().mockReturnThis();
    });

    it('카운트와 투표자 명단을 병합하여 옵션 리스트를 반환해야 한다', async () => {
      const mockCounts = { '0': '2', '1': '1' };
      const mockVoters = {
        'user-1': '0:홍길동',
        'user-2': '0:김철수',
        'user-3': '1:이영희',
      };

      pipeline.exec.mockResolvedValueOnce([
        [null, mockCounts],
        [null, mockVoters],
        [null, 1],
      ]);

      const result = await service.closePoll(pollId);

      expect(service.updatePartial).toHaveBeenCalledWith(
        pollId,
        expect.objectContaining({
          status: 'ended',
          options: [
            expect.objectContaining({
              id: 0,
              count: 2,
              voters: [
                { id: 'user-1', name: '홍길동' },
                { id: 'user-2', name: '김철수' },
              ],
            }),
            expect.objectContaining({
              id: 1,
              count: 1,
              voters: [{ id: 'user-3', name: '이영희' }],
            }),
          ],
        }),
      );
      expect(result[0].voters).toHaveLength(2);
      expect(result[1].count).toBe(1);
    });

    it('존재하지 않는 투표 종료 시 에러를 던져야 한다', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(null);
      await expect(service.closePoll(pollId)).rejects.toThrow('Poll not found');
    });
  });

  describe('getFinalResults', () => {
    it('종료된 투표의 경우 저장된 options를 반환해야 한다', async () => {
      const endedPoll = {
        status: 'ended',
        options: [{ id: 0, count: 5, voters: ['u1'] }],
      };
      jest.spyOn(service, 'findOne').mockResolvedValue(endedPoll as any);

      const result = await service.getFinalResults('p1');
      expect(result).toEqual(endedPoll.options);
    });

    it('종료되지 않았거나 없는 투표는 빈 배열을 반환해야 한다', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({ status: 'active' } as any);
      const result = await service.getFinalResults('p1');
      expect(result).toEqual([]);
    });
  });

  describe('handlePollAutoClose', () => {
    const pollId = 'poll-123';
    const activeKey = `poll:${pollId}:active`;
    const mockFinalResults = [{ id: 0, count: 2, voters: [{ id: 'u1', name: 'user1' }] }];

    beforeEach(() => {
      jest.spyOn(service, 'closePoll').mockResolvedValue(mockFinalResults as any);
      jest.spyOn(eventEmitter, 'emit');
    });

    it('만료된 키가 active 키 형식이면 closePoll을 호출하고 이벤트를 발행해야 한다', async () => {
      await service.handlePollAutoClose(activeKey);

      expect(service.closePoll).toHaveBeenCalledWith(pollId);

      expect(eventEmitter.emit).toHaveBeenCalledWith('poll.autoClosed', {
        pollId,
        results: mockFinalResults,
      });
    });

    it('만료된 키가 active 형식이 아니면(예: 다른 접두사) 아무 작업도 하지 않아야 한다', async () => {
      const invalidKey = `poll:${pollId}:voters`; // active가 아님

      await service.handlePollAutoClose(invalidKey);

      expect(service.closePoll).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('키 구조가 올바르지 않으면 아무 작업도 하지 않아야 한다', async () => {
      const wrongFormatKey = 'something:broken';

      await service.handlePollAutoClose(wrongFormatKey);

      expect(service.closePoll).not.toHaveBeenCalled();
    });

    it('closePoll 실패 시 에러를 로그로 남겨야 한다 (예외가 밖으로 던져지지 않음)', async () => {
      jest.spyOn(service, 'closePoll').mockRejectedValue(new Error('Close Fail'));
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await service.handlePollAutoClose(activeKey);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[AutoClose Error] ${pollId}`),
      );
    });
  });
});
