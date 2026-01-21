import { Injectable } from '@nestjs/common';
import { Qna } from '@plum/shared-interfaces';
import { RedisService } from '../redis.service.js';
import { BaseRedisRepository } from './base-redis.repository.js';

@Injectable()
export class QnaManagerService extends BaseRedisRepository<Qna> {
  protected readonly keyPrefix = 'qna:';

  constructor(redisService: RedisService) {
    super(redisService, QnaManagerService.name);
  }

  // --- Key Generators ---

  /**
   * 강의실에 속한 질문 집계용 키
   */
  private getPollListKey(roomId: string): string {
    return `room:${roomId}:qna`;
  }

  async addQnaToRoom(roomId: string, qnas: Qna[]): Promise<void> {
    const client = this.redisService.getClient();
    const listKey = this.getPollListKey(roomId);

    try {
      const pipeline = client.pipeline();
      qnas.forEach((qna) => {
        this.addSaveToPipeline(pipeline, qna.id, qna);
        pipeline.rpush(listKey, qna.id);
      });
      const results = await pipeline.exec();

      const hasError = results?.some(([err]) => err !== null);
      if (hasError) throw new Error('Pipeline execution failed partly');

      this.logger.log(`[AddQnaToRoom] Successfully added ${qnas.length} qnas to room ${roomId}`);
    } catch (error) {
      this.logger.error(
        `[AddQnaToRoom] Failed to add qnas to room ${roomId}. Starting rollback...`,
        error.stack,
      );

      // 롤백 실행
      try {
        const cleanupPipeline = client.pipeline();

        qnas.forEach((qna) => {
          this.addDeleteToPipeline(cleanupPipeline, qna.id);
          cleanupPipeline.lrem(listKey, 0, qna.id);
        });

        await cleanupPipeline.exec();
        this.logger.log(`[AddQnaToRoom] Rollback completed for ${qnas.length} qnas`);
      } catch (rollbackError) {
        this.logger.error(
          `[CRITICAL] Rollback failed for roomId ${roomId}. Manual cleanup may be required.`,
          rollbackError.stack,
        );
      }

      throw error;
    }
  }
}
