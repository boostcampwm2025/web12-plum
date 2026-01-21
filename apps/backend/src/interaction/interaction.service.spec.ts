import { Test, TestingModule } from '@nestjs/testing';
import { PollManagerService, QnaManagerService } from '../redis/repository-manager/index.js';
import { InteractionService } from './interaction.service.js';
import { BusinessException } from '../common/types';

describe('InteractionService (투표 및 Q&A 생성 테스트)', () => {
  let service: InteractionService;

  // 1. PollManagerService 모킹
  const mockPollManager = {
    addPollToRoom: jest.fn(),
    getPollsInRoom: jest.fn(),
    findOne: jest.fn(),
    startPoll: jest.fn(),
    submitVote: jest.fn(),
    closePoll: jest.fn(),
    getFinalResults: jest.fn(),
  };

  // 2. QnaManagerService 모킹
  const mockQnaManager = {
    addQnaToRoom: jest.fn(),
    getQnasInRoom: jest.fn(),
    findOne: jest.fn(),
    startQna: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionService,
        {
          provide: PollManagerService,
          useValue: mockPollManager,
        },
        {
          provide: QnaManagerService,
          useValue: mockQnaManager,
        },
      ],
    }).compile();

    service = module.get<InteractionService>(InteractionService);
    jest.clearAllMocks();
  });

  describe('createPoll (투표 생성)', () => {
    it('입력된 데이터가 올바른 구조의 Poll 객체로 출력되고 저장되어야 한다', async () => {
      const roomId = 'absed-1';
      const createPollDto = {
        title: '오늘 점심 메뉴는?',
        options: [{ value: '치킨' }, { value: '피자' }],
        timeLimit: 60,
      };

      const result = await service.createPoll(roomId, createPollDto);

      // 객체 구조 검증
      expect(result).toHaveProperty('id');
      expect(result.title).toBe(createPollDto.title);
      expect(result.options).toHaveLength(2);
      expect(result.options[0]).toMatchObject({ id: 0, value: '치킨', count: 0 });

      // 저장 함수 호출 확인
      expect(mockPollManager.addPollToRoom).toHaveBeenCalledWith(roomId, [result]);
    });
  });

  describe('createMultiplePoll (복수 투표 생성)', () => {
    it('배열로 입력된 데이터만큼 객체가 생성되고 saveMany가 호출되어야 한다', async () => {
      const roomId = 'room-123';
      const pollsDto = [
        { title: '투표 1', options: [{ value: 'A' }], timeLimit: 30 },
        { title: '투표 2', options: [{ value: 'B' }], timeLimit: 30 },
      ];

      const results = await service.createMultiplePoll(roomId, pollsDto);

      expect(results).toHaveLength(2);
      // saveMany가 한 번 호출되었는지 확인 (Pipeline 방식)
      expect(mockPollManager.addPollToRoom).toHaveBeenCalledTimes(1);
      expect(mockPollManager.addPollToRoom).toHaveBeenCalledWith(roomId, results);
    });

    it('빈 배열이 입력되면 빈 배열을 반환하고 저장 로직을 타지 않아야 한다', async () => {
      const result = await service.createMultiplePoll('room-1', []);
      expect(result).toEqual([]);
      expect(mockPollManager.addPollToRoom).not.toHaveBeenCalled();
    });
  });

  describe('getPoll', () => {
    it('존재하는 투표 ID를 넣으면 투표 정보를 반환해야 한다', async () => {
      const mockPoll = { id: 'p1', title: 'test' };
      mockPollManager.findOne.mockResolvedValue(mockPoll as any);

      const result = await service.getPoll('p1');

      expect(result).toEqual(mockPoll);
    });

    it('투표가 없으면 "Could not find poll" 에러를 던져야 한다', async () => {
      mockPollManager.findOne.mockResolvedValue(null);

      await expect(service.getPoll('none')).rejects.toThrow('Could not find poll');
    });
  });

  describe('getPolls (투표 목록 조회)', () => {
    it('roomId에 해당하는 투표 리스트 배열을 반환해야 한다', async () => {
      const roomId = 'room-123';
      const mockPolls = [
        { id: 'poll-1', title: '질문 1', options: [] },
        { id: 'poll-2', title: '질문 2', options: [] },
      ];

      mockPollManager.getPollsInRoom.mockResolvedValue(mockPolls);

      const result = await service.getPolls(roomId);

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockPolls);
      expect(mockPollManager.getPollsInRoom).toHaveBeenCalledWith(roomId);
    });

    it('투표가 없는 경우 빈 배열을 반환해야 한다', async () => {
      mockPollManager.getPollsInRoom.mockResolvedValue([]);

      const result = await service.getPolls('empty-room');

      expect(result).toEqual([]);
      expect(mockPollManager.getPollsInRoom).toHaveBeenCalledWith('empty-room');
    });
  });

  describe('startPoll (투표 시작)', () => {
    const pollId = 'poll-ulid-123';
    const mockPoll = {
      id: pollId,
      title: '테스트 투표',
      status: 'pending',
      timeLimit: 60,
      options: [{ id: 0, value: '옵션1', count: 0 }],
    };

    it('대기 중인 투표를 시작하고 PollPayload를 반환해야 한다', async () => {
      const startedAt = new Date().toISOString();
      const endedAt = new Date(Date.now() + 60000).toISOString();

      mockPollManager.findOne.mockResolvedValue(mockPoll);
      mockPollManager.startPoll.mockResolvedValue({ startedAt, endedAt });

      const result = await service.startPoll(pollId);

      expect(mockPollManager.findOne).toHaveBeenCalledWith(pollId);
      expect(mockPollManager.startPoll).toHaveBeenCalledWith(pollId, mockPoll.timeLimit);

      expect(result).toEqual({
        id: pollId,
        title: mockPoll.title,
        options: mockPoll.options,
        timeLimit: mockPoll.timeLimit,
        startedAt,
        endedAt,
      });
    });

    it('존재하지 않는 투표인 경우 BusinessException을 던져야 한다', async () => {
      mockPollManager.findOne.mockResolvedValue(null);

      await expect(service.startPoll('invalid-id')).rejects.toThrow('존재하지 않는 투표입니다.');
    });

    it('이미 진행 중(active)인 투표를 시작하려 하면 BusinessException을 던져야 한다', async () => {
      mockPollManager.findOne.mockResolvedValue({
        ...mockPoll,
        status: 'active',
      });

      await expect(service.startPoll(pollId)).rejects.toThrow('이미 시작되거나 종료된 투표입니다.');
    });

    it('이미 종료(closed)된 투표를 시작하려 하면 BusinessException을 던져야 한다', async () => {
      mockPollManager.findOne.mockResolvedValue({
        ...mockPoll,
        status: 'closed',
      });

      await expect(service.startPoll(pollId)).rejects.toThrow('이미 시작되거나 종료된 투표입니다.');
    });
  });

  describe('vote (투표 제출)', () => {
    const pollId = 'poll-123';
    const participantId = 'user-999';
    const participantName = 'user-999';
    const mockPoll = {
      id: pollId,
      status: 'active',
      options: [
        { id: 0, value: '치킨', count: 0 },
        { id: 1, value: '피자', count: 0 },
      ],
    };

    beforeEach(() => {
      mockPollManager.submitVote = jest.fn();
    });

    it('유효한 선택지에 투표하면 업데이트된 옵션 목록을 반환해야 한다', async () => {
      const optionId = 0;
      const mockUpdateResult = {
        pollId,
        options: [
          { id: 0, count: 2 },
          { id: 1, count: 3 },
        ],
      };

      mockPollManager.findOne.mockResolvedValue(mockPoll);
      mockPollManager.submitVote.mockResolvedValue(mockUpdateResult);

      const result = await service.vote(pollId, participantId, participantName, optionId);

      expect(mockPollManager.findOne).toHaveBeenCalledWith(pollId);
      expect(mockPollManager.submitVote).toHaveBeenCalledWith(
        pollId,
        participantId,
        participantName,
        optionId,
      );
      expect(result).toEqual({
        pollId,
        options: mockUpdateResult.options,
      });
    });

    it('존재하지 않는 투표에 투표하려 하면 BusinessException을 던져야 한다', async () => {
      mockPollManager.findOne.mockResolvedValue(null);

      await expect(service.vote('invalid-id', participantId, participantName, 0)).rejects.toThrow(
        '존재하지 않는 투표입니다.',
      );

      expect(mockPollManager.submitVote).not.toHaveBeenCalled();
    });

    it('유효하지 않은 옵션 ID(범위 초과)로 투표하려 하면 에러를 던져야 한다', async () => {
      mockPollManager.findOne.mockResolvedValue(mockPoll);
      const invalidOptionId = 5; // mockPoll.options는 인덱스 0, 1만 존재

      await expect(
        service.vote(pollId, participantId, participantName, invalidOptionId),
      ).rejects.toThrow('유효하지 않은 선택지입니다.');

      expect(mockPollManager.submitVote).not.toHaveBeenCalled();
    });

    it('음수 옵션 ID로 투표하려 하면 에러를 던져야 한다', async () => {
      mockPollManager.findOne.mockResolvedValue(mockPoll);

      await expect(service.vote(pollId, participantId, participantName, -1)).rejects.toThrow(
        '유효하지 않은 선택지입니다.',
      );
    });

    it('Manager에서 발생한 에러(중복 투표 등)는 그대로 위로 던져져야 한다', async () => {
      mockPollManager.findOne.mockResolvedValue(mockPoll);
      mockPollManager.submitVote.mockRejectedValue(new Error('Duplicate vote attempt'));

      await expect(service.vote(pollId, participantId, participantName, 0)).rejects.toThrow(
        'Duplicate vote attempt',
      );
    });
  });

  describe('stopPoll (투표 종료)', () => {
    const pollId = 'poll-123';
    const mockOptions = [
      { id: 0, value: '옵션1', count: 5, voters: ['user1'] },
      { id: 1, value: '옵션2', count: 3, voters: ['user2'] },
    ];

    it('존재하지 않는 투표 ID인 경우 BusinessException을 던져야 한다', async () => {
      mockPollManager.findOne.mockResolvedValue(null);

      await expect(service.stopPoll(pollId)).rejects.toThrow(
        new BusinessException('존재하지 않는 투표입니다.'),
      );
    });

    it('이미 종료된(ended) 투표인 경우 getFinalResults를 호출하여 결과를 반환해야 한다', async () => {
      const endedPoll = { id: pollId, status: 'ended' };
      mockPollManager.findOne.mockResolvedValue(endedPoll);
      mockPollManager.getFinalResults.mockResolvedValue(mockOptions);

      const result = await service.stopPoll(pollId);

      expect(mockPollManager.getFinalResults).toHaveBeenCalledWith(pollId);
      expect(mockPollManager.closePoll).not.toHaveBeenCalled();
      expect(result).toEqual(mockOptions);
    });

    it('진행 중인 투표인 경우 closePoll을 호출하여 투표를 마감하고 결과를 반환해야 한다', async () => {
      const activePoll = { id: pollId, status: 'active' };
      mockPollManager.findOne.mockResolvedValue(activePoll);
      mockPollManager.closePoll.mockResolvedValue(mockOptions);

      const result = await service.stopPoll(pollId);

      expect(mockPollManager.closePoll).toHaveBeenCalledWith(pollId);
      expect(mockPollManager.getFinalResults).not.toHaveBeenCalled(); // getFinalResults는 호출되면 안 됨
      expect(result).toEqual(mockOptions);
    });
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
});
