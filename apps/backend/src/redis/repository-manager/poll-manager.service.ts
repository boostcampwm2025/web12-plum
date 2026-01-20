import { Injectable } from '@nestjs/common';
import { Poll } from '@plum/shared-interfaces';
import { RedisService } from '../redis.service.js';
import { BaseRedisRepository } from './base-redis.repository.js';

@Injectable()
export class PollManagerService extends BaseRedisRepository<Poll> {
  protected readonly keyPrefix = 'poll:';

  constructor(redisService: RedisService) {
    super(redisService, PollManagerService.name);
  }

  private getPollListKey(roomId: string): string {
    return `room:${roomId}:polls`;
  }

  private getActiveKey(pollId: string): string {
    return `${this.keyPrefix}${pollId}:active`;
  }

  /**
   * 투표 정보 등록
   */
  async addPollToRoom(roomId: string, polls: Poll[]): Promise<void> {
    const client = this.redisService.getClient();
    const listKey = this.getPollListKey(roomId);

    try {
      const pipeline = client.pipeline();
      polls.forEach((poll) => {
        this.addSaveToPipeline(pipeline, poll.id, poll);
        pipeline.rpush(listKey, poll.id);
      });
      const results = await pipeline.exec();

      const hasError = results?.some(([err]) => err !== null);
      if (hasError) throw new Error('Pipeline execution failed partly');

      this.logger.log(`[AddPollToRoom] Successfully added ${polls.length} polls to room ${roomId}`);
    } catch (error) {
      this.logger.error(
        `[AddPollToRoom] Failed to add polls to room ${roomId}. Starting rollback...`,
        error.stack,
      );

      // 롤백 실행
      try {
        const cleanupPipeline = client.pipeline();

        polls.forEach((poll) => {
          this.addDeleteToPipeline(cleanupPipeline, poll.id);
          cleanupPipeline.lrem(listKey, 0, poll.id);
        });

        await cleanupPipeline.exec();
        this.logger.log(`[AddPollToRoom] Rollback completed for ${polls.length} polls`);
      } catch (rollbackError) {
        this.logger.error(
          `[CRITICAL] Rollback failed for roomId ${roomId}. Manual cleanup may be required.`,
          rollbackError.stack,
        );
      }

      throw error;
    }
  }

  /**
   * 투표 정보 조회
   */
  async getPollsInRoom(roomId: string): Promise<Poll[]> {
    const client = this.redisService.getClient();
    const listKey = this.getPollListKey(roomId);
    const pollIds = await client.lrange(listKey, 0, -1);

    if (!pollIds || pollIds.length === 0) return [];

    return await this.findMany(pollIds);
  }

  /**
   * 투표 시작
   */
  async startPoll(
    pollId: string,
    timeLimit: number,
  ): Promise<{ startedAt: string; endedAt: string }> {
    const client = this.redisService.getClient();
    const activeKey = this.getActiveKey(pollId);

    const now = new Date();
    const startedAt = now.toISOString();
    const endedAt = new Date(now.getTime() + timeLimit * 1000).toISOString();

    try {
      const pipeline = client.pipeline();

      this.addUpdatePartialToPipeline(pipeline, pollId, {
        status: 'active',
        startedAt,
        endedAt,
        updatedAt: startedAt,
      });
      pipeline.set(activeKey, 'true', 'EX', timeLimit);

      const results = await pipeline.exec();

      const hasError = results?.some(([err]) => err !== null);
      if (hasError) throw new Error('Pipeline execution failed');

      this.logger.log(`[StartPoll] Success: ${pollId} for ${timeLimit}s`);
      return { startedAt, endedAt };
    } catch (error) {
      this.logger.error(`[StartPoll] Failed: ${pollId}. Rolling back...`, error.stack);

      try {
        const rollbackPipeline = client.pipeline();

        this.addUpdatePartialToPipeline(rollbackPipeline, pollId, { status: 'pending' });
        rollbackPipeline.del(activeKey);

        await rollbackPipeline.exec();
      } catch (rollbackError) {
        this.logger.error(`[CRITICAL] StartPoll rollback failed: ${pollId}`, rollbackError.stack);
      }
      throw error;
    }
  }
}
