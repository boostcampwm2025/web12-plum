import { Test, TestingModule } from '@nestjs/testing';
import { ParticipantManagerService } from './participant-manager.service';
import { RedisService } from '../redis.service';
import { SOCKET_TIMEOUT } from '../../common/constants/socket.constants';

describe('ParticipantManagerService', () => {
  let service: ParticipantManagerService;

  // Redis Client Mocking
  const mockPipeline = {
    set: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  };

  const mockRedisClient = {
    pipeline: jest.fn().mockReturnValue(mockPipeline),
    get: jest.fn(),
    del: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue(mockRedisClient),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParticipantManagerService, { provide: RedisService, useValue: mockRedisService }],
    }).compile();

    service = module.get<ParticipantManagerService>(ParticipantManagerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setReconnectPending', () => {
    it('데이터와 타이머를 pipeline을 통해 저장해야 한다', async () => {
      const participantId = 'user123';
      const metadata = { socketId: 'socket_abc', userId: 'user123' } as any;

      await service.setReconnectPending(participantId, metadata);

      const dataKey = `reconnect:data:${participantId}`;
      const timerKey = `reconnect:pending:${participantId}`;

      // Pipeline 호출 확인
      expect(mockRedisClient.pipeline).toHaveBeenCalled();
      expect(mockPipeline.set).toHaveBeenCalledWith(dataKey, JSON.stringify(metadata));
      expect(mockPipeline.set).toHaveBeenCalledWith(timerKey, '', 'EX', SOCKET_TIMEOUT);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('popReconnectMetadata', () => {
    const participantId = 'user123';
    const dataKey = `reconnect:data:${participantId}`;
    const timerKey = `reconnect:pending:${participantId}`;

    it('데이터가 존재하면 파싱하여 반환하고 Redis에서 삭제해야 한다', async () => {
      const mockMetadata = { socketId: 'socket_abc' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockMetadata));

      const result = await service.popReconnectMetadata(participantId);

      expect(mockRedisClient.get).toHaveBeenCalledWith(dataKey);
      expect(mockRedisClient.del).toHaveBeenCalledWith(dataKey, timerKey);
      expect(result).toEqual(mockMetadata);
    });

    it('데이터가 없으면 null을 반환하고 삭제를 수행하지 않아야 한다', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.popReconnectMetadata(participantId);

      expect(result).toBeNull();
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });
});
