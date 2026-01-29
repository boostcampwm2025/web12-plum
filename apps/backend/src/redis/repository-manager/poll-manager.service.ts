import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Poll, PollOption, UpdatePollStatusSubPayload, Voter } from '@plum/shared-interfaces';
import { RedisService } from '../redis.service.js';
import { TTL_BOUNDS } from '../redis.constants.js';
import { BaseRedisRepository } from './base-redis.repository.js';
import { ChainableCommander } from 'ioredis';

@Injectable()
export class PollManagerService extends BaseRedisRepository<Poll> {
  protected readonly keyPrefix = 'poll:';

  constructor(
    redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {
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
   * 투표 선택지별 현재 집계 수 조회
   */
  async getVoteCounts(pollId: string): Promise<Record<number, number>> {
    const client = this.redisService.getClient();
    const countKey = this.getVoteCountKey(pollId);
    const countsRaw = await client.hgetall(countKey);

    const counts: Record<number, number> = {};
    Object.entries(countsRaw || {}).forEach(([id, count]) => {
      const optionId = Number(id);
      if (!Number.isNaN(optionId)) {
        counts[optionId] = Number(count);
      }
    });

    return counts;
  }

  /**
   * 여러 투표의 집계 데이터를 한 번에 조회
   */
  async getMultiVoteCounts(pollIds: string[]): Promise<Record<string, Record<number, number>>> {
    if (pollIds.length === 0) return {};

    try {
      const client = this.redisService.getClient();
      const pipeline = client.pipeline();

      pollIds.forEach((id) => {
        pipeline.hgetall(this.getVoteCountKey(id));
      });

      const results = await pipeline.exec();
      if (!results) return {};

      const multiCounts: Record<string, Record<number, number>> = {};
      results.forEach((entry, index) => {
        if (!entry) return;

        const [err, rawData] = entry;
        if (err || !rawData) return;

        const pollId = pollIds[index];
        const counts: Record<number, number> = {};
        Object.entries(rawData as Record<string, string>).forEach(([optId, count]) => {
          const optionId = Number(optId);
          if (!Number.isNaN(optionId)) {
            counts[optionId] = Number(count);
          }
        });

        multiCounts[pollId] = counts;
      });

      return multiCounts;
    } catch (error) {
      this.logger.error('[getMultiVoteCounts] Failed to fetch vote counts', error.stack);
      return {};
    }
  }

  /**
   * 특정 참가자의 투표 선택지 조회
   */
  async getVotedOptionId(pollId: string, participantId: string): Promise<number | null> {
    const client = this.redisService.getClient();
    const voterKey = this.getVoterKey(pollId);
    const storedValue = await client.hget(voterKey, participantId);

    if (!storedValue) return null;

    const separatorIndex = storedValue.indexOf(':');
    const optionIdRaw =
      separatorIndex === -1 ? storedValue : storedValue.substring(0, separatorIndex);
    const optionId = Number(optionIdRaw);
    return Number.isNaN(optionId) ? null : optionId;
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
    const endedAt = timeLimit > 0 ? new Date(now.getTime() + timeLimit * 1000).toISOString() : '';

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
      pipeline.set(activeKey, 'true', 'EX', timeLimit || TTL_BOUNDS); // 좀비 데이터를 방지
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

        this.addUpdatePartialToPipeline(rollbackPipeline, pollId, {
          status: 'pending',
          startedAt: '',
          endedAt: '',
          updatedAt: new Date().toISOString(),
        });
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
    participantName: string,
    optionId: number,
  ): Promise<UpdatePollStatusSubPayload> {
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

    const isNewVoter = await client.hsetnx(
      voterKey,
      participantId,
      `${optionId}:${participantName}`,
    );
    if (isNewVoter === 0) {
      this.logger.warn(
        `[SubmitVote] Reject: Duplicate vote attempt. Poll: ${pollId}, Participant: ${participantId}`,
      );
      throw new Error('Duplicate vote attempt');
    }

    try {
      const pipeline = client.pipeline();
      pipeline.hincrby(countKey, optionId.toString(), 1);
      pipeline.hgetall(countKey);
      pipeline.expire(voterKey, TTL_BOUNDS);

      const results = await pipeline.exec();
      if (!results || results.some(([err]) => err !== null)) {
        throw new Error('Pipeline failed during voting');
      }

      const hgetallResult = results[1][1];
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

      return { pollId, options };
    } catch (error) {
      try {
        const rollbackPipeline = client.pipeline();
        rollbackPipeline.hdel(voterKey, participantId);
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

  /**
   * 투표 종료
   */
  async closePoll(pollId: string): Promise<PollOption[]> {
    const client = this.redisService.getClient();
    const activeKey = this.getActiveKey(pollId);
    const countKey = this.getVoteCountKey(pollId);
    const voterKey = this.getVoterKey(pollId);

    const poll: Poll | null = await this.findOne(pollId);
    if (!poll) throw new Error('Poll not found');

    const now = new Date().toISOString();

    try {
      const pipeline = client.pipeline();
      pipeline.hgetall(countKey);
      pipeline.hgetall(voterKey);
      pipeline.del(activeKey);

      const results = await pipeline.exec();
      if (!results || results.some(([err]) => err !== null)) throw new Error('Close failed');

      const countsRaw = (results[0][1] as Record<string, string>) || {};
      const votersRaw = (results[1][1] as Record<string, string>) || {};

      const voterGroups = new Map<number, Voter[]>();
      Object.entries(votersRaw).forEach(([pId, valueStr]) => {
        const separatorIndex = valueStr.indexOf(':');
        const oId = Number(valueStr.substring(0, separatorIndex));
        const pName = valueStr.substring(separatorIndex + 1);

        if (!voterGroups.has(oId)) voterGroups.set(oId, []);
        voterGroups.get(oId)!.push({ id: pId, name: pName });
      });

      const finalOptions: PollOption[] = poll.options.map((option) => ({
        ...option,
        count: Number(countsRaw[option.id.toString()] || 0),
        voters: voterGroups.get(option.id) || [],
      }));

      await this.updatePartial(pollId, {
        status: 'ended',
        options: finalOptions,
        endedAt: now,
        updatedAt: now,
      });
      this.logger.log(`[ClosePoll] Confirmed: ${pollId}`);
      return finalOptions;
    } catch (error) {
      this.logger.error(`[ClosePoll] Failed: ${pollId}`, error.stack);
      throw error;
    }
  }

  /**
   * 이미 종료된 투표의 결과를 조회 (저장된 options 배열 반환)
   */
  async getFinalResults(pollId: string): Promise<PollOption[]> {
    const poll = await this.findOne(pollId);
    if (!poll || poll.status !== 'ended' || !poll.options) return [];

    return poll.options;
  }

  @OnEvent('redis.expired.poll')
  async handlePollAutoClose(key: string) {
    const parts = key.split(':');
    if (parts[0] !== 'poll') return;

    // 마지막 요소가 active인 경우에만 처리 (Shadow Key 역할)
    if (parts[parts.length - 1] !== 'active') return;

    const pollId = parts[1];

    const poll = await this.findOne(pollId);
    if (!poll || poll.status === 'ended') return;

    this.logger.log(`[Redis Expiry] 투표 ID: ${pollId} 시간 만료됨`);

    try {
      const finalResults = await this.closePoll(pollId);

      this.eventEmitter.emit('poll.autoClosed', {
        pollId,
        results: finalResults,
      });
    } catch (error) {
      this.logger.error(`[AutoClose Error] ${pollId}: ${error.message}`);
    }
  }

  async addClearToPipeline(pipeline: ChainableCommander, roomId: string): Promise<void> {
    const pollIds = await this.redisService.getClient().smembers(this.getPollListKey(roomId));

    pollIds.forEach((id) => {
      pipeline.del(`${this.keyPrefix}${id}`); // 투표 상세 Hash
      pipeline.del(this.getActiveKey(id)); // 활성화 키
      pipeline.del(this.getVoteCountKey(id)); // 카운트
      pipeline.del(this.getVoterKey(id)); // 투표자 셋
    });

    pipeline.del(this.getPollListKey(roomId));
  }
}
