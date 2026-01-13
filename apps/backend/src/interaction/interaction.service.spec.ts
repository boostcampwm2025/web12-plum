import { Test, TestingModule } from '@nestjs/testing';
import { InteractionService } from './interaction.service';
import { InteractionRepository } from './interaction.repository';

describe('InteractionService (투표 및 Q&A 생성 테스트)', () => {
  let service: InteractionService;
  let repository: InteractionRepository;

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
    repository = module.get<InteractionRepository>(InteractionRepository);
  });

  describe('createPoll (투표 생성)', () => {
    it('입력된 데이터가 올바른 구조의 Poll 객체로 출력되어야 한다', async () => {
      // 1. 입력 데이터 (Input)
      const createPollDto = {
        title: '오늘 점심 메뉴는?',
        options: [{ value: '치킨' }, { value: '피자' }],
        timeLimit: 60,
      };

      // 2. 실행 (Action)
      const result = await service.createPoll(createPollDto);

      // 3. 출력 검증 (Output Validation)
      expect(result).toHaveProperty('id'); // ID가 생성되었는가
      expect(result.title).toBe(createPollDto.title); // 제목이 일치하는가
      expect(result.options).toHaveLength(2); // 옵션 개수가 맞는가
      expect(result.options[0]).toMatchObject({
        id: 0,
        value: '치킨',
        count: 0,
      }); // 첫 번째 옵션 데이터 검증
      expect(result.createdAt).toBeDefined(); // 생성일이 존재하는가
      expect(result.updatedAt).toBe(result.createdAt); // 수정일이 생성일과 같은가
    });
  });

  describe('createQna (Q&A 생성)', () => {
    it('입력된 데이터가 올바른 구조의 Qna 객체로 출력되어야 한다', async () => {
      // 1. 입력 데이터 (Input)
      const createQnaDto = {
        title: 'TTL 설정을 어떻게 하나요?',
        timeLimit: 60,
        isPublic: true,
      };

      // 2. 실행 (Action)
      const result = await service.createQna(createQnaDto);

      // 3. 출력 검증 (Output Validation)
      expect(result).toHaveProperty('id');
      expect(result.title).toBe(createQnaDto.title);
      expect(result.timeLimit).toBe(createQnaDto.timeLimit);
      expect(result.isPublic).toBe(createQnaDto.isPublic);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });
});
