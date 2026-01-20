import { Injectable } from '@nestjs/common';
import { Poll, UpdatePollStatusPayload } from '@plum/shared-interfaces';
import { RedisService } from '../redis.service.js';
import { BaseRedisRepository } from './base-redis.repository.js';

const TTL_BOUNDS = 7200;

@Injectable()
export class PollManagerService extends BaseRedisRepository<Poll> {
  protected readonly keyPrefix = 'poll:';

  constructor(redisService: RedisService) {
    super(redisService, PollManagerService.name);
  }

  // --- Key Generators ---

  /**
   * 강의실에 속한 투표 집계용 키
   */
  private getPollListKey(roomId: string): string {
    return `room:${roomId}:polls`;
  }

  /**
   * 활성화된 투표 확인용 키
   */
  private getActiveKey(pollId: string): string {
    return `${this.keyPrefix}${pollId}:active`;
  }

  /**
   * 투표 실시간 집계용
   */
  private getVoteCountKey(pollId: string): string {
    return `${this.keyPrefix}${pollId}:counts`;
  }

  /**
   * 투표 중복방지용
   */
  private getVoterKey(pollId: string): string {
    return `${this.keyPrefix}${pollId}:voters`;
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
    const countKey = this.getVoteCountKey(pollId);

    const poll = await this.findOne(pollId);
    if (!poll) throw new Error('Poll does not exist');

    const now = new Date();
    const startedAt = now.toISOString();
    const endedAt = new Date(now.getTime() + timeLimit * 1000).toISOString();

    try {
      const pipeline = client.pipeline();
      const initialCounts = poll.options.reduce(
        (acc, opt) => {
          acc[opt.id.toString()] = '0';
          return acc;
        },
        {} as Record<string, string>,
      );

      this.addUpdatePartialToPipeline(pipeline, pollId, {
        status: 'active',
        startedAt,
        endedAt,
        updatedAt: startedAt,
      });
      pipeline.set(activeKey, 'true', 'EX', timeLimit);
      pipeline.hset(countKey, initialCounts);
      pipeline.expire(countKey, timeLimit + TTL_BOUNDS); // 좀비 데이터를 방지하기 위해 넉넉한 TTL 부여

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
        rollbackPipeline.del(countKey);
        await rollbackPipeline.exec();
      } catch (rollbackError) {
        this.logger.error(`[CRITICAL] StartPoll rollback failed: ${pollId}`, rollbackError.stack);
      }
      throw error;
    }
  }

  /**
   * 투표 집계
   */
  async submitVote(
    pollId: string,
    participantId: string,
    optionId: number,
  ): Promise<Pick<UpdatePollStatusPayload, 'options'>> {
    const client = this.redisService.getClient();
    const activeKey = this.getActiveKey(pollId);
    const voterKey = this.getVoterKey(pollId);
    const countKey = this.getVoteCountKey(pollId);

    const isActive = await client.exists(activeKey);
    if (!isActive) {
      this.logger.warn(
        `[SubmitVote] Reject: Poll ${pollId} is not active. Participant: ${participantId}`,
      );
      throw new Error('Poll is not active');
    }

    const isNewVoter = await client.sadd(voterKey, participantId);
    if (isNewVoter === 0) {
      this.logger.warn(
        `[SubmitVote] Reject: Duplicate vote attempt. Poll: ${pollId}, Participant: ${participantId}`,
      );
      throw new Error('Duplicate vote attempt');
    }

    try {
      const pipeline = client.pipeline();
      pipeline.hincrby(countKey, optionId.toString(), 1);
      pipeline.expire(voterKey, TTL_BOUNDS);
      pipeline.hgetall(countKey);

      const results = await pipeline.exec();
      if (!results || results.some(([err]) => err !== null)) {
        throw new Error('Pipeline failed during voting');
      }

      const hgetallResult = results[2][1];
      if (!hgetallResult || typeof hgetallResult !== 'object') {
        throw new Error('Failed to retrieve count data');
      }

      const allCountsRaw = hgetallResult as Record<string, string>;
      const options = Object.entries(allCountsRaw)
        .map(([id, count]) => ({
          id: Number(id),
          count: Number(count),
        }))
        .sort((a, b) => a.id - b.id);

      this.logger.log(`[SubmitVote] Success: Poll ${pollId}, Participant ${participantId}`);

      return { options };
    } catch (error) {
      try {
        const rollbackPipeline = client.pipeline();
        rollbackPipeline.srem(voterKey, participantId);
        rollbackPipeline.hincrby(countKey, optionId.toString(), -1);

        await rollbackPipeline.exec();
      } catch (rollbackError) {
        this.logger.error(
          `[CRITICAL] SubmitVote rollback failed: ${pollId}. Participant: ${participantId}`,
          rollbackError.stack,
        );
      }

      this.logger.error(`[SubmitVote] Error: Poll ${pollId}. Rollback executed.`, error.stack);
      throw error;
    }
  }
}
