import { Injectable, Logger } from '@nestjs/common';
import { CHAT_POLICY, ChatMessage } from '@plum/shared-interfaces';
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

      // 2. ZRANGEBYSCORE: timestamp 이상 메시지 조회 (inclusive)
      const rawMessages = await client.zrangebyscore(key, lastTimestamp, '+inf');

      if (rawMessages.length === 0) {
        return [];
      }

      // 3. JSON 파싱 후 lastMessageId 이후 필터링
      //    같은 timestamp 메시지 중 lastMessageId는 제외하고 그 이후만 반환
      const allMessages: ChatMessage[] = rawMessages.map((json) => JSON.parse(json));

      // lastMessageId 찾아서 그 이후만 반환
      const lastIndex = allMessages.findIndex((msg) => msg.messageId === lastMessageId);

      // lastMessageId를 못 찾으면 (이미 TTL로 삭제됨) 모든 메시지 반환
      // 찾으면 그 이후만 반환
      const messages = lastIndex === -1 ? allMessages : allMessages.slice(lastIndex + 1);

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

    const maxCount = CHAT_POLICY.LIMIT.MAX_MESSAGES;
    const threeSecondsAgo = now - CHAT_POLICY.LIMIT.WINDOW_MS;
    const ttl = Math.ceil(CHAT_POLICY.LIMIT.WINDOW_MS / 1000);

    // Lua 스크립트: 원자적으로 실행되면서 Race Condition 완전 방지
    const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local threeSecondsAgo = tonumber(ARGV[2])
      local maxCount = tonumber(ARGV[3])
      local ttl = tonumber(ARGV[4])

      -- 1. 3초 이전 데이터 삭제 (Sliding Window)
      redis.call('zremrangebyscore', key, '-inf', threeSecondsAgo)

      -- 2. 현재 개수 확인
      local count = redis.call('zcard', key)

      -- 3. 5개 이상이면 차단
      if count >= maxCount then
        return 0
      end

      -- 4. 통과 시 타임스탬프 추가
      redis.call('zadd', key, now, tostring(now))
      redis.call('expire', key, ttl)

      return 1
    `;

    try {
      const result = await client.eval(
        luaScript,
        1, // KEYS 개수
        key, // KEYS[1]
        now.toString(), // ARGV[1]
        threeSecondsAgo.toString(), // ARGV[2]
        maxCount.toString(), // ARGV[3]
        ttl.toString(), // ARGV[4]
      );

      if (result === 0) {
        this.logger.warn(
          `[Rate Limit] ${participantId} (${roomId}) - ${ttl}초당 ${maxCount}개 초과`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`[Rate Limit 체크 실패] ${participantId}`, error);
      // 에러 시 통과 (서비스 가용성 우선)
      return true;
    }
  }

  /**
   * sync_chat Rate Limiting 체크 (30초당 10개) - Sliding Window + Lua 스크립트
   *
   * 정상 시나리오: 재연결 시 1회 호출 (몇 분에 한 번)
   * 네트워크 불안정: 30초에 최대 10번까지 허용
   * 악의적 시나리오: 초당 수백 회 호출 방지
   *
   * Redis 구조:
   * - 키: room:{roomId}:ratelimit:sync:{participantId}
   * - 타입: ZSET
   * - Score/Member: 타임스탬프
   * - TTL: 30초
   */
  async checkSyncRateLimit(roomId: string, participantId: string): Promise<boolean> {
    const key = `room:${roomId}:ratelimit:sync:${participantId}`;
    const client = this.redisService.getClient();
    const now = Date.now();

    const thirtySecondsAgo = now - CHAT_POLICY.SYNC_LIMIT.WINDOW_MS;
    const maxRequests = CHAT_POLICY.SYNC_LIMIT.MAX_REQUESTS;
    const ttl = Math.ceil(CHAT_POLICY.SYNC_LIMIT.WINDOW_MS / 1000);

    // Lua 스크립트: 원자적으로 실행되면서 Race Condition 완전 방지
    const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local thirtySecondsAgo = tonumber(ARGV[2])
      local maxRequests = tonumber(ARGV[3])
      local ttl = tonumber(ARGV[4])

      -- 1. 30초 이전 데이터 삭제 (Sliding Window)
      redis.call('zremrangebyscore', key, '-inf', thirtySecondsAgo)

      -- 2. 현재 개수 확인
      local count = redis.call('zcard', key)

      -- 3. 10개 이상이면 차단
      if count >= maxRequests then
        return 0
      end

      -- 4. 통과 시 타임스탬프 추가
      redis.call('zadd', key, now, tostring(now))
      redis.call('expire', key, ttl)

      return 1
    `;

    try {
      const result = await client.eval(
        luaScript,
        1, // KEYS 개수
        key, // KEYS[1]
        now.toString(), // ARGV[1]
        thirtySecondsAgo.toString(), // ARGV[2]
        maxRequests.toString(), // ARGV[3]
        ttl.toString(), // ARGV[4]
      );

      if (result === 0) {
        this.logger.warn(
          `[Sync Rate Limit] ${participantId} (${roomId}) - ${ttl}초당 ${maxRequests}개 초과`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`[Sync Rate Limit 체크 실패] ${participantId}`, error);
      // 에러 시 통과 (서비스 가용성 우선)
      return true;
    }
  }
}
