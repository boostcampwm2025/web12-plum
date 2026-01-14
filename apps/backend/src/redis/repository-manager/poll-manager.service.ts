import { Injectable } from '@nestjs/common';
import { Poll } from '@plum/shared-interfaces';
import { RedisService } from '../redis.service.js';
import { BaseRedisRepository } from './base-redis.repository.js';

@Injectable()
export class PollManagerService extends BaseRedisRepository<Poll> {
  protected readonly keyPrefix = 'poll:';

  constructor(redisService: RedisService) {
    super(redisService, PollManagerService.name);
  }
}
