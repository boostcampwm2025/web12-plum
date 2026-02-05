import { Injectable, Logger } from '@nestjs/common';
import { AiSummary } from '@plum/shared-interfaces';

import { RedisService } from '../redis.service.js';
import { MAX_TTL_BOUNDS } from '../redis.constants.js';

@Injectable()
export class AiSummaryManagerService {
  private readonly logger = new Logger(AiSummaryManagerService.name);

  constructor(private readonly redisService: RedisService) {}

  async setSummaryStatus(roomId: string, status: string) {
    const key = `room:${roomId}:summary:pending`;
    const client = this.redisService.getClient();
    await client.set(key, status, 'EX', MAX_TTL_BOUNDS);
  }

  async getSummaryStatus(roomId: string): Promise<string> {
    const key = `room:${roomId}:summary:pending`;
    const client = this.redisService.getClient();
    const status = await client.get(key);
    if (!status) return 'YET';
    return status;
  }

  async saveAiSummary(roomId: string, summary: AiSummary) {
    const key = `room:${roomId}:summary`;
    const client = this.redisService.getClient();
    const pipeline = client.pipeline();

    try {
      pipeline.set(key, JSON.stringify(summary));
      pipeline.expire(key, MAX_TTL_BOUNDS);
      await pipeline.exec();

      this.logger.log(`Save ai summary: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to save ai summary ${key}`, error.stack);
      throw error;
    }
  }

  async getAiSummary(roomId: string): Promise<AiSummary | null> {
    const key = `room:${roomId}:summary`;
    const client = this.redisService.getClient();

    const data = await client.get(key);
    return data ? (JSON.stringify(data) as unknown as AiSummary) : null;
  }
}
