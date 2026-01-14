import { UseFilters } from '@nestjs/common';
import { WebSocketGateway } from '@nestjs/websockets';
import { SOCKET_CONFIG } from '../common/constants/socket.constants.js';
import { WsExceptionFilter } from '../common/filters/index.js';
import { RedisService } from '../redis/redis.service.js';

@UseFilters(WsExceptionFilter)
@WebSocketGateway(SOCKET_CONFIG)
export class RoomGateway {
  constructor(private readonly redisService: RedisService) {}
}
