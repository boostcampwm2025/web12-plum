import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../redis.service.js';
import { BaseRedisRepository } from './base-redis.repository.js';

// 테스트를 위한 구체 클래스
class TestRepository extends BaseRedisRepository<{ id: string; name: string; age: number }> {
  protected readonly keyPrefix = 'test:';
  constructor(redisService: RedisService) {
    super(redisService, 'TestRepository');
  }
}

describe('BaseRedisRepository (Manual Mocking)', () => {
  let repository: TestRepository;

  const mockRedisClient = {
    hset: jest.fn(),
    hgetall: jest.fn(),
    del: jest.fn(),
    pipeline: jest.fn().mockReturnValue({
      hset: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([[null, 'OK']]),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: RedisService,
          useValue: { getClient: () => mockRedisClient },
        },
      ],
    }).compile();

    repository = new TestRepository(module.get<RedisService>(RedisService));
    jest.clearAllMocks();
  });

  describe('saveOne', () => {
    it('TTL이 없을 때 hset을 직접 호출해야 한다', async () => {
      const data = { id: '1', name: 'test', age: 10 };
      await repository.saveOne('1', data);

      expect(mockRedisClient.hset).toHaveBeenCalledWith(
        'test:1',
        expect.objectContaining({ name: 'test' }),
      );
    });

    it('TTL이 있을 때 파이프라인을 사용해야 한다', async () => {
      const data = { id: '1', name: 'test', age: 10 };
      await repository.saveOne('1', data, 100);

      expect(mockRedisClient.pipeline).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('데이터가 있으면 mapHashToDto를 거쳐 복원된 객체를 반환해야 한다', async () => {
      mockRedisClient.hgetall.mockResolvedValue({
        id: '1',
        name: 'John',
        age: '30',
      });

      const result = await repository.findOne('1');

      expect(result).toBeDefined();
      expect(result!.age).toBe(30);
      expect(result!.name).toBe('John');
    });
  });
});
