import { Test, TestingModule } from '@nestjs/testing';
import { PollManagerService } from './poll-manager.service.js';
import { RedisService } from '../redis.service.js';
import { Poll } from '@plum/shared-interfaces';

describe('PollManagerService', () => {
  let service: PollManagerService;
  let redisClient: any;
  let pipeline: any;

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
    const optionId = 1;
    const activeKey = `poll:${pollId}:active`;
    const voterKey = `poll:${pollId}:voters`;
    const countKey = `poll:${pollId}:counts`;

    beforeEach(() => {
      redisClient.exists = jest.fn();
      redisClient.sadd = jest.fn();

      pipeline.hincrby = jest.fn().mockReturnThis();
      pipeline.expire = jest.fn().mockReturnThis();
      pipeline.hgetall = jest.fn().mockReturnThis();
      pipeline.srem = jest.fn().mockReturnThis();

      jest.spyOn(service as any, 'getActiveKey').mockReturnValue(activeKey);
      jest.spyOn(service as any, 'getVoterKey').mockReturnValue(voterKey);
      jest.spyOn(service as any, 'getVoteCountKey').mockReturnValue(countKey);
    });

    it('투표 후 정렬된 옵션 리스트를 반환해야 한다', async () => {
      redisClient.exists.mockResolvedValue(1);
      redisClient.sadd.mockResolvedValue(1);

      const mockHgetallData = { '1': '5', '0': '10' };
      pipeline.exec.mockResolvedValueOnce([
        [null, 6], // hincrby 결과
        [null, 1], // expire 결과
        [null, mockHgetallData], // hgetall 결과
      ]);

      const result = await service.submitVote(pollId, participantId, optionId);

      expect(redisClient.exists).toHaveBeenCalledWith(activeKey);
      expect(redisClient.sadd).toHaveBeenCalledWith(voterKey, participantId);

      expect(pipeline.hincrby).toHaveBeenCalledWith(countKey, optionId.toString(), 1);
      expect(pipeline.hgetall).toHaveBeenCalledWith(countKey);

      expect(result.options).toEqual([
        { id: 0, count: 10 },
        { id: 1, count: 5 },
      ]);
    });

    it('투표가 활성 상태가 아니면 에러를 던져야 한다', async () => {
      redisClient.exists.mockResolvedValue(0);

      await expect(service.submitVote(pollId, participantId, optionId)).rejects.toThrow(
        'Poll is not active',
      );
    });

    it('이미 투표한 유저면 에러를 던져야 한다', async () => {
      redisClient.exists.mockResolvedValue(1);
      redisClient.sadd.mockResolvedValue(0);

      await expect(service.submitVote(pollId, participantId, optionId)).rejects.toThrow(
        'Duplicate vote attempt',
      );
    });

    it('파이프라인 에러 발생 시 srem 및 hincrby -1 롤백을 수행해야 한다', async () => {
      redisClient.exists.mockResolvedValue(1);
      redisClient.sadd.mockResolvedValue(1);
      pipeline.exec
        .mockResolvedValueOnce([[new Error('Redis Pipeline Error'), null]]) // 본 작업 실패
        .mockResolvedValueOnce([
          [null, 1],
          [null, 4],
        ]); // 롤백 파이프라인 성공

      await expect(service.submitVote(pollId, participantId, optionId)).rejects.toThrow(
        'Pipeline failed during voting',
      );

      expect(redisClient.pipeline).toHaveBeenCalledTimes(2);

      expect(pipeline.srem).toHaveBeenCalledWith(voterKey, participantId);
      expect(pipeline.hincrby).toHaveBeenCalledWith(countKey, optionId.toString(), -1);
    });

    it('hgetall 결과가 객체가 아니면 에러를 던져야 한다', async () => {
      redisClient.exists.mockResolvedValue(1);
      redisClient.sadd.mockResolvedValue(1);
      pipeline.exec.mockResolvedValueOnce([
        [null, 1],
        [null, 1],
        [null, null], // hgetall 결과가 null인 경우
      ]);

      await expect(service.submitVote(pollId, participantId, optionId)).rejects.toThrow(
        'Failed to retrieve count data',
      );
    });
  });
});
