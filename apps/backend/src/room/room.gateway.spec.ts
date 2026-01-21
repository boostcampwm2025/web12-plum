import { Test, TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Socket } from 'socket.io';

import { RoomGateway } from './room.gateway.js';
import { RedisService } from '../redis/redis.service.js';
import { MediasoupService } from '../mediasoup/mediasoup.service.js';
import {
  RoomManagerService,
  ParticipantManagerService,
} from '../redis/repository-manager/index.js';
import { SocketMetadataService } from '../common/services/index.js';
import { RoomService } from './room.service.js';
import { PrometheusService } from '../prometheus/prometheus.service.js';

describe('RoomGateway', () => {
  let gateway: RoomGateway;
  let mediasoupService: MediasoupService;
  let participantManager: ParticipantManagerService;
  let socketMetadataService: SocketMetadataService;
  let roomManager: RoomManagerService;

  const createMockSocket = (id: string = 'socket-123') =>
    ({
      id,
      join: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      leave: jest.fn(),
    }) as unknown as Socket;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomGateway,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn(),
            getSubscriber: jest.fn(),
          },
        },
        {
          provide: MediasoupService,
          useValue: {
            createWebRtcTransport: jest.fn().mockResolvedValue({
              id: 'transport-id',
              iceParameters: {},
              iceCandidates: [],
              dtlsParameters: {},
            }),
            connectTransport: jest.fn().mockResolvedValue(undefined),
            closeTransport: jest.fn(),
            closeRouter: jest.fn(),

            // Producer 관련
            createProducer: jest.fn().mockResolvedValue({ id: 'producer-id' }),
            getProducer: jest.fn().mockReturnValue({
              id: 'producer-id',
              appData: { source: 'video' },
            }),
            pauseProducer: jest.fn().mockResolvedValue(undefined),
            resumeProducer: jest.fn().mockResolvedValue(undefined),

            // Consumer 관련
            createConsumer: jest.fn().mockResolvedValue({
              id: 'consumer-id',
              kind: 'video',
              rtpParameters: {},
            }),
            resumeConsumer: jest.fn().mockResolvedValue(undefined),

            // Cleanup 관련
            cleanupParticipantFromMaps: jest.fn(),
          },
        },
        {
          provide: RoomService,
          useValue: {
            getRoomInfo: jest.fn(),
          },
        },
        {
          provide: RoomManagerService,
          useValue: {
            removeParticipant: jest.fn(),
            findOne: jest.fn(),
            updatePartial: jest.fn(),
          },
        },
        {
          provide: ParticipantManagerService,
          useValue: {
            findOne: jest.fn(),
            updatePartial: jest.fn(),
            popReconnectMetadata: jest.fn(),
            setReconnectPending: jest.fn(),
          },
        },
        {
          provide: SocketMetadataService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            has: jest.fn(),
          },
        },
        {
          provide: PrometheusService,
          useValue: {
            incrementSocketIOConnections: jest.fn(),
            decrementSocketIOConnections: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<RoomGateway>(RoomGateway);
    mediasoupService = module.get<MediasoupService>(MediasoupService);
    participantManager = module.get<ParticipantManagerService>(ParticipantManagerService);
    socketMetadataService = module.get<SocketMetadataService>(SocketMetadataService);
    roomManager = module.get<RoomManagerService>(RoomManagerService);

    (gateway as any).server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      in: jest.fn().mockReturnThis(),
      socketsLeave: jest.fn(),
      disconnectSockets: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleJoinRoom', () => {
    it('참가자가 존재하면 방 입장에 성공해야 함', async () => {
      const socket = createMockSocket();
      const data = { roomId: 'room-1', participantId: 'user-1' };
      jest.spyOn(roomManager, 'findOne').mockResolvedValue({
        id: 'room-1',
        status: 'active',
      } as any);
      jest
        .spyOn(participantManager, 'findOne')
        .mockResolvedValue({ id: 'user-1', name: '홍길동', role: 'student' } as any);

      const result = await gateway.handleJoinRoom(socket, data);

      expect(result).toEqual({ success: true });
      expect(socket.join).toHaveBeenCalledWith('room-1');
      expect(socket.to).toHaveBeenCalledWith('room-1');
    });

    it('참가자가 없으면 에러를 반환해야 함', async () => {
      jest.spyOn(participantManager, 'findOne').mockResolvedValue(null);
      const result = await gateway.handleJoinRoom(createMockSocket(), {
        roomId: 'r1',
        participantId: 'u1',
      });
      expect(result.success).toBe(false);
    });
  });

  // 2. Transport 생성 (create_transport)
  describe('handleCreateTransport', () => {
    it('정상적으로 Transport 파라미터를 반환해야 함', async () => {
      const socket = createMockSocket();
      // 먼저 조인된 상태를 메타데이터에 주입
      jest.spyOn(socketMetadataService, 'get').mockReturnValue({
        roomId: 'room-1',
        participantId: 'user-1',
        transportIds: [],
      });

      jest
        .spyOn(mediasoupService, 'createWebRtcTransport')
        .mockResolvedValue({ id: 't-123', iceParameters: {} } as any);
      jest.spyOn(participantManager, 'findOne').mockResolvedValue({ transports: [] } as any);

      const result = await gateway.handleCreateTransport(socket, { direction: 'send' });

      expect(result.success).toBe(true);
      if (!('id' in result)) fail('result must have id when success is true');
      expect(result.id).toBe('t-123');
    });
  });

  // 3. 미디어 송출 (produce)
  describe('handleProduce', () => {
    it('Producer를 생성하고 새 프로듀서 알림을 브로드캐스트해야 함', async () => {
      const socket = createMockSocket();
      jest.spyOn(socketMetadataService, 'get').mockReturnValue({
        roomId: 'room-1',
        participantId: 'user-1',
        transportIds: [],
      });

      jest
        .spyOn(participantManager, 'findOne')
        .mockResolvedValue({ id: 'user-1', producers: {} } as any);
      jest.spyOn(mediasoupService, 'createProducer').mockResolvedValue({ id: 'p-1' } as any);

      const result = await gateway.handleProduce(socket, {
        transportId: 't-1',
        type: 'video',
        rtpParameters: {} as any,
      });

      expect(result.success).toBe(true);
      expect(socket.to).toHaveBeenCalled();
      expect(mediasoupService.createProducer).toHaveBeenCalled();
    });
  });

  // 4. 미디어 수신 (consume)
  describe('handleConsume', () => {
    it('Consumer 생성 시 필요한 RTP 파라미터를 반환해야 함', async () => {
      const socket = createMockSocket();
      jest.spyOn(socketMetadataService, 'get').mockReturnValue({
        roomId: 'room-1',
        participantId: 'user-1',
        transportIds: [],
      });

      jest
        .spyOn(participantManager, 'findOne')
        .mockResolvedValue({ id: 'user-1', consumers: [] } as any);
      jest
        .spyOn(mediasoupService, 'createConsumer')
        .mockResolvedValue({ id: 'c-1', kind: 'video', rtpParameters: {} } as any);
      jest
        .spyOn(mediasoupService, 'getProducer')
        .mockReturnValue({ id: 'p-1', appData: { source: 'video' } } as any);

      const result = await gateway.handleConsume(socket, {
        transportId: 't-1',
        producerId: 'p-1',
        rtpCapabilities: {} as any,
      });

      expect(result.success).toBe(true);
      if (!('consumerId' in result)) fail('consumerId must be in result when gateway success');

      expect(result.consumerId).toBe('c-1');
      expect(result.type).toBe('video');
    });
  });

  // 5. 미디어 상태 제어 (toggle_media)
  describe('handleToggleMedia', () => {
    it('pause 액션 시 producer를 일시정지시켜야 함', async () => {
      const socket = createMockSocket();
      jest.spyOn(socketMetadataService, 'get').mockReturnValue({
        roomId: 'room-1',
        participantId: 'user-1',
        transportIds: [],
      });
      jest
        .spyOn(participantManager, 'findOne')
        .mockResolvedValue({ id: 'user-1', producers: { video: 'p-1' } } as any);

      await gateway.handleToggleMedia(socket, {
        producerId: 'p-1',
        action: 'pause',
        type: 'video',
      });

      expect(mediasoupService.pauseProducer).toHaveBeenCalledWith('p-1');
      expect(socket.to).toHaveBeenCalled();
    });
  });

  // 비정상 퇴장 시 Redis 예약 테스트
  describe('handleDisconnect', () => {
    it('소켓 연결이 끊기면 Redis에 15초 타이머와 메타데이터를 예약해야 함', async () => {
      const socket = createMockSocket();
      const metadata = { roomId: 'room-1', participantId: 'user-1', transportIds: ['t1'] };

      jest.spyOn(socketMetadataService, 'get').mockReturnValue(metadata);
      const setPendingSpy = jest
        .spyOn(participantManager, 'setReconnectPending')
        .mockResolvedValue(undefined);
      const deleteMetaSpy = jest.spyOn(socketMetadataService, 'delete');

      await gateway.handleDisconnect(socket);

      expect(setPendingSpy).toHaveBeenCalledWith('user-1', metadata);
      expect(deleteMetaSpy).toHaveBeenCalledWith(socket.id);
    });
  });

  // Redis 만료 이벤트 발생 시 최종 정리 테스트
  describe('handleReconnectExpired', () => {
    it('Redis TTL 만료 이벤트가 발생하면 cleanup을 수행해야 함', async () => {
      const participantId = 'user-1';
      const redisKey = `reconnect:pending:${participantId}`;
      const metadata = { roomId: 'room-1', participantId: 'user-1', transportIds: ['t1', 't2'] };
      const mockParticipant = {
        id: 'user-1',
        name: '홍길동',
        producers: { v: 'p1' },
        consumers: [],
      };

      jest.spyOn(participantManager, 'popReconnectMetadata').mockResolvedValue(metadata);
      jest.spyOn(participantManager, 'findOne').mockResolvedValue(mockParticipant as any);

      const removeParticipantSpy = jest
        .spyOn(roomManager, 'removeParticipant')
        .mockResolvedValue(undefined);
      const closeTransportSpy = jest.spyOn(mediasoupService, 'closeTransport');

      await gateway.handleReconnectExpired(redisKey);

      expect((gateway as any).server.to).toHaveBeenCalledWith('room-1');
      expect((gateway as any).server.emit).toHaveBeenCalledWith('user_left', expect.any(Object));

      expect(closeTransportSpy).toHaveBeenCalledTimes(2);

      expect(removeParticipantSpy).toHaveBeenCalledWith('room-1', participantId);
    });
  });

  // 재접속(Reconnect) 성공 시나리오 테스트
  describe('handleJoinRoom - Reconnect Scenario', () => {
    it('재접속한 유저인 경우 이전 리소스를 정리하고 이벤트를 브로드캐스트하지 않아야 함', async () => {
      const socket = createMockSocket();
      const data = { roomId: 'room-1', participantId: 'user-1' };
      const pendingMetadata = { ...data, transportIds: ['old-t1'] };
      const mockParticipant = {
        id: 'user-1',
        name: '홍길동',
        role: 'student',
        producers: { video: 'p1', audio: 'a1', screen: '' },
        consumers: ['c1'],
      };

      jest
        .spyOn(roomManager, 'findOne')
        .mockResolvedValue({ id: 'room-1', status: 'active' } as any);
      jest.spyOn(participantManager, 'popReconnectMetadata').mockResolvedValue(pendingMetadata);
      jest.spyOn(participantManager, 'findOne').mockResolvedValue(mockParticipant as any);

      const updateSpy = jest
        .spyOn(participantManager, 'updatePartial')
        .mockResolvedValue(undefined);
      const closeTransportSpy = jest.spyOn(mediasoupService, 'closeTransport');

      await gateway.handleJoinRoom(socket, data);

      expect(updateSpy).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          producers: { video: '', audio: '', screen: '' },
        }),
      );

      expect(closeTransportSpy).toHaveBeenCalledWith('old-t1');

      expect(socket.to).not.toHaveBeenCalled();
    });
  });

  // 정상 퇴장(Leave Room) 테스트
  describe('handleLeaveRoom', () => {
    it('정상 퇴장 시 즉시 cleanup을 수행하고 소켓을 방에서 나가게 해야 함', async () => {
      const socket = createMockSocket();
      const metadata = { roomId: 'room-1', participantId: 'user-1', transportIds: ['t1'] };
      const mockParticipant = {
        id: 'user-1',
        name: '홍길동',
        producers: {},
        consumers: [],
      };

      jest.spyOn(socketMetadataService, 'get').mockReturnValue(metadata);
      jest.spyOn(participantManager, 'findOne').mockResolvedValue(mockParticipant as any);
      jest.spyOn(roomManager, 'removeParticipant').mockResolvedValue(undefined);

      await gateway.handleLeaveRoom(socket);

      expect(socket.leave).toHaveBeenCalledWith('room-1');
      expect(roomManager.removeParticipant).toHaveBeenCalledWith('room-1', 'user-1');
      expect(socketMetadataService.delete).toHaveBeenCalledWith(socket.id);
    });
  });

  describe('handleBreakRoom', () => {
    it('발표자가 요청 시 방을 종료하고 리소스를 정리해야 함', async () => {
      const socket = createMockSocket();
      const roomId = 'room-123';
      const presenterId = 'presenter-456';

      // 1. 메타데이터 설정
      jest.spyOn(socketMetadataService, 'get').mockReturnValue({
        roomId: 'room-1',
        participantId: presenterId,
        transportIds: [],
      });

      // 2. Mock 데이터 설정 (발표자이며 활성화된 방)
      jest.spyOn(participantManager, 'findOne').mockResolvedValue({
        id: presenterId,
        role: 'presenter',
      } as any);
      jest.spyOn(roomManager, 'findOne').mockResolvedValue({
        id: roomId,
        status: 'active',
        presenter: presenterId,
      } as any);

      const updateSpy = jest.spyOn(roomManager, 'updatePartial').mockResolvedValue(undefined);
      const closeRouterSpy = jest
        .spyOn(mediasoupService, 'closeRouter')
        .mockResolvedValue(undefined);

      // 3. 실행
      const result = await gateway.handleBreakRoom(socket);

      // 4. 검증
      expect(result.success).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(roomId, { status: 'ended' });
      expect(closeRouterSpy).toHaveBeenCalledWith(roomId);
      expect((gateway as any).server.to).toHaveBeenCalledWith(roomId);
      expect((gateway as any).server.emit).toHaveBeenCalledWith('room_end');
      expect((gateway as any).server.in).toHaveBeenCalledWith(roomId);
      expect((gateway as any).server.socketsLeave).toHaveBeenCalledWith(roomId);
    });

    it('발표자가 아닌 참가자가 요청할 경우 권한 에러를 반환해야 함', async () => {
      const socket = createMockSocket();
      jest.spyOn(socketMetadataService, 'get').mockReturnValue({
        roomId: 'r1',
        participantId: 'u1',
        transportIds: [],
      });

      // 학생(student)으로 모킹
      jest
        .spyOn(participantManager, 'findOne')
        .mockResolvedValue({ id: 'u1', role: 'student' } as any);
      jest
        .spyOn(roomManager, 'findOne')
        .mockResolvedValue({ id: 'r1', presenter: 'other-user' } as any);

      const result = await gateway.handleBreakRoom(socket);

      expect(result.success).toBe(false);
      expect(result.error).toContain('권한이 없습니다');
    });

    it('이미 종료된 방인 경우 에러를 반환해야 함', async () => {
      const socket = createMockSocket();
      jest.spyOn(socketMetadataService, 'get').mockReturnValue({
        roomId: 'r1',
        participantId: 'u1',
        transportIds: [],
      });

      jest
        .spyOn(participantManager, 'findOne')
        .mockResolvedValue({ id: 'p1', role: 'presenter' } as any);
      jest.spyOn(roomManager, 'findOne').mockResolvedValue({
        id: 'r1',
        status: 'ended', // 이미 종료됨
        presenter: 'p1',
      } as any);

      const result = await gateway.handleBreakRoom(socket);

      expect(result.success).toBe(false);
      expect(result.error).toContain('이미 종료되었거나');
    });

    it('메타데이터가 없는 유효하지 않은 소켓 요청', async () => {
      const socket = createMockSocket('unknown-socket');

      const result = await gateway.handleBreakRoom(socket);

      expect(result.success).toBe(false);
      expect(result.error).toContain('유효하지 않은 접근');
    });
  });
});
