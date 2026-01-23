import { UseFilters } from '@nestjs/common';
import { WebSocketGateway } from '@nestjs/websockets';
import { SOCKET_CONFIG } from '../common/constants/socket.constants.js';
import { WsExceptionFilter } from '../common/filters/index.js';
import { RedisService } from '../redis/redis.service.js';

/**
 * MediaGateway 생성
 * - RedisService 먼저 생성
 *  - onModuleInit 실행
 *    - Redis 연결
 */
@UseFilters(WsExceptionFilter)
@WebSocketGateway(SOCKET_CONFIG)
export class MediaGateway {
  // RedisService를 주입해서 Gateway가 Redis 초기화 후에만 생성
  // 사용목적보단 라이프사이클 관리를 위해 주입
  constructor(private readonly redisService: RedisService) {}
}
