import { Injectable } from '@nestjs/common';
import { Qna } from '@plum/shared-interfaces';
import { RedisService } from '../redis.service.js';
import { BaseRedisRepository } from './base-redis.repository.js';

@Injectable()
export class QnaManagerService extends BaseRedisRepository<Qna> {
  protected readonly keyPrefix = 'qna:';

  constructor(redisService: RedisService) {
    super(redisService, QnaManagerService.name);
  }
}
