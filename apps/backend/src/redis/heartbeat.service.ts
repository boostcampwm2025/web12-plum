import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from './redis.service.js';
import { SESSION_TTL, HEARTBEAT_INTERVAL } from '../common/constants/socket.constants.js';

/**
 * TTL Heartbeat 서비스
 *
 * 주기적으로 활성 세션 관련 Redis 키의 TTL을 갱신
 * 서버가 정상 동작하는 동안 키가 만료되지 않도록 하고
 * 서버 크래시 시 TTL 만료로 자동 정리되도록 한다.
 *
 * 갱신 대상
 * socket:{socketId}:소켓 메타데이터
 * room:{roomId}:강의실 정보
 * room:{roomId}:participants: 참가자 목록
 * room:{roomId}:names: 닉네임 목록
 * participant:{participantId}:참가자 정보
 */
@Injectable()
export class HeartbeatService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HeartbeatService.name);
  private intervalId: NodeJS.Timeout | null = null;

  constructor(private readonly redisService: RedisService) {}

  onModuleInit() {
    this.intervalId = setInterval(() => this.refreshAllTTLs(), HEARTBEAT_INTERVAL);
    this.logger.log(`Heartbeat 시작 (주기: ${HEARTBEAT_INTERVAL / 1000}초, TTL: ${SESSION_TTL}초)`);
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.logger.log('Heartbeat 중지');
  }

  private async refreshAllTTLs(): Promise<void> {
    try {
      const client = this.redisService.getClient();

      // 1. 활성 소켓 메타데이터 키 조회
      const socketKeys = await client.keys('socket:*');
      if (socketKeys.length === 0) return;

      const pipeline = client.pipeline();
      const roomIds = new Set<string>();
      const participantIds = new Set<string>();

      // 2. 소켓 키에서 roomId, participantId 수집
      const metadataResults = await Promise.all(socketKeys.map((key) => client.hgetall(key)));

      for (let i = 0; i < socketKeys.length; i++) {
        const data = metadataResults[i];
        if (!data || !data.roomId) continue;

        // 소켓 키 TTL 갱신
        pipeline.expire(socketKeys[i], SESSION_TTL);

        roomIds.add(data.roomId);
        participantIds.add(data.participantId);
      }

      // 3. Room 관련 키 TTL 갱신
      for (const roomId of roomIds) {
        pipeline.expire(`room:${roomId}`, SESSION_TTL);
        pipeline.expire(`room:${roomId}:participants`, SESSION_TTL);
        pipeline.expire(`room:${roomId}:names`, SESSION_TTL);
      }

      // 4. Participant 키 TTL 갱신
      for (const participantId of participantIds) {
        pipeline.expire(`participant:${participantId}`, SESSION_TTL);
      }

      await pipeline.exec();

      this.logger.debug(
        `[Heartbeat] TTL 갱신 완료 - 소켓: ${socketKeys.length}, 방: ${roomIds.size}, 참가자: ${participantIds.size}`,
      );
    } catch (error) {
      this.logger.error(`[Heartbeat] TTL 갱신 실패: ${error.message}`);
    }
  }
}
