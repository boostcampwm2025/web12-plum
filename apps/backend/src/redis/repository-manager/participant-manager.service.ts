import { Injectable } from '@nestjs/common';
import { Participant } from '@plum/shared-interfaces';
import { RedisService } from '../redis.service.js';
import { BaseRedisRepository } from './base-redis.repository.js';

@Injectable()
export class ParticipantManagerService extends BaseRedisRepository<Participant> {
  protected readonly keyPrefix = 'participant:';

  constructor(redisService: RedisService) {
    super(redisService, ParticipantManagerService.name);
  }
}
