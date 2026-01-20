import { Test, TestingModule } from '@nestjs/testing';
import { PollManagerService, QnaManagerService } from '../redis/repository-manager/index.js';
import { InteractionService } from './interaction.service.js';

describe('InteractionService (투표 및 Q&A 생성 테스트)', () => {
  let service: InteractionService;

  // 1. PollManagerService 모킹
  const mockPollManager = {
    addPollToRoom: jest.fn(),
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
