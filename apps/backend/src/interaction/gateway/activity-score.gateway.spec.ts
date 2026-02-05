import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { RANK_LIMIT } from '@plum/shared-interfaces';
import {
  ActivityScoreManagerService,
  ParticipantManagerService,
  RoomManagerService,
} from '../../redis/repository-manager/index.js';
import { SocketMetadataService } from '../../common/services/index.js';
import { ActivityScoreGateway } from './activity-score.gateway.js';

describe('ActivityScoreGateway', () => {
  let gateway: ActivityScoreGateway;
  let activityScoreManager: ActivityScoreManagerService;
  let mockServer: Server;
  let mockSocket: Socket;

  const roomId = 'room-123';
  const participantId = 'user-456';

  beforeEach(async () => {
    mockSocket = {
      id: 'socket-id',
      data: {
        room: { id: roomId },
        participant: { id: participantId, role: 'audience' },
      },
    } as unknown as Socket;

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as unknown as Server;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityScoreGateway,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
        },
        {
          provide: SocketMetadataService,
          useValue: { get: jest.fn() },
        },
        {
          provide: ParticipantManagerService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: RoomManagerService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: ActivityScoreManagerService,
          useValue: {
            getTopRankings: jest.fn(),
            getLowest: jest.fn(),
            getParticipantScore: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<ActivityScoreGateway>(ActivityScoreGateway);
    activityScoreManager = module.get<ActivityScoreManagerService>(ActivityScoreManagerService);

    (gateway as any).server = mockServer;
  });

  describe('getCurrentActivityRank', () => {
    const mockTop = [{ participantId: '1', name: 'A', score: 100 }];

    it('청중(Audience)이 요청 시 Top 랭킹과 내 점수를 반환해야 한다', async () => {
      mockSocket.data.participant.role = 'audience';
      jest.spyOn(activityScoreManager, 'getTopRankings').mockResolvedValue(mockTop as any);
      jest.spyOn(activityScoreManager, 'getParticipantScore').mockResolvedValue(50);

      const result = await gateway.getCurrentActivityRank(mockSocket);

      expect(result).toEqual({ success: true, top: mockTop, score: 50 });
      expect(activityScoreManager.getTopRankings).toHaveBeenCalledWith(roomId, RANK_LIMIT);
      expect(activityScoreManager.getParticipantScore).toHaveBeenCalledWith(roomId, participantId);
    });

    it('발표자(Presenter)가 요청 시 Top 랭킹과 최하위 점수를 반환해야 한다', async () => {
      mockSocket.data.participant.role = 'presenter';
      const mockLowest = { participantId: '99', name: 'Low', score: 0 };
      jest.spyOn(activityScoreManager, 'getTopRankings').mockResolvedValue(mockTop as any);
      jest.spyOn(activityScoreManager, 'getLowest').mockResolvedValue(mockLowest as any);

      const result = await gateway.getCurrentActivityRank(mockSocket);

      expect(result).toEqual({ success: true, top: mockTop, lowest: mockLowest });
      expect(activityScoreManager.getLowest).toHaveBeenCalledWith(roomId);
    });

    it('에러 발생 시 success: false를 반환해야 한다', async () => {
      jest
        .spyOn(activityScoreManager, 'getTopRankings')
        .mockRejectedValue(new Error('Redis Error'));

      const result = await gateway.getCurrentActivityRank(mockSocket);

      expect(result.success).toBe(false);
    });
  });

  describe('handleActivityScoreUpdated (OnEvent)', () => {
    it('점수 업데이트 이벤트 수신 시 해당 참가자에게 개인 소켓을 보내야 한다', () => {
      const payload = {
        roomId,
        participantId,
        score: 150,
        penaltyCount: 0,
        reason: 'gesture',
      };

      gateway.handleActivityScoreUpdated(payload);

      expect(mockServer.to).toHaveBeenCalledWith(participantId);
      expect(mockServer.emit).toHaveBeenCalledWith('score_update', {
        score: payload.score,
        penaltyCount: payload.penaltyCount,
        reason: payload.reason,
      });
    });
  });

  describe('handleActivityRankChanged (OnEvent)', () => {
    it('랭킹 변경 시 청중 그룹과 발표자 그룹에 각각 올바른 정보를 브로드캐스트해야 한다', () => {
      const payload = {
        roomId: 'room-123',
        top: [
          { rank: 1, participantId: 'p1', name: 'A', score: 100 },
          { rank: 2, participantId: 'p2', name: 'B', score: 90 },
          { rank: 3, participantId: 'p3', name: 'C', score: 80 },
        ],
        lowest: { rank: 50, participantId: 'p50', name: 'Z', score: 10 },
      };

      gateway.handleActivityRankChanged(payload);

      expect(mockServer.to).toHaveBeenCalledWith(`${roomId}:audience`);
      expect(mockServer.emit).toHaveBeenCalledWith('rank_update', { top: payload.top });

      expect(mockServer.to).toHaveBeenCalledWith(`${roomId}:presenter`);
      expect(mockServer.emit).toHaveBeenCalledWith('presenter_rank_update', {
        top: payload.top,
        lowest: payload.lowest,
      });
    });
  });
});
