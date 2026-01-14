import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service.js';

/**
 * 강의실 데이터 관리
 */
@Injectable()
export class RoomManagerService {
  private readonly logger = new Logger(RoomManagerService.name);

  constructor(private readonly redisService: RedisService) {}
}
