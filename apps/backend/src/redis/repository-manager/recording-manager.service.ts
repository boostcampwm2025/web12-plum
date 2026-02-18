import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis.service.js';
import { ChatLog } from '../../records/record.types.js';
import { MAX_TTL_BOUNDS } from '../redis.constants.js';

@Injectable()
export class RecordingManagerService {
  private readonly logger = new Logger(RecordingManagerService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * STT 결과를 Redis Sorted Set에 저장
   */
  async saveChatLog(chatLog: ChatLog) {
    const key = `room:${chatLog.roomId}:recordings`;
    const score = chatLog.startTime;
    const value = JSON.stringify(chatLog);
    const redis = this.redisService.getClient();

    try {
      await redis.zadd(key, score, value);
      await redis.expire(key, MAX_TTL_BOUNDS); // 마지막 추가 이후 + 24시간 이후 데이터 만료
      this.logger.log(`✅ [Redis] 기록 완료: ${chatLog.id}`);
    } catch (error) {
      this.logger.error(`❌ [Redis] 저장 실패: ${error.message}`);
    }
  }

  /**
   * 전체 스크립트 시간순 조회
   */
  async getFullTranscript(roomId: string): Promise<string> {
    const key = `room:${roomId}:recordings`;

    // 시간순(Score 기준)으로 전체 데이터 인출
    const rawLogs = await this.redisService.getClient().zrange(key, 0, -1);

    if (!rawLogs.length) return '';

    return rawLogs
      .map((logStr) => {
        const log: ChatLog = JSON.parse(logStr);
        const header = `[Spk: ${log.speaker} | Base: ${log.startTime}]`;
        const body = log.segments
          .map((s) => `${s.start.toFixed(1)} - ${s.end.toFixed(1)}: ${s.text}`)
          .join('\n');
        return `${header}\n${body}`;
      })
      .join('\n');
  }

  async incrementPendingCount(roomId: string): Promise<number> {
    const key = `room:${roomId}:recordings:pending`;
    const client = this.redisService.getClient();
    const count = await client.incr(key);
    await client.expire(key, 3600); // 1시간 뒤 자동 삭제(안전장치)
    return count;
  }

  async decrementPendingCount(roomId: string): Promise<number> {
    const key = `room:${roomId}:recordings:pending`;
    const client = this.redisService.getClient();
    const count = await client.decr(key);
    if (count < 0) await client.set(key, 0); // 음수 방지
    return count;
  }

  async getPendingCount(roomId: string): Promise<number> {
    const key = `room:${roomId}:recordings:pending`;
    const client = this.redisService.getClient();
    const count = await client.get(key);
    return count ? parseInt(count, 10) : 0;
  }
}
