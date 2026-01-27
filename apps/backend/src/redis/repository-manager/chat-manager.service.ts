import { Injectable, Logger } from '@nestjs/common';
import { ChatMessage } from '@plum/shared-interfaces';
import { RedisService } from '../redis.service.js';

/**
 * ChatManagerService
 *
 * - 채팅 메시지 Redis 저장/조회
 * - messageId 생성 (시간순 정렬이 가능하고 충돌 방지)
 * - Rate Limiting (3초당 5개, Lua 스크립트)
 * - 재연결 동기화 (lastMessageId 이후 조회)
 */
@Injectable()
export class ChatManagerService {
  private readonly logger = new Logger(ChatManagerService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * messageId 생성
   *
   * 형식: {timestamp}-{random}
   *
   * - timestamp: 시간순 정렬 클라이언트 정렬용
   * - random: 동일 시간 충돌 방지
   */
  generateMessageId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${random}`;
  }

  /**
   * 메시지 저장
   *
   * Redis 구조:
   * - 키: room:{roomId}:chat
   * - 타입: ZSET
   * - Score: timestamp
   * - Member: JSON 문자열
   */
  async saveMessage(roomId: string, message: ChatMessage): Promise<void> {
    const key = `room:${roomId}:chat`;
    const client = this.redisService.getClient();

    try {
      const messageJson = JSON.stringify(message);

      // Pipeline: 네트워크 왕복 1회로 성능 최적화
      const pipeline = client.pipeline();
      pipeline.zadd(key, message.timestamp, messageJson); // score = timestamp
      pipeline.zremrangebyrank(key, 0, -1001); // 최대 1000개 유지 (오래된 것부터 삭제)
      pipeline.expire(key, 7200); // TTL 2시간 (마지막 메시지 후 2시간 동안 유지)

      await pipeline.exec();

      this.logger.log(`[채팅 저장] ${roomId} - ${message.messageId}`);
    } catch (error) {
      this.logger.error(`[채팅 저장 실패] ${roomId}`, error);
      throw error;
    }
  }

  /**
   * 재연결 동기화: lastMessageId 이후 메시지 조회
   *
   * ZSET 범위 조회:
   * - ZRANGEBYSCORE로 timestamp 기반 범위 조회
   * - Redis가 직접 필터링 → O(log(n) + m)
   * - 정렬 불필요 (ZSET가 자동 정렬)
   *
   */
  async getMessagesAfter(roomId: string, lastMessageId: string): Promise<ChatMessage[]> {
    const key = `room:${roomId}:chat`;
    const client = this.redisService.getClient();

    try {
      // 1. lastMessageId의 timestamp 추출
      const lastTimestamp = this.extractTimestamp(lastMessageId);

      // 2. ZRANGEBYSCORE: timestamp보다 큰 메시지 조회 (exclusive)
      //    '(' = exclusive, lastTimestamp 제외
      const rawMessages = await client.zrangebyscore(key, `(${lastTimestamp}`, '+inf');

      if (rawMessages.length === 0) {
        return [];
      }

      // 3. JSON 파싱 (이미 시간순 정렬됨!)
      const messages: ChatMessage[] = rawMessages.map((json) => JSON.parse(json));

      this.logger.log(
        `[채팅 동기화] ${roomId} - ${messages.length}개 메시지 반환 (after ${lastMessageId})`,
      );

      return messages;
    } catch (error) {
      this.logger.error(`[채팅 동기화 실패] ${roomId}`, error);
      return [];
    }
  }

  /**
   * messageId에서 timestamp 추출
   *
   * messageId 형식: {timestamp}-{random}
   * 1706345678901-a1b2c3d4 → 1706345678901
   */
  private extractTimestamp(messageId: string): number {
    const parts = messageId.split('-');
    return parseInt(parts[0], 10);
  }

  /**
   * Rate Limiting 체크 (3초당 5개) - Sliding Window + Lua 스크립트
   *
   * Redis 구조
   * - 키: room:{roomId}:ratelimit:chat:{participantId}
   * - 타입: ZSET
   * - Score/Member: 타임스탬프 (밀리초)
   * - TTL: 3초
   *
   */
  async checkRateLimit(roomId: string, participantId: string): Promise<boolean> {
    const key = `room:${roomId}:ratelimit:chat:${participantId}`;
    const client = this.redisService.getClient();
    const now = Date.now();
    const threeSecondsAgo = now - 3000;

    // Lua 스크립트: 원자적으로 실행되면서 Race Condition 완전 방지
    const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local threeSecondsAgo = tonumber(ARGV[2])

      -- 1. 3초 이전 데이터 삭제 (Sliding Window)
      redis.call('zremrangebyscore', key, '-inf', threeSecondsAgo)

      -- 2. 현재 개수 확인
      local count = redis.call('zcard', key)

      -- 3. 5개 이상이면 차단
      if count >= 5 then
        return 0
      end

      -- 4. 통과 시 타임스탬프 추가
      redis.call('zadd', key, now, tostring(now))
      redis.call('expire', key, 3)

      return 1
    `;

    try {
      const result = await client.eval(
        luaScript,
        1, // KEYS 개수
        key, // KEYS[1]
        now.toString(), // ARGV[1]
        threeSecondsAgo.toString(), // ARGV[2]
      );

      if (result === 0) {
        this.logger.warn(`[Rate Limit] ${participantId} (${roomId}) - 3초당 5개 초과`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`[Rate Limit 체크 실패] ${participantId}`, error);
      // 에러 시 통과 (서비스 가용성 우선)
      return true;
    }
  }
}
