import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GestureType } from '@plum/shared-interfaces';
import {
  ActivityScoreManagerService,
  ParticipantManagerService,
  RoomManagerService,
} from '../../redis/repository-manager/index.js';
import { PrometheusService } from '../../prometheus/index.js';
import { SocketMetadataService } from '../../common/services/index.js';
import { GestureGateway } from './gesture.gateway.js';

describe('GestureGateway', () => {
  let gateway: GestureGateway;
  let activityScoreManager: ActivityScoreManagerService;
  let prometheusService: PrometheusService;
  let mockServer: Server;
  let mockSocket: Socket;

  const roomId = 'room-123';
  const participantId = 'user-456';
  const participantName = '테스터';

  beforeEach(async () => {
    // 소켓 모킹 (WsAuthGuard 통과 후의 socket.data 상태)
    mockSocket = {
      id: 'socket-id',
      data: {
        room: { id: roomId },
        participant: { id: participantId, name: participantName, role: 'audience' },
      },
    } as unknown as Socket;

    // 서버 모킹
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as unknown as Server;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GestureGateway,
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
          useValue: { updateScore: jest.fn() },
        },
        {
          provide: PrometheusService,
          useValue: { recordGestureEvent: jest.fn() },
        },
      ],
    }).compile();

    gateway = module.get<GestureGateway>(GestureGateway);
    activityScoreManager = module.get<ActivityScoreManagerService>(ActivityScoreManagerService);
    prometheusService = module.get<PrometheusService>(PrometheusService);

    (gateway as any).server = mockServer;
  });

  describe('handleActionGesture', () => {
    const gestureData = { gesture: 'thumbs_up' as GestureType };

    it('청중이 제스처를 수행하면 점수를 업데이트하고 이벤트를 브로드캐스트해야 한다', async () => {
      await gateway.handleActionGesture(mockSocket, gestureData);

      expect(activityScoreManager.updateScore).toHaveBeenCalledWith(
        roomId,
        participantId,
        'gesture',
      );
      expect(mockServer.to).toHaveBeenCalledWith(roomId);
      expect(mockServer.emit).toHaveBeenCalledWith('update_gesture_status', {
        participantId,
        participantName,
        gesture: gestureData.gesture,
      });
      expect(prometheusService.recordGestureEvent).toHaveBeenCalled();
    });

    it('발표자가 제스처를 수행하면 점수 업데이트 없이 브로드캐스트만 해야 한다', async () => {
      mockSocket.data.participant.role = 'presenter';

      const result = await gateway.handleActionGesture(mockSocket, gestureData);

      expect(result).toEqual({ success: true });
      expect(activityScoreManager.updateScore).not.toHaveBeenCalled(); // 점수 업데이트 안함
      expect(mockServer.emit).toHaveBeenCalled(); // 이벤트는 전송됨
    });

    it('예외 발생 시에도 Prometheus 메트릭을 기록하고 success: false를 반환해야 한다', async () => {
      jest.spyOn(mockServer, 'to').mockImplementation(() => {
        throw new Error('Broadcast failed');
      });

      const result = await gateway.handleActionGesture(mockSocket, gestureData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('제스처 처리에 실패했습니다.');
      expect(prometheusService.recordGestureEvent).toHaveBeenCalledWith(
        gestureData.gesture,
        expect.any(Number),
      );
    });

    it('데이터에 제스처 정보가 없을 경우 Prometheus에 unknown으로 기록해야 한다', async () => {
      const emptyData = {} as any;
      jest.spyOn(mockServer, 'to').mockImplementation(() => {
        throw new Error('Error');
      });

      await gateway.handleActionGesture(mockSocket, emptyData);

      expect(prometheusService.recordGestureEvent).toHaveBeenCalledWith(
        'unknown',
        expect.any(Number),
      );
    });
  });
});
