import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis.service.js';
import { ChatLog } from '../../records/record.types.js';

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
      await redis.expire(key, 86400); // 마지막 추가 이후 + 24시간 이후 데이터 만료
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
        return `[${this.formatTime(log.startTime)}] ${log.speaker}: ${log.text}`;
      })
      .join('\n');
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
