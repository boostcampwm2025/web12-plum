import { Test, TestingModule } from '@nestjs/testing';
import { InteractionService } from './interaction.service';
import { InteractionRepository } from './interaction.repository';

describe('InteractionService (투표 및 Q&A 생성 테스트)', () => {
  let service: InteractionService;

  // 가짜 레포지토리 설정
  const mockRepository = {
    savePoll: jest.fn().mockResolvedValue(undefined),
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
});
