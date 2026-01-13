import { Test, TestingModule } from '@nestjs/testing';
import { InteractionService } from './interaction.service';
import { InteractionRepository } from './interaction.repository';

describe('InteractionService (투표 및 Q&A 생성 테스트)', () => {
  let service: InteractionService;

  // 가짜 레포지토리 설정
  const mockRepository = {
    savePoll: jest.fn().mockResolvedValue(undefined),
    saveQna: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionService,
        {
          provide: InteractionRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<InteractionService>(InteractionService);
    jest.clearAllMocks();
  });

  describe('createPoll (투표 생성)', () => {
    it('입력된 데이터가 올바른 구조의 Poll 객체로 출력되어야 한다', async () => {
      const roomId = 'absed-1';
      const createPollDto = {
        title: '오늘 점심 메뉴는?',
        options: [{ value: '치킨' }, { value: '피자' }],
        timeLimit: 60,
      };

      const result = await service.createPoll(roomId, createPollDto);

      expect(result).toHaveProperty('id');
      expect(result.title).toBe(createPollDto.title);
      expect(result.options).toHaveLength(2);
      expect(result.options[0]).toMatchObject({
        id: 0,
        value: '치킨',
        count: 0,
      });
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBe(result.createdAt);
      expect(result.roomId).toBe(roomId);
    });
  });

  describe('createQna (Q&A 생성)', () => {
    it('입력된 데이터가 올바른 구조의 Qna 객체로 출력되어야 한다', async () => {
      const roomId = 'absed-1';
      const createQnaDto = {
        title: 'TTL 설정을 어떻게 하나요?',
        timeLimit: 60,
        isPublic: true,
      };

      const result = await service.createQna(roomId, createQnaDto);

      expect(result).toHaveProperty('id');
      expect(result.title).toBe(createQnaDto.title);
      expect(result.timeLimit).toBe(createQnaDto.timeLimit);
      expect(result.isPublic).toBe(createQnaDto.isPublic);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.roomId).toBe(roomId);
    });
  });

  describe('createMultiplePoll (복수 투표 생성)', () => {
    it('배열로 입력된 투표 데이터 개수만큼 Poll 객체가 생성되어야 한다', async () => {
      const roomId = 'room-123';
      const pollsDto = [
        { title: '투표 1', options: [{ value: 'A' }], timeLimit: 30 },
        { title: '투표 2', options: [{ value: 'B' }], timeLimit: 30 },
      ];

      const results = await service.createMultiplePoll(roomId, pollsDto);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('투표 1');
      expect(results[1].title).toBe('투표 2');
      expect(mockRepository.savePoll).toHaveBeenCalledTimes(2);
    });

    it('빈 배열이 입력되면 빈 배열을 반환해야 한다', async () => {
      const result = await service.createMultiplePoll('room-1', []);
      expect(result).toEqual([]);
      expect(mockRepository.savePoll).not.toHaveBeenCalled();
    });
  });

  describe('createMultipleQna (복수 Q&A 생성)', () => {
    it('배열로 입력된 Q&A 데이터 개수만큼 Qna 객체가 생성되어야 한다', async () => {
      const roomId = 'room-123';
      const qnasDto = [
        { title: '질문 1', timeLimit: 60, isPublic: true },
        { title: '질문 2', timeLimit: 60, isPublic: false },
        { title: '질문 3', timeLimit: 60, isPublic: true },
      ];

      const results = await service.createMultipleQna(roomId, qnasDto);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.roomId === roomId)).toBe(true);
      expect(mockRepository.saveQna).toHaveBeenCalledTimes(3);
    });
  });
});
