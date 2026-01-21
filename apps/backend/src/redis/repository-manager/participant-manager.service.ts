import { Injectable } from '@nestjs/common';
import { Participant } from '@plum/shared-interfaces';

import { RedisService } from '../redis.service.js';
import { SOCKET_TIMEOUT } from '../../common/constants/socket.constants.js';
import { BaseRedisRepository } from './base-redis.repository.js';
import { SocketMetadata } from '../../common/types';

@Injectable()
export class ParticipantManagerService extends BaseRedisRepository<Participant> {
  protected readonly keyPrefix = 'participant:';

  constructor(redisService: RedisService) {
    super(redisService, ParticipantManagerService.name);
  }

  /**
   * 재접속을 위한 메타데이터 임시 저장 (15초 TTL)
   */
  async setReconnectPending(participantId: string, metadata: SocketMetadata): Promise<void> {
    const client = this.redisService.getClient();
    const dataKey = `reconnect:data:${participantId}`;
    const timerKey = `reconnect:pending:${participantId}`;

    const pipeline = client.pipeline();
    pipeline.set(dataKey, JSON.stringify(metadata));
    pipeline.set(timerKey, '', 'EX', SOCKET_TIMEOUT);
    await pipeline.exec();
  }

  /**
   * 재접속 시도 시 메타데이터 가져오기 및 즉시 삭제 (타이머 취소)
   */
  async popReconnectMetadata(participantId: string): Promise<SocketMetadata | null> {
    const client = this.redisService.getClient();
    const dataKey = `reconnect:data:${participantId}`;
    const timerKey = `reconnect:pending:${participantId}`;

    const data = await client.get(dataKey);
    if (data) {
      await client.del(dataKey, timerKey);
      return JSON.parse(data);
    }
    return null;
  }
}
