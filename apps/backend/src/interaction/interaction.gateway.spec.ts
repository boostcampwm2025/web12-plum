import { Test, TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InteractionGateway } from './interaction.gateway.js';
import { InteractionService } from './interaction.service.js';
import { SocketMetadataService } from '../common/services/socket-metadata.service.js';
import {
  ParticipantManagerService,
  RoomManagerService,
} from '../redis/repository-manager/index.js';
import { Socket } from 'socket.io';
import { BusinessException } from '../common/types/index.js';

describe('InteractionGateway', () => {
  let gateway: InteractionGateway;
  let socketMetadataService: SocketMetadataService;
  let participantManagerService: ParticipantManagerService;
  let roomManagerService: RoomManagerService;
  let interactionService: InteractionService;

  const mockSocket = {
    id: 'socket-id',
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  } as unknown as Socket;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionGateway,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: { log: jest.fn(), error: jest.fn() },
        },
        {
          provide: SocketMetadataService,
          useValue: { get: jest.fn() },
        },
        {
          provide: ParticipantManagerService,
          useValue: { findOne: jest.fn(), updatePartial: jest.fn() },
        },
        {
          provide: RoomManagerService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: InteractionService,
          useValue: {
            createPoll: jest.fn(),
            getPolls: jest.fn(),
            startPoll: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<InteractionGateway>(InteractionGateway);
    socketMetadataService = module.get(SocketMetadataService);
    participantManagerService = module.get(ParticipantManagerService);
    roomManagerService = module.get(RoomManagerService);
    interactionService = module.get(InteractionService);
  });

  describe('createPoll', () => {
    const createPollDto = {
      title: '오늘 점심 뭐 먹을까요?',
      options: [{ value: '치킨' }, { value: '피자' }],
    };

    it('성공: 발표자가 유효한 방에서 투표를 생성한다', async () => {
      // Given
      const metadata = { participantId: 'p1', roomId: 'r1' };
      const participant = { id: 'p1', role: 'presenter' };
      const room = { id: 'r1', presenter: 'p1', status: 'active' };

      jest.spyOn(socketMetadataService, 'get').mockReturnValue(metadata as any);
      jest.spyOn(participantManagerService, 'findOne').mockResolvedValue(participant as any);
      jest.spyOn(roomManagerService, 'findOne').mockResolvedValue(room as any);
      jest.spyOn(interactionService, 'createPoll').mockResolvedValue({
        id: 'poll-id',
        title: '오늘 점심 뭐 먹을까요?',
        options: [],
      } as any);

      // When
      const result = await gateway.creatPoll(mockSocket, createPollDto as any);

      // Then
      expect(result).toEqual({ success: true });
      expect(interactionService.createPoll).toHaveBeenCalledWith('r1', createPollDto);
    });

    it('세션 정보(metadata)가 없는 경우', async () => {
      jest.spyOn(socketMetadataService, 'get').mockReturnValue(undefined);

      const result = await gateway.creatPoll(mockSocket, createPollDto as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('세션이 만료되었거나 유효하지 않은 접근입니다.');
    });

    it('참가자가 발표자가 아닌 경우 (권한 부족)', async () => {
      const metadata = { participantId: 'p1', roomId: 'r1' };
      const participant = { id: 'p1', role: 'student' }; // 권한 없음
      const room = { id: 'r1', presenter: 'other-p', status: 'active' };

      jest.spyOn(socketMetadataService, 'get').mockReturnValue(metadata as any);
      jest.spyOn(participantManagerService, 'findOne').mockResolvedValue(participant as any);
      jest.spyOn(roomManagerService, 'findOne').mockResolvedValue(room as any);

      const result = await gateway.creatPoll(mockSocket, createPollDto as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('권한이 없습니다');
    });

    it('방이 활성(active) 상태가 아닌 경우', async () => {
      const metadata = { participantId: 'p1', roomId: 'r1' };
      const participant = { id: 'p1', role: 'presenter' };
      const room = { id: 'r1', presenter: 'p1', status: 'closed' }; // 종료된 방

      jest.spyOn(socketMetadataService, 'get').mockReturnValue(metadata as any);
      jest.spyOn(participantManagerService, 'findOne').mockResolvedValue(participant as any);
      jest.spyOn(roomManagerService, 'findOne').mockResolvedValue(room as any);

      const result = await gateway.creatPoll(mockSocket, createPollDto as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('진행 중인 강의가 아닙니다');
    });
  });

  describe('get_poll', () => {
    it('성공: 발표자가 해당 방의 모든 투표 목록을 조회한다', async () => {
      const metadata = { participantId: 'p1', roomId: 'r1' };
      const participant = { id: 'p1', role: 'presenter' };
      const room = { id: 'r1', presenter: 'p1', status: 'active' };
      const mockPolls = [{ id: 'poll-1', title: '투표1' }];

      jest.spyOn(socketMetadataService, 'get').mockReturnValue(metadata as any);
      jest.spyOn(participantManagerService, 'findOne').mockResolvedValue(participant as any);
      jest.spyOn(roomManagerService, 'findOne').mockResolvedValue(room as any);
      jest.spyOn(interactionService, 'getPolls').mockResolvedValue(mockPolls as any);

      const result = await gateway.getPoll(mockSocket);

      expect(result).toEqual({ success: true, polls: mockPolls });
      expect(interactionService.getPolls).toHaveBeenCalledWith('r1');
    });
  });

  describe('emit_poll (startPoll)', () => {
    const emitPollDto = { pollId: 'poll-123' };

    it('성공: 투표를 활성화하고 방 전체에 start_poll 이벤트를 브로드캐스트한다', async () => {
      const metadata = { participantId: 'p1', roomId: 'r1' };
      const participant = { id: 'p1', role: 'presenter' };
      const room = { id: 'r1', presenter: 'p1', status: 'active' };
      const mockPayload = { id: 'poll-123', startedAt: '...', endedAt: '...' };

      jest.spyOn(socketMetadataService, 'get').mockReturnValue(metadata as any);
      jest.spyOn(participantManagerService, 'findOne').mockResolvedValue(participant as any);
      jest.spyOn(roomManagerService, 'findOne').mockResolvedValue(room as any);
      jest.spyOn(interactionService, 'startPoll').mockResolvedValue(mockPayload as any);

      const mockEmit = jest.fn();
      (gateway as any).server = {
        to: jest.fn().mockReturnValue({ emit: mockEmit }),
      };

      const result = await gateway.startPoll(mockSocket, emitPollDto);

      expect(result).toEqual({ success: true });
      expect(interactionService.startPoll).toHaveBeenCalledWith(emitPollDto.pollId);

      expect(mockSocket.to).toHaveBeenCalledWith('r1');
    });

    it('실패: 존재하지 않는 투표이거나 권한이 없을 때 에러 메시지를 반환한다', async () => {
      const metadata = { participantId: 'p1', roomId: 'r1' };
      const participant = { id: 'p1', role: 'presenter' };
      const room = { id: 'r1', presenter: 'p1', status: 'active' };

      jest.spyOn(socketMetadataService, 'get').mockReturnValue(metadata as any);
      jest.spyOn(participantManagerService, 'findOne').mockResolvedValue(participant as any);
      jest.spyOn(roomManagerService, 'findOne').mockResolvedValue(room as any);

      jest
        .spyOn(interactionService, 'startPoll')
        .mockRejectedValue(new BusinessException('이미 시작된 투표입니다.'));

      const result = await gateway.startPoll(mockSocket, emitPollDto);

      expect(result.success).toBe(false);
      expect(result.error).toBe('이미 시작된 투표입니다.');
    });
  });

  describe('handleActionGesture', () => {
    it('성공: 제스처 카운트를 올리고 브로드캐스트한다', async () => {
      const metadata = { participantId: 'p1', roomId: 'r1' };
      const participant = { id: 'p1', name: '홍길동', gestureCount: 5 };
      const gestureData = { gesture: 'THUMBS_UP' };

      jest.spyOn(socketMetadataService, 'get').mockReturnValue(metadata as any);
      jest.spyOn(participantManagerService, 'findOne').mockResolvedValue(participant as any);

      // Gateway 내 server 객체 모킹
      (gateway as any).server = { to: jest.fn().mockReturnThis(), emit: jest.fn() };

      const result = await gateway.handleActionGesture(mockSocket, gestureData as any);

      expect(result).toEqual({ success: true });
      expect(participantManagerService.updatePartial).toHaveBeenCalledWith('p1', {
        gestureCount: 6,
      });
      expect((gateway as any).server.to).toHaveBeenCalledWith('r1');
    });
  });
});
