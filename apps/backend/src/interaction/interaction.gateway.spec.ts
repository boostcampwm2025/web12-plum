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
            getPoll: jest.fn(),
            getPolls: jest.fn(),
            startPoll: jest.fn(),
            vote: jest.fn(),
            stopPoll: jest.fn(),
            createQna: jest.fn(),
            getQna: jest.fn(),
            getQnas: jest.fn(),
            startQna: jest.fn(),
            answer: jest.fn(),
            stopQna: jest.fn(),
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

  describe('handleActionGesture', () => {
    it('제스처 카운트를 올리고 브로드캐스트한다', async () => {
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

  describe('create_poll', () => {
    const createPollDto = {
      title: '오늘 점심 뭐 먹을까요?',
      options: [{ value: '치킨' }, { value: '피자' }],
    };

    it('발표자가 유효한 방에서 투표를 생성한다', async () => {
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

      const result = await gateway.creatPoll(mockSocket, createPollDto as any);

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
    it('발표자가 해당 방의 모든 투표 목록을 조회한다', async () => {
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

    it('투표를 활성화하고 방 전체에 start_poll 이벤트를 브로드캐스트한다', async () => {
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

      expect(result).toEqual({
        success: true,
        startedAt: expect.any(String),
        endedAt: expect.any(String),
      });
      expect(interactionService.startPoll).toHaveBeenCalledWith(emitPollDto.pollId);

      expect(mockSocket.to).toHaveBeenCalledWith('r1');
    });

    it('존재하지 않는 투표이거나 권한이 없을 때 에러 메시지를 반환한다', async () => {
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

      if (result.success === false) {
        expect(result.error).toBe('이미 시작된 투표입니다.');
      } else {
        fail('성공하면 안 되는 테스트 케이스입니다.');
      }
    });
  });

  describe('vote', () => {
    const voteDto = { pollId: 'poll-123', optionId: 1 };

    it('청중이 투표에 참여하면 결과를 브로드캐스트하고 성공을 반환한다', async () => {
      const metadata = { participantId: 'p-student', roomId: 'r1' };
      const participant = { id: 'p-student', name: 'p-1', role: 'audience' };
      const room = { id: 'r1', status: 'active' };
      const mockUpdatePayload = {
        pollId: 'poll-123',
        options: [{ id: 1, count: 5 }],
      };

      jest.spyOn(socketMetadataService, 'get').mockReturnValue(metadata as any);
      jest.spyOn(participantManagerService, 'findOne').mockResolvedValue(participant as any);
      jest.spyOn(roomManagerService, 'findOne').mockResolvedValue(room as any);
      jest.spyOn(interactionService, 'vote').mockResolvedValue(mockUpdatePayload as any);

      const mockEmit = jest.fn();
      (gateway as any).server = {
        to: jest.fn().mockReturnValue({ emit: mockEmit }),
      };

      const result = await gateway.vote(mockSocket, voteDto);

      expect(result).toEqual({ success: true });
      expect(interactionService.vote).toHaveBeenCalledWith(
        voteDto.pollId,
        participant.id,
        participant.name,
        voteDto.optionId,
      );

      expect((gateway as any).server.to).toHaveBeenCalledWith('r1:audience');
      expect((gateway as any).server.to).toHaveBeenCalledWith('r1:presenter');
      expect(mockEmit).toHaveBeenCalledWith('update_poll', mockUpdatePayload);
    });

    it('발표자(presenter)가 투표를 시도할 경우 권한 에러를 반환해야 한다', async () => {
      const metadata = { participantId: 'p-presenter', roomId: 'r1' };
      const participant = { id: 'p-presenter', role: 'presenter' }; // audience가 아님
      const room = { id: 'r1', status: 'active' };

      jest.spyOn(socketMetadataService, 'get').mockReturnValue(metadata as any);
      jest.spyOn(participantManagerService, 'findOne').mockResolvedValue(participant as any);
      jest.spyOn(roomManagerService, 'findOne').mockResolvedValue(room as any);

      const result = await gateway.vote(mockSocket, voteDto);

      expect(result.success).toBe(false);
      expect(result.error).toContain('권한이 없습니다');
      expect(interactionService.vote).not.toHaveBeenCalled();
    });

    it('서비스 로직에서 BusinessException 발생 시 해당 메시지를 반환한다', async () => {
      const metadata = { participantId: 'p-student', roomId: 'r1' };
      const participant = { id: 'p-student', role: 'audience' };
      const room = { id: 'r1', status: 'active' };

      jest.spyOn(socketMetadataService, 'get').mockReturnValue(metadata as any);
      jest.spyOn(participantManagerService, 'findOne').mockResolvedValue(participant as any);
      jest.spyOn(roomManagerService, 'findOne').mockResolvedValue(room as any);

      jest
        .spyOn(interactionService, 'vote')
        .mockRejectedValue(new BusinessException('이미 참여한 투표입니다.'));

      const result = await gateway.vote(mockSocket, voteDto);

      expect(result.success).toBe(false);
      expect(result.error).toBe('이미 참여한 투표입니다.');
    });

    it('예기치 못한 에러 발생 시 기본 에러 메시지를 반환한다', async () => {
      const metadata = { participantId: 'p-student', roomId: 'r1' };
      jest.spyOn(socketMetadataService, 'get').mockReturnValue(metadata as any);
      jest.spyOn(participantManagerService, 'findOne').mockRejectedValue(new Error('DB Crash'));

      const result = await gateway.vote(mockSocket, voteDto);

      expect(result.success).toBe(false);
      expect(result.error).toBe('투표에 실패했습니다.');
    });
  });

  describe('break_poll (투표 종료)', () => {
    const breakPollDto = { pollId: 'poll-123' };

    it('발표자가 투표를 종료하면 결과를 브로드캐스트하고 성공 응답을 반환한다', async () => {
      const metadata = { participantId: 'p1', roomId: 'r1' };
      const participant = { id: 'p1', role: 'presenter' };
      const room = { id: 'r1', presenter: 'p1', status: 'active' };
      const mockOptions = [
        { id: 0, value: '옵션1', count: 10, voters: ['u1', 'u2'] },
        { id: 1, value: '옵션2', count: 5, voters: ['u3'] },
      ];

      jest.spyOn(socketMetadataService, 'get').mockReturnValue(metadata as any);
      jest.spyOn(participantManagerService, 'findOne').mockResolvedValue(participant as any);
      jest.spyOn(roomManagerService, 'findOne').mockResolvedValue(room as any);
      jest.spyOn(interactionService, 'stopPoll').mockResolvedValue(mockOptions as any);

      const mockEmit = jest.fn();
      mockSocket.to = jest.fn().mockReturnValue({ emit: mockEmit });

      const result = await gateway.breakPoll(mockSocket, breakPollDto);

      expect(result).toEqual({ success: true, options: mockOptions });
      expect(interactionService.stopPoll).toHaveBeenCalledWith(breakPollDto.pollId);

      expect(mockSocket.to).toHaveBeenCalledWith('r1');
      expect(mockEmit).toHaveBeenCalledWith('poll_end', {
        pollId: breakPollDto.pollId,
        options: [
          { id: 0, count: 10 },
          { id: 1, count: 5 },
        ],
      });
    });

    it('발표자가 아닌 사용자가 종료를 시도하면 에러를 반환한다', async () => {
      const metadata = { participantId: 'p-student', roomId: 'r1' };
      const participant = { id: 'p-student', role: 'audience' }; // 권한 없음
      const room = { id: 'r1', status: 'active' };

      jest.spyOn(socketMetadataService, 'get').mockReturnValue(metadata as any);
      jest.spyOn(participantManagerService, 'findOne').mockResolvedValue(participant as any);
      jest.spyOn(roomManagerService, 'findOne').mockResolvedValue(room as any);

      const result = await gateway.breakPoll(mockSocket, breakPollDto);

      if (result.success === false) {
        expect(result.error).toContain('권한이 없습니다');
        expect(interactionService.stopPoll).not.toHaveBeenCalled();
      } else {
        fail('성공하면 안 되는 테스트 케이스입니다.');
      }
    });

    it('BusinessException 발생 시 예외 메시지를 반환한다', async () => {
      // 발표자 인증은 통과되었다고 가정
      jest.spyOn(socketMetadataService, 'get').mockReturnValue({ roomId: 'r1' } as any);
      jest
        .spyOn(participantManagerService, 'findOne')
        .mockResolvedValue({ role: 'presenter' } as any);
      jest.spyOn(roomManagerService, 'findOne').mockResolvedValue({ status: 'active' } as any);

      jest
        .spyOn(interactionService, 'stopPoll')
        .mockRejectedValue(new BusinessException('이미 종료된 투표입니다.'));

      const result = await gateway.breakPoll(mockSocket, breakPollDto);

      if (result.success === false) {
        expect(result.error).toBe('이미 종료된 투표입니다.');
      } else {
        fail('성공하면 안 되는 테스트 케이스입니다.');
      }
    });

    it('알 수 없는 에러 발생 시 기본 에러 메시지를 반환한다', async () => {
      jest.spyOn(socketMetadataService, 'get').mockReturnValue({ roomId: 'r1' } as any);
      jest.spyOn(interactionService, 'stopPoll').mockRejectedValue(new Error('Redis Error'));

      const result = await gateway.breakPoll(mockSocket, breakPollDto);

      if (result.success === false) {
        expect(result.error).toBe('방 정보를 찾을 수 없습니다.');
      } else {
        fail('성공하면 안 되는 테스트 케이스입니다.');
      }
    });
  });

  describe('handleAutoClosedEvent (자동 종료 이벤트 수신)', () => {
    const mockPayload = {
      pollId: 'poll-123',
      results: [
        { id: 0, value: '옵션1', count: 10, voters: [{ id: 'u1', name: 'user1' }] },
        { id: 1, value: '옵션2', count: 5, voters: [] },
      ],
    };

    const mockPollData = {
      id: 'poll-123',
      roomId: 'room-1',
      title: '자동 종료 테스트',
    };

    beforeEach(() => {
      jest.spyOn(interactionService, 'getPoll').mockResolvedValue(mockPollData as any);

      (gateway as any).server = {
        to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      };
    });

    it('이벤트를 받으면 해당 방의 발표자와 청중에게 알맞은 데이터를 브로드캐스트해야 한다', async () => {
      await gateway.handleAutoClosedPollEvent(mockPayload);

      expect(interactionService.getPoll).toHaveBeenCalledWith(mockPayload.pollId);

      expect((gateway as any).server.to).toHaveBeenCalledWith('room-1:presenter');
      const presenterEmit = (gateway as any).server.to('room-1:presenter').emit;
      expect(presenterEmit).toHaveBeenCalledWith('poll_end_detail', {
        pollId: mockPollData.id,
        options: mockPayload.results,
      });

      expect((gateway as any).server.to).toHaveBeenCalledWith('room-1:audience');
      const audienceEmit = (gateway as any).server.to('room-1:audience').emit;
      expect(audienceEmit).toHaveBeenCalledWith('poll_end', {
        pollId: mockPollData.id,
        options: [
          { id: 0, count: 10 },
          { id: 1, count: 5 },
        ],
      });
    });

    it('getPoll 실패 시 에러 로그를 남기고 중단되어야 한다', async () => {
      const loggerSpy = jest.spyOn((gateway as any).logger, 'error');
      jest.spyOn(interactionService, 'getPoll').mockRejectedValue(new Error('Poll Missing'));

      await gateway.handleAutoClosedPollEvent(mockPayload);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('[auto_close_poll] 전달 실패:'),
        expect.any(Error),
      );

      expect((gateway as any).server.to).not.toHaveBeenCalled();
    });
  });

  describe('create_qna', () => {
    const createQnaDto = {
      title: '오늘 점심 뭐 먹을까요?',
      isPublic: false,
    };

    it('발표자가 유효한 방에서 질문을 생성한다', async () => {
      const metadata = { participantId: 'p1', roomId: 'r1' };
      const participant = { id: 'p1', role: 'presenter' };
      const room = { id: 'r1', presenter: 'p1', status: 'active' };

      jest.spyOn(socketMetadataService, 'get').mockReturnValue(metadata as any);
      jest.spyOn(participantManagerService, 'findOne').mockResolvedValue(participant as any);
      jest.spyOn(roomManagerService, 'findOne').mockResolvedValue(room as any);
      jest.spyOn(interactionService, 'createQna').mockResolvedValue({
        id: 'poll-id',
        title: '오늘 점심 뭐 먹을까요?',
        options: [],
      } as any);

      const result = await gateway.createQna(mockSocket, createQnaDto as any);

      expect(result).toEqual({ success: true });
      expect(interactionService.createQna).toHaveBeenCalledWith('r1', createQnaDto);
    });
  });

  describe('get_qna', () => {
    it('발표자가 해당 방의 모든 질문 목록을 조회한다', async () => {
      const metadata = { participantId: 'p1', roomId: 'r1' };
      const participant = { id: 'p1', role: 'presenter' };
      const room = { id: 'r1', presenter: 'p1', status: 'active' };
      const mockQnas = [{ id: 'qna-1', title: '질문1' }];

      jest.spyOn(socketMetadataService, 'get').mockReturnValue(metadata as any);
      jest.spyOn(participantManagerService, 'findOne').mockResolvedValue(participant as any);
      jest.spyOn(roomManagerService, 'findOne').mockResolvedValue(room as any);
      jest.spyOn(interactionService, 'getQnas').mockResolvedValue(mockQnas as any);

      const result = await gateway.getQna(mockSocket);

      expect(result).toEqual({ success: true, qnas: mockQnas });
      expect(interactionService.getQnas).toHaveBeenCalledWith('r1');
    });
  });

  describe('emit_qna (startQna)', () => {
    const emitQnaDto = { qnaId: 'qna-123' };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('발표자 권한이 확인되면 질문을 활성화하고 방 전체에 start_qna 이벤트를 브로드캐스트한다', async () => {
      const mockRoom = { id: 'room-123' };
      const mockPayload = {
        id: 'qna-123',
        title: '질문 제목',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
      };

      jest.spyOn(gateway as any, 'validatePresenterAction').mockResolvedValue({ room: mockRoom });
      jest.spyOn(interactionService, 'startQna').mockResolvedValue(mockPayload as any);

      const mockEmit = jest.fn();
      mockSocket.to = jest.fn().mockReturnValue({ emit: mockEmit });

      const result = await gateway.startQna(mockSocket, emitQnaDto);

      expect(gateway['validatePresenterAction']).toHaveBeenCalledWith(mockSocket.id);
      expect(interactionService.startQna).toHaveBeenCalledWith(emitQnaDto.qnaId);

      expect(mockSocket.to).toHaveBeenCalledWith(mockRoom.id);
      expect(mockEmit).toHaveBeenCalledWith('start_qna', mockPayload);

      expect(result).toEqual({
        success: true,
        startedAt: mockPayload.startedAt,
        endedAt: mockPayload.endedAt,
      });
    });

    it('비즈니스 로직 에러(BusinessException) 발생 시 해당 에러 메시지를 반환해야 한다', async () => {
      jest
        .spyOn(gateway as any, 'validatePresenterAction')
        .mockResolvedValue({ room: { id: 'r1' } });
      jest
        .spyOn(interactionService, 'startQna')
        .mockRejectedValue(new BusinessException('이미 시작되거나 종료된 질문입니다.'));

      const result = await gateway.startQna(mockSocket, emitQnaDto);

      expect(result).toEqual({
        success: false,
        error: '이미 시작되거나 종료된 질문입니다.',
      });
    });

    it('발표자 권한이 없거나 예상치 못한 에러 발생 시 기본 에러 메시지를 반환해야 한다', async () => {
      jest
        .spyOn(gateway as any, 'validatePresenterAction')
        .mockRejectedValue(new Error('Unauthorized'));

      const result = await gateway.startQna(mockSocket, emitQnaDto);

      expect(result).toEqual({
        success: false,
        error: '질문 시작에 실패했습니다.',
      });
    });
  });

  describe('answer', () => {
    const answerDto = { qnaId: 'qna-123', text: '이것은 답변입니다.' };

    beforeEach(() => {
      (gateway as any).server = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };
      jest.clearAllMocks();
    });

    it('청중이 답변을 제출하면 성공 응답을 반환하고 각 채널에 알맞은 페이로드를 브로드캐스트한다', async () => {
      const mockRoom = { id: 'r1' };
      const mockParticipant = { id: 'p-1', name: '홍길동' };
      const mockResult = {
        audience: { qnaId: 'qna-123', count: 5 },
        presenter: {
          qnaId: 'qna-123',
          participantId: 'p-1',
          participantName: '홍길동',
          text: '이것은 답변입니다.',
          count: 5,
        },
      };

      jest.spyOn(gateway as any, 'validateAudienceAction').mockResolvedValue({
        room: mockRoom,
        participant: mockParticipant,
      });
      jest.spyOn(interactionService, 'answer').mockResolvedValue(mockResult as any);

      const result = await gateway.answer(mockSocket, answerDto);

      expect(gateway['validateAudienceAction']).toHaveBeenCalledWith(mockSocket.id);
      expect(interactionService.answer).toHaveBeenCalledWith(
        answerDto.qnaId,
        mockParticipant.id,
        mockParticipant.name,
        answerDto.text,
      );

      expect((gateway as any).server.to).toHaveBeenCalledWith('r1:audience');
      expect((gateway as any).server.to('r1:audience').emit).toHaveBeenCalledWith(
        'update_qna',
        mockResult.audience,
      );

      expect((gateway as any).server.to).toHaveBeenCalledWith('r1:presenter');
      expect((gateway as any).server.to('r1:presenter').emit).toHaveBeenCalledWith(
        'update_qna_detail',
        mockResult.presenter,
      );

      expect(result).toEqual({ success: true });
    });

    it('BusinessException 발생 시 에러 메시지를 반환한다', async () => {
      jest.spyOn(gateway as any, 'validateAudienceAction').mockResolvedValue({
        room: { id: 'r1' },
        participant: { id: 'p1', name: 'user' },
      });
      jest
        .spyOn(interactionService, 'answer')
        .mockRejectedValue(new BusinessException('이미 답변한 질문입니다.'));

      const result = await gateway.answer(mockSocket, answerDto);

      expect(result).toEqual({
        success: false,
        error: '이미 답변한 질문입니다.',
      });
      expect((gateway as any).server.to).not.toHaveBeenCalled();
    });

    it('예기치 못한 일반 에러 발생 시 기본 실패 메시지를 반환한다', async () => {
      jest
        .spyOn(gateway as any, 'validateAudienceAction')
        .mockRejectedValue(new Error('Unknown Error'));

      const result = await gateway.answer(mockSocket, answerDto);

      expect(result).toEqual({
        success: false,
        error: '투표에 실패했습니다.',
      });
    });
  });

  describe('break_qna (질문 종료)', () => {
    const breakQnaDto = { qnaId: 'qna-123' };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('성공: 질문을 종료하고 청중에게 알림을 보낸 뒤 발표자에게 상세 답변 리스트를 반환해야 한다', async () => {
      const mockRoom = { id: 'room-1' };
      const mockPayload = {
        audience: { qnaId: 'qna-123', count: 2, answers: [{ text: '답변' }] }, // 공개 질문 가정
        presenter: { qnaId: 'qna-123', count: 2, answers: [{ text: '답변' }] },
      };

      jest.spyOn(gateway as any, 'validatePresenterAction').mockResolvedValue({ room: mockRoom });
      jest.spyOn(interactionService, 'stopQna').mockResolvedValue(mockPayload as any);

      const mockEmit = jest.fn();
      mockSocket.to = jest.fn().mockReturnValue({ emit: mockEmit });

      const result = await gateway.breakQna(mockSocket, breakQnaDto);

      expect(interactionService.stopQna).toHaveBeenCalledWith(breakQnaDto.qnaId);
      expect(mockSocket.to).toHaveBeenCalledWith(mockRoom.id);
      expect(mockEmit).toHaveBeenCalledWith('qna_end', mockPayload.audience);

      expect(result).toEqual({
        success: true,
        answers: mockPayload.presenter.answers,
        count: mockPayload.presenter.count,
      });
    });

    it('실패: BusinessException 발생 시 해당 에러 메시지를 반환해야 한다', async () => {
      jest
        .spyOn(gateway as any, 'validatePresenterAction')
        .mockResolvedValue({ room: { id: 'r1' } });
      jest
        .spyOn(interactionService, 'stopQna')
        .mockRejectedValue(new BusinessException('종료할 수 없는 질문입니다.'));

      const result = await gateway.breakQna(mockSocket, breakQnaDto);

      expect(result).toEqual({
        success: false,
        error: '종료할 수 없는 질문입니다.',
      });
    });
  });

  describe('handleAutoClosedQnaEvent (질문 자동 종료 이벤트)', () => {
    const mockEventPayload = {
      qnaId: 'qna-123',
      answers: [{ participantId: 'u1', participantName: 'u1', text: '답변 내용' }],
    };

    beforeEach(() => {
      (gateway as any).server = {
        to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      };
      jest.clearAllMocks();
    });

    it('성공(공개 질문): isPublic이 true면 청중에게 answers를 포함하여 브로드캐스트해야 한다', async () => {
      const mockQna = { id: 'qna-123', roomId: 'r1', isPublic: true };
      jest.spyOn(interactionService, 'getQna').mockResolvedValue(mockQna as any);

      await gateway.handleAutoClosedQnaEvent(mockEventPayload);

      expect((gateway as any).server.to).toHaveBeenCalledWith('r1:presenter');
      expect((gateway as any).server.to('r1:presenter').emit).toHaveBeenCalledWith(
        'qna_end_detail',
        expect.objectContaining({ answers: mockEventPayload.answers }),
      );

      expect((gateway as any).server.to).toHaveBeenCalledWith('r1:audience');
      expect((gateway as any).server.to('r1:audience').emit).toHaveBeenCalledWith(
        'qna_end',
        expect.objectContaining({ text: mockEventPayload.answers.map((a) => a.text) }),
      );
    });

    it('성공(비공개 질문): isPublic이 false면 청중 페이로드에 answers가 없어야 한다', async () => {
      const mockQna = { id: 'qna-123', roomId: 'r1', isPublic: false };
      jest.spyOn(interactionService, 'getQna').mockResolvedValue(mockQna as any);

      await gateway.handleAutoClosedQnaEvent(mockEventPayload);

      expect((gateway as any).server.to).toHaveBeenCalledWith('r1:presenter');
      expect((gateway as any).server.to('r1:presenter').emit).toHaveBeenCalledWith(
        'qna_end_detail',
        expect.objectContaining({ answers: mockEventPayload.answers }),
      );

      expect((gateway as any).server.to).toHaveBeenCalledWith('r1:audience');
      expect((gateway as any).server.to('r1:audience').emit).toHaveBeenCalledWith(
        'qna_end',
        expect.not.objectContaining({ answers: expect.anything() }), // answers 필드가 없어야 함
      );
    });

    it('실패: 데이터 조회 실패 시 에러 로그를 남겨야 한다', async () => {
      const loggerSpy = jest.spyOn((gateway as any).logger, 'error');
      jest.spyOn(interactionService, 'getQna').mockRejectedValue(new Error('Fetch Fail'));

      await gateway.handleAutoClosedQnaEvent(mockEventPayload);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('[auto_close_poll] 전달 실패:'),
        expect.any(Error),
      );
    });
  });
});
