import { Test, TestingModule } from '@nestjs/testing';
import { PollManagerService, QnaManagerService } from '../redis/repository-manager/index.js';
import { InteractionService } from './interaction.service.js';

describe('InteractionService (투표 및 Q&A 생성 테스트)', () => {
  let service: InteractionService;

  // 1. PollManagerService 모킹
  const mockPollManager = {
    addPollToRoom: jest.fn(),
    getPollsInRoom: jest.fn(),
    findOne: jest.fn(),
    startPoll: jest.fn(),
  };

  // 2. QnaManagerService 모킹
  const mockQnaManager = {
    saveOne: jest.fn().mockResolvedValue(undefined),
    saveMany: jest.fn().mockResolvedValue(undefined),
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
      expect(mockQnaManager.saveOne).toHaveBeenCalledWith(result.id, result);
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
      expect(mockQnaManager.saveMany).toHaveBeenCalledTimes(1);
      expect(mockQnaManager.saveMany).toHaveBeenCalledWith(results);
    });
  });
});
