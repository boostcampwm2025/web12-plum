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
    it('성공: 투표를 저장하고 리스트에 ID를 추가해야 한다', async () => {
      await service.addPollToRoom('room-1', mockPolls);

      expect(redisClient.pipeline).toHaveBeenCalled();
      expect(pipeline.rpush).toHaveBeenCalledTimes(mockPolls.length);
      expect(pipeline.exec).toHaveBeenCalled();
    });

    it('실패: Pipeline 실행 중 에러 발생 시 롤백을 수행해야 한다', async () => {
      pipeline.exec.mockResolvedValueOnce([[new Error('Redis Error'), null]]);

      await expect(service.addPollToRoom('room-1', mockPolls)).rejects.toThrow();

      expect(redisClient.pipeline).toHaveBeenCalledTimes(2);
      expect(pipeline.lrem).toHaveBeenCalledTimes(mockPolls.length);
    });
  });

  describe('getPollsInRoom', () => {
    it('성공: lrange로 ID를 조회한 후 상세 데이터를 반환해야 한다', async () => {
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
});
