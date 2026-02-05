import { Test, TestingModule } from '@nestjs/testing';
import { QnaManagerService } from '../../redis/repository-manager/index.js';
import { BusinessException } from '../../common/types/index.js';
import { QnaService } from './qna.service.js';

describe('QnaService (투표 및 Q&A 생성 테스트)', () => {
  let service: QnaService;

  // 2. QnaManagerService 모킹
  const mockQnaManager = {
    addQnaToRoom: jest.fn(),
    getQnasInRoom: jest.fn(),
    findOne: jest.fn(),
    startQna: jest.fn(),
    submitAnswer: jest.fn(),
    closeQna: jest.fn(),
    getFinalResults: jest.fn(),
    getActiveAnswers: jest.fn(),
    hasAnswered: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QnaService,
        {
          provide: QnaManagerService,
          useValue: mockQnaManager,
        },
      ],
    }).compile();

    service = module.get<QnaService>(QnaService);
    jest.clearAllMocks();
  });

  describe('createQna (Q&A 생성)', () => {
    it('입력된 데이터가 올바른 구조의 Qna 객체로 출력되고 저장되어야 한다', async () => {
      const roomId = 'absed-1';
      const createQnaDto = {
        title: '질문입니다.',
        timeLimit: 60,
        isPublic: true,
      };

      const result = await service.createQna(roomId, createQnaDto);

      expect(result).toHaveProperty('id');
      expect(result.roomId).toBe(roomId);
      expect(mockQnaManager.addQnaToRoom).toHaveBeenCalledWith(roomId, [result]);
    });
  });

  describe('createMultipleQna (복수 Q&A 생성)', () => {
    it('배열로 입력된 데이터만큼 객체가 생성되고 saveMany가 호출되어야 한다', async () => {
      const roomId = 'room-123';
      const qnasDto = [
        { title: '질문 1', timeLimit: 60, isPublic: true },
        { title: '질문 2', timeLimit: 60, isPublic: false },
      ];

      const results = await service.createMultipleQna(roomId, qnasDto);

      expect(results).toHaveLength(2);
      expect(mockQnaManager.addQnaToRoom).toHaveBeenCalledWith(roomId, results);
    });
  });

  describe('getQna', () => {
    it('존재하는 질문 ID를 넣으면 질문 정보를 반환해야 한다', async () => {
      const mockQna = { id: 'q1', title: 'test' };
      mockQnaManager.findOne.mockResolvedValue(mockQna as any);

      const result = await service.getQna('q1');

      expect(result).toEqual(mockQna);
    });

    it('질문이 없으면 "Could not find qna" 에러를 던져야 한다', async () => {
      mockQnaManager.findOne.mockResolvedValue(null);

      await expect(service.getQna('none')).rejects.toThrow('Could not find qna');
    });
  });

  describe('getQnas (질문 목록 조회)', () => {
    it('roomId에 해당하는 질문 리스트 배열을 반환해야 한다', async () => {
      const roomId = 'room-123';
      const mockQnas = [
        { id: 'qna-1', title: '질문 1' },
        { id: 'qna-2', title: '질문 2' },
      ];

      mockQnaManager.getQnasInRoom.mockResolvedValue(mockQnas);

      const result = await service.getQnas(roomId);

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockQnas);
      expect(mockQnaManager.getQnasInRoom).toHaveBeenCalledWith(roomId);
    });

    it('질문이 없는 경우 빈 배열을 반환해야 한다', async () => {
      mockQnaManager.getQnasInRoom.mockResolvedValue([]);

      const result = await service.getQnas('empty-room');

      expect(result).toEqual([]);
      expect(mockQnaManager.getQnasInRoom).toHaveBeenCalledWith('empty-room');
    });

    it('진행 중 질문에 대해서는 응답 목록이 함께 포함되어야 한다', async () => {
      const roomId = 'room-123';
      const activeQna = { id: 'qna-1', title: '질문 1', status: 'active' };
      const pendingQna = { id: 'qna-2', title: '질문 2', status: 'pending' };
      const mockAnswers = [{ participantId: 'u1', participantName: 'A', text: '답변1' }];

      mockQnaManager.getQnasInRoom.mockResolvedValue([activeQna, pendingQna]);
      mockQnaManager.getActiveAnswers.mockResolvedValue(mockAnswers);

      const result = await service.getQnas(roomId);

      expect(mockQnaManager.getActiveAnswers).toHaveBeenCalledWith('qna-1');
      expect(result).toEqual([{ ...activeQna, answers: mockAnswers }, pendingQna]);
    });
  });

  describe('getActiveQna (진행 중 질문 조회)', () => {
    it('진행 중 질문이 없으면 null과 answered=false를 반환해야 한다', async () => {
      mockQnaManager.getQnasInRoom.mockResolvedValue([]);

      const result = await service.getActiveQna('room-1', 'participant-1');

      expect(result).toEqual({ qna: null, answered: false });
      expect(mockQnaManager.getQnasInRoom).toHaveBeenCalledWith('room-1');
      expect(mockQnaManager.hasAnswered).not.toHaveBeenCalled();
    });

    it('진행 중 질문이 있으면 payload와 answered 여부를 반환해야 한다', async () => {
      const activeQna = {
        id: 'qna-1',
        title: '질문 1',
        status: 'active',
        timeLimit: 60,
        startedAt: '2024-01-01T00:00:00Z',
        endedAt: '2024-01-01T00:01:00Z',
      };

      mockQnaManager.getQnasInRoom.mockResolvedValue([activeQna]);
      mockQnaManager.hasAnswered.mockResolvedValue(true);

      const result = await service.getActiveQna('room-1', 'participant-1');

      expect(result).toEqual({
        qna: {
          id: activeQna.id,
          title: activeQna.title,
          timeLimit: activeQna.timeLimit,
          startedAt: activeQna.startedAt,
          endedAt: activeQna.endedAt,
        },
        answered: true,
      });
      expect(mockQnaManager.hasAnswered).toHaveBeenCalledWith('qna-1', 'participant-1');
    });
  });

  describe('startQna (질문 시작)', () => {
    const qnaId = 'qna-ulid-123';
    const mockQna = {
      id: qnaId,
      title: '테스트 질문',
      status: 'pending',
      timeLimit: 120,
    };

    it('대기 중인 질문을 시작하고 QnaPayload를 반환해야 한다', async () => {
      const startedAt = new Date().toISOString();
      const endedAt = new Date(Date.now() + 120000).toISOString();

      mockQnaManager.findOne.mockResolvedValue(mockQna);
      mockQnaManager.startQna.mockResolvedValue({ startedAt, endedAt });

      const result = await service.startQna(qnaId);

      expect(mockQnaManager.findOne).toHaveBeenCalledWith(qnaId);
      expect(mockQnaManager.startQna).toHaveBeenCalledWith(qnaId, mockQna.timeLimit);

      expect(result).toEqual({
        id: qnaId,
        title: mockQna.title,
        timeLimit: mockQna.timeLimit,
        startedAt,
        endedAt,
      });
    });

    it('존재하지 않는 질문인 경우 BusinessException을 던져야 한다', async () => {
      mockQnaManager.findOne.mockResolvedValue(null);

      await expect(service.startQna('invalid-id')).rejects.toThrow(
        new BusinessException('존재하지 않는 질문입니다.'),
      );

      expect(mockQnaManager.startQna).not.toHaveBeenCalled();
    });

    it('이미 시작(active)된 질문을 다시 시작하려 하면 BusinessException을 던져야 한다', async () => {
      mockQnaManager.findOne.mockResolvedValue({
        ...mockQna,
        status: 'active',
      });

      await expect(service.startQna(qnaId)).rejects.toThrow(
        new BusinessException('이미 시작되거나 종료된 질문입니다.'),
      );

      expect(mockQnaManager.startQna).not.toHaveBeenCalled();
    });

    it('이미 종료(ended)된 질문을 시작하려 하면 BusinessException을 던져야 한다', async () => {
      mockQnaManager.findOne.mockResolvedValue({
        ...mockQna,
        status: 'ended',
      });

      await expect(service.startQna(qnaId)).rejects.toThrow(
        new BusinessException('이미 시작되거나 종료된 질문입니다.'),
      );
    });
  });

  describe('answer (Q&A 답변 제출)', () => {
    const qnaId = 'qna-123';
    const participantId = 'user-777';
    const participantName = '답변자';
    const text = '이것은 답변 내용입니다.';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('성공: 공개 질문(isPublic: true)인 경우 청중과 발표자에게 동일한 상세 페이로드를 반환해야 한다', async () => {
      const mockQna = { id: qnaId, status: 'active', isPublic: true };
      const mockResult = { count: 5 };

      mockQnaManager.findOne.mockResolvedValue(mockQna);
      mockQnaManager.submitAnswer.mockResolvedValue(mockResult);

      const result = await service.answer(qnaId, participantId, participantName, text);

      const expectedPayload = {
        qnaId,
        participantId,
        participantName,
        text,
        count: 5,
      };

      expect(result).toEqual({
        audience: { qnaId, text, count: 5 },
        presenter: expectedPayload,
      });
    });

    it('성공: 비공개 질문(isPublic: false)인 경우 청중에게는 카운트만, 발표자에게는 상세 내용을 반환해야 한다', async () => {
      const mockQna = { id: qnaId, isPublic: false };
      const mockSubmitResult = { count: 5 };

      mockQnaManager.findOne.mockResolvedValue(mockQna);
      mockQnaManager.submitAnswer.mockResolvedValue(mockSubmitResult);

      const result = await service.answer(qnaId, participantId, participantName, text);

      expect(result).toEqual({
        audience: {
          qnaId: qnaId,
          count: 5,
        },
        presenter: {
          qnaId,
          participantId,
          participantName,
          text,
          count: 5,
        },
      });
    });

    it('실패: 존재하지 않는 질문 ID인 경우 BusinessException을 던져야 한다', async () => {
      mockQnaManager.findOne.mockResolvedValue(null);

      await expect(service.answer(qnaId, participantId, participantName, text)).rejects.toThrow(
        new BusinessException('존재하지 않는 질문입니다.'),
      );

      expect(mockQnaManager.submitAnswer).not.toHaveBeenCalled();
    });

    it('실패: QnaManagerService에서 발생한 에러(중복 답변, 비활성 등)는 그대로 위로 던져져야 한다', async () => {
      mockQnaManager.findOne.mockResolvedValue({ id: qnaId });
      mockQnaManager.submitAnswer.mockRejectedValue(new Error('Qna is not active'));

      await expect(service.answer(qnaId, participantId, participantName, text)).rejects.toThrow(
        'Qna is not active',
      );
    });
  });

  describe('stopQna (질문 종료)', () => {
    const qnaId = 'qna-123';
    const mockAnswers = [
      { participantId: 'u1', participantName: 'A', text: '답변1' },
      { participantId: 'u2', participantName: 'B', text: '답변2' },
    ];

    beforeEach(() => {
      mockQnaManager.closeQna = jest.fn();
      mockQnaManager.getFinalResults = jest.fn();
    });

    it('성공: 공개 질문(isPublic: true)을 종료하면 청중과 발표자 모두 상세 답변을 받아야 한다', async () => {
      const activeQna = { id: qnaId, title: 'q1', status: 'active', isPublic: true };
      mockQnaManager.findOne.mockResolvedValue(activeQna);
      mockQnaManager.closeQna.mockResolvedValue(mockAnswers);

      const result = await service.stopQna(qnaId);

      const expectedPayload = {
        qnaId,
        title: activeQna.title,
        count: mockAnswers.length,
        answers: mockAnswers,
      };

      expect(mockQnaManager.closeQna).toHaveBeenCalledWith(qnaId);
      expect(result).toEqual({
        audience: {
          qnaId,
          title: activeQna.title,
          count: mockAnswers.length,
          text: mockAnswers.map((a) => a.text),
        },
        presenter: expectedPayload,
      });
    });

    it('성공: 비공개 질문(isPublic: false)을 종료하면 청중에게는 통계(ID, count)만 반환해야 한다', async () => {
      const activeQna = { id: qnaId, title: 'q1', status: 'active', isPublic: false };
      mockQnaManager.findOne.mockResolvedValue(activeQna);
      mockQnaManager.closeQna.mockResolvedValue(mockAnswers);

      const result = await service.stopQna(qnaId);

      expect(result).toEqual({
        audience: { qnaId: qnaId, title: activeQna.title, count: mockAnswers.length },
        presenter: {
          qnaId,
          title: activeQna.title,
          count: mockAnswers.length,
          answers: mockAnswers,
        },
      });
    });

    it('성공: 이미 종료된(ended) 질문을 다시 종료하려 하면 closeQna 대신 getFinalResults를 호출해야 한다', async () => {
      const endedQna = { id: qnaId, status: 'ended', isPublic: true };
      mockQnaManager.findOne.mockResolvedValue(endedQna);
      mockQnaManager.getFinalResults.mockResolvedValue(mockAnswers);

      const result = await service.stopQna(qnaId);

      expect(mockQnaManager.getFinalResults).toHaveBeenCalledWith(qnaId);
      expect(mockQnaManager.closeQna).not.toHaveBeenCalled();
      expect(result.presenter.answers).toEqual(mockAnswers);
    });

    it('실패: 존재하지 않는 질문 ID인 경우 BusinessException을 던져야 한다', async () => {
      mockQnaManager.findOne.mockResolvedValue(null);

      await expect(service.stopQna('invalid-id')).rejects.toThrow(
        new BusinessException('존재하지 않는 질문입니다.'),
      );
    });
  });
});
