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
import { SocketMetadataService } from '../common/services/socket-metadata.service.js';

describe('RoomGateway', () => {
  let gateway: RoomGateway;
  let mediasoupService: MediasoupService;
  let participantManager: ParticipantManagerService;
  let socketMetadataService: SocketMetadataService;

  const createMockSocket = (id: string = 'socket-123') =>
    ({
      id,
      join: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
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
          provide: RoomManagerService,
          useValue: {
            removeParticipant: jest.fn(),
          },
        },
        {
          provide: ParticipantManagerService,
          useValue: {
            findOne: jest.fn(),
            updatePartial: jest.fn(),
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
      ],
    }).compile();

    gateway = module.get<RoomGateway>(RoomGateway);
    mediasoupService = module.get<MediasoupService>(MediasoupService);
    participantManager = module.get<ParticipantManagerService>(ParticipantManagerService);
    socketMetadataService = module.get<SocketMetadataService>(SocketMetadataService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleJoinRoom', () => {
    it('참가자가 존재하면 방 입장에 성공해야 함', async () => {
      const socket = createMockSocket();
      const data = { roomId: 'room-1', participantId: 'user-1' };
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

  // 6. 연결 해제 및 정리 (cleanup)
  describe('cleanupSocket', () => {
    it('연결 해제 시 모든 미디어 리소스와 Redis 정보를 정리해야 함', async () => {
      const socket = createMockSocket();
      const transportIds = ['t-1', 't-2'];
      jest.spyOn(socketMetadataService, 'get').mockReturnValue({
        roomId: 'room-1',
        participantId: 'user-1',
        transportIds,
      });

      const mockParticipant = { id: 'user-1', producers: { video: 'p-1' }, consumers: ['c-1'] };
      jest.spyOn(participantManager, 'findOne').mockResolvedValue(mockParticipant as any);

      await gateway.handleDisconnect(socket);

      expect(mediasoupService.closeTransport).toHaveBeenCalledTimes(2);
      expect(mediasoupService.cleanupParticipantFromMaps).toHaveBeenCalledWith(['p-1'], ['c-1']);
      expect(socketMetadataService.delete).toHaveBeenCalledWith(socket.id);
    });
  });
});
