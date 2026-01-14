import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { Participant } from '@plum/shared-interfaces';

import { RoomManagerService } from './room-manager.service';
import { RedisService } from '../redis.service';
import { ParticipantManagerService } from './participant-manager.service';

describe('RoomManagerService', () => {
  let service: RoomManagerService;
  let participantManager: ParticipantManagerService;

  const mockPipeline = {
    sadd: jest.fn().mockReturnThis(),
    srem: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([[null, 'OK']]),
  };

  const mockRedisClient = {
    sismember: jest.fn(),
    sadd: jest.fn(),
    smembers: jest.fn(),
    pipeline: jest.fn().mockReturnValue(mockPipeline),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomManagerService,
        {
          provide: RedisService,
          useValue: { getClient: () => mockRedisClient },
        },
        {
          provide: ParticipantManagerService,
          useValue: {
            addSaveToPipeline: jest.fn(),
            addDeleteToPipeline: jest.fn(),
            findOne: jest.fn(),
            findMany: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RoomManagerService>(RoomManagerService);
    participantManager = module.get<ParticipantManagerService>(ParticipantManagerService);
    jest.clearAllMocks();
  });

  describe('addParticipant', () => {
    const mockParticipant: Participant = {
      id: 'user-1',
      name: 'John',
      roomId: 'room-1',
    } as any;

    it('이름이 중복되지 않으면 정상적으로 추가되어야 한다', async () => {
      mockRedisClient.sadd.mockResolvedValue(1);

      await service.addParticipant('room-1', mockParticipant);

      expect(mockRedisClient.sadd).toHaveBeenCalledWith(expect.any(String), 'John');
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('이름이 중복되면 ConflictException을 던져야 한다', async () => {
      mockRedisClient.sadd.mockResolvedValue(0);

      await expect(service.addParticipant('room-1', mockParticipant)).rejects.toThrow(
        ConflictException,
      );
    });

    it('로직 실행 중 에러가 발생하면 롤백(SREM)을 시도해야 한다', async () => {
      mockRedisClient.sadd.mockResolvedValue(1);
      mockPipeline.exec.mockRejectedValueOnce(new Error('Redis Error'));

      await expect(service.addParticipant('room-1', mockParticipant)).rejects.toThrow();

      expect(mockRedisClient.pipeline).toHaveBeenCalledTimes(2); // 본 로직 1번 + 롤백 1번
    });
  });

  describe('getParticipantsInRoom', () => {
    it('방의 모든 참가자 상세 정보를 반환해야 한다', async () => {
      const pIds = ['id1', 'id2'];
      const pDetails = [
        { id: 'id1', name: 'User1' },
        { id: 'id2', name: 'User2' },
      ];

      mockRedisClient.smembers.mockResolvedValue(pIds);
      (participantManager.findMany as jest.Mock).mockResolvedValue(pDetails);

      const result = await service.getParticipantsInRoom('room-1');

      expect(result).toHaveLength(2);
      expect(participantManager.findMany).toHaveBeenCalledWith(pIds);
    });
  });
});
