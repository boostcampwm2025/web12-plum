import { Injectable, Logger } from '@nestjs/common';
import { ChatMessage } from '@plum/shared-interfaces';
import { RedisService } from '../redis.service.js';

/**
 * ChatManagerService
 *
 * - 채팅 메시지 Redis 저장/조회
 * - messageId 생성 (시간순 정렬이 가능하고 충돌 방지)
 * - Rate Limiting (3초당 5개)
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
   * 1706345678901-a1b2c3d4
   *
   * - timestamp: 시간순 정렬 가능 (클라이언트 정렬용)
   * - random: 동일 밀리초 충돌 방지
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
   * - 타입: ZSET (Sorted Set)
   * - Score: timestamp (밀리초)
   * - Member: JSON 문자열
   *
   * ZSET 장점:
   * - timestamp 기반 범위 조회 O(log(n) + m)
   * - 자동 정렬 (score 기준)
   * - ZREMRANGEBYRANK로 개수 제한
   */
  async saveMessage(roomId: string, message: ChatMessage): Promise<void> {
    const key = `room:${roomId}:chat`;
    const client = this.redisService.getClient();

    try {
      const messageJson = JSON.stringify(message);

      // Pipeline으로 원자적 실행
      const pipeline = client.pipeline();
      pipeline.zadd(key, message.timestamp, messageJson); // score = timestamp
      pipeline.zremrangebyrank(key, 0, -1001); // 최대 1000개 유지 (오래된 것부터 삭제)
      pipeline.expire(key, 7200); // TTL 2시간

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
   * - 정렬 불필요 (ZSET가 자동 정렬 해줌
   *
   * - lastMessageId: 1706345678901-abc
   * - lastTimestamp: 1706345678901
   * - ZRANGEBYSCORE room:r123:chat (1706345678901 +inf
   * 그럼 timestamp > 1706345678901인 메시지들 (자동 정렬)
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
   * Rate Limiting 체크 (3초당 5개) - Sliding Window
   *
   * Redis 구조:
   * - 키: room:{roomId}:ratelimit:chat:{participantId}
   * - 타입: ZSET
   * - Score/Member: 타임스탬프 (밀리초)
   * - TTL: 3초
   *
   * Sliding Window 방식:
   * - 정확한 3초 윈도우 (윈도우 경계 문제 없음)
   * - ZREMRANGEBYSCORE로 오래된 데이터 자동 삭제
   * - ZCARD로 현재 개수 확인
   *
   * - 2.9초: 5개 메시지
   * - 3.1초: 6번째 메시지 시도
   * - 0.2초 간격이지만 3초 윈도우 내 6개 → 차단됨
   */
  async checkRateLimit(roomId: string, participantId: string): Promise<boolean> {
    const key = `room:${roomId}:ratelimit:chat:${participantId}`;
    const client = this.redisService.getClient();
    const now = Date.now();
    const threeSecondsAgo = now - 3000;

    try {
      // Pipeline으로 원자적 실행
      const pipeline = client.pipeline();

      // 1. 3초 이전 데이터 삭제 (Sliding Window!)
      pipeline.zremrangebyscore(key, '-inf', threeSecondsAgo);

      // 2. 현재 타임스탬프 추가
      pipeline.zadd(key, now, now.toString());

      // 3. 현재 개수 확인
      pipeline.zcard(key);

      // 4. TTL 설정
      pipeline.expire(key, 3);

      const results = await pipeline.exec();

      // zcard 결과 추출 (3번째 명령어)
      const count = (results?.[2]?.[1] as number) || 0;

      // 5. 5개 초과 시 차단
      if (count > 5) {
        this.logger.warn(
          `[Rate Limit] ${participantId} (${roomId}) - 3초당 5개 초과 (현재: ${count}개)`,
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
}
