import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { QnaService } from '../service/index.js';
import {
  ActivityScoreManagerService,
  ParticipantManagerService,
  RoomManagerService,
} from '../../redis/repository-manager/index.js';
import { BusinessException } from '../../common/types/index.js';
import { SocketMetadataService } from '../../common/services/index.js';
import { QnaGateway } from './qna.gateway.js';

describe('QnaGateway', () => {
  let gateway: QnaGateway;
  let qnaService: QnaService;
  let activityScoreManager: ActivityScoreManagerService;
  let mockServer: Server;
  let mockSocket: Socket;

  const roomId = 'room-123';
  const participantId = 'user-456';

  beforeEach(async () => {
    // 소켓 모킹 (가드에서 주입하는 socket.data 포함)
    mockSocket = {
      id: 'socket-id',
      data: {
        room: { id: roomId },
        participant: { id: participantId, name: '테스터' },
      },
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as unknown as Socket;

    // 서버 모킹
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as unknown as Server;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QnaGateway,
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
          provide: QnaService,
          useValue: {
            createQna: jest.fn(),
            getQnas: jest.fn(),
            getActiveQna: jest.fn(),
            startQna: jest.fn(),
            answer: jest.fn(),
            stopQna: jest.fn(),
            getQna: jest.fn(),
          },
        },
        {
          provide: ActivityScoreManagerService,
          useValue: { updateScore: jest.fn() },
        },
      ],
    }).compile();

    gateway = module.get<QnaGateway>(QnaGateway);
    qnaService = module.get<QnaService>(QnaService);
    activityScoreManager = module.get<ActivityScoreManagerService>(ActivityScoreManagerService);

    (gateway as any).server = mockServer;
  });

  describe('createQna', () => {
    const createData = { title: '새 질문', isPublic: true };

    it('성공 시 success: true를 반환해야 한다', async () => {
      jest.spyOn(qnaService, 'createQna').mockResolvedValue({ id: 'qna-1' } as any);
      const result = await gateway.createQna(mockSocket, createData as any);
      expect(result).toEqual({ success: true });
    });

    it('BusinessException 발생 시 해당 메시지를 반환해야 한다', async () => {
      jest.spyOn(qnaService, 'createQna').mockRejectedValue(new BusinessException('중복된 제목'));
      const result = await gateway.createQna(mockSocket, createData as any);
      expect(result).toEqual({ success: false, error: '중복된 제목' });
    });
  });

  describe('getQna', () => {
    it('질문 목록을 성공적으로 반환해야 한다', async () => {
      const mockQnas = [{ id: '1', title: 'Q1' }];
      jest.spyOn(qnaService, 'getQnas').mockResolvedValue(mockQnas as any);
      const result = await gateway.getQna(mockSocket);
      expect(result).toEqual({ success: true, qnas: mockQnas });
    });
  });

  describe('getActiveQna', () => {
    it('진행 중인 질문이 없을 경우 에러 메시지를 반환해야 한다', async () => {
      jest.spyOn(qnaService, 'getActiveQna').mockResolvedValue({ qna: null, answered: false });
      const result = await gateway.getActiveQna(mockSocket);
      expect(result).toEqual({ success: false, error: '현재 진행중인 질문이 없습니다' });
    });

    it('진행 중인 질문이 있을 경우 정보를 반환해야 한다', async () => {
      const mockActive = { qna: { id: 'q1' }, answered: true };
      jest.spyOn(qnaService, 'getActiveQna').mockResolvedValue(mockActive as any);
      const result = await gateway.getActiveQna(mockSocket);
      expect(result).toEqual({ success: true, ...mockActive });
    });
  });

  describe('startQna', () => {
    it('질문 시작 시 룸에 start_qna 이벤트를 브로드캐스트해야 한다', async () => {
      const payload = { startedAt: new Date(), endedAt: new Date(), qnaId: 'q1' };
      jest.spyOn(qnaService, 'startQna').mockResolvedValue(payload as any);

      await gateway.startQna(mockSocket, { qnaId: 'q1' });

      expect(mockSocket.to).toHaveBeenCalledWith(roomId);
      expect(mockSocket.emit).toHaveBeenCalledWith('start_qna', payload);
    });
  });

  describe('answer', () => {
    it('답변 시 점수를 업데이트하고 타겟 그룹별로 다른 이벤트를 전송해야 한다', async () => {
      const resultPayload = {
        audience: { qnaId: 'q1', count: 5 },
        presenter: { qnaId: 'q1', answers: [] },
      };
      jest.spyOn(qnaService, 'answer').mockResolvedValue(resultPayload as any);

      await gateway.answer(mockSocket, { qnaId: 'q1', text: '답변' });

      expect(activityScoreManager.updateScore).toHaveBeenCalledWith(
        roomId,
        participantId,
        'qna_answer',
      );
      expect(mockServer.to).toHaveBeenCalledWith(`${roomId}:audience`);
      expect(mockServer.to).toHaveBeenCalledWith(`${roomId}:presenter`);
      expect(mockServer.emit).toHaveBeenCalledWith('update_qna', resultPayload.audience);
    });
  });

  describe('breakQna', () => {
    it('수동 종료 시 qna_end 이벤트를 전송하고 답변 데이터를 반환해야 한다', async () => {
      const stopPayload = {
        audience: { qnaId: 'q1' },
        presenter: { answers: ['a1'], count: 1 },
      };
      jest.spyOn(qnaService, 'stopQna').mockResolvedValue(stopPayload as any);

      const result = await gateway.breakQna(mockSocket, { qnaId: 'q1' });

      expect(mockSocket.to).toHaveBeenCalledWith(roomId);
      expect(result).toEqual({
        success: true,
        answers: stopPayload.presenter.answers,
        count: stopPayload.presenter.count,
      });
    });
  });

  describe('handleAutoClosedQnaEvent', () => {
    it('자동 종료 이벤트 시 공개 여부에 따라 데이터를 가공하여 전송해야 한다', async () => {
      const mockQna = { id: 'q1', roomId: roomId, title: 'T', isPublic: true };
      jest.spyOn(qnaService, 'getQna').mockResolvedValue(mockQna as any);

      await gateway.handleAutoClosedQnaEvent({ qnaId: 'q1', answers: [{ text: 'ans1' }] as any });

      expect(mockServer.to).toHaveBeenCalledWith(`${roomId}:presenter`);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'qna_end',
        expect.objectContaining({
          text: ['ans1'],
        }),
      );
    });

    it('서비스 에러 발생 시 logger.error가 호출되어야 한다', async () => {
      const loggerSpy = jest.spyOn((gateway as any).logger, 'error');
      jest.spyOn(qnaService, 'getQna').mockRejectedValue(new Error('DB Error'));

      await gateway.handleAutoClosedQnaEvent({ qnaId: 'err', answers: [] });

      expect(loggerSpy).toHaveBeenCalled();
    });
  });
});
