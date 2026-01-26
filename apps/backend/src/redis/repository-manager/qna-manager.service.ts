import { Injectable } from '@nestjs/common';
import { Answer, Qna } from '@plum/shared-interfaces';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { TTL_BOUNDS } from '../redis.constants.js';
import { RedisService } from '../redis.service.js';
import { BaseRedisRepository } from './base-redis.repository.js';

@Injectable()
export class QnaManagerService extends BaseRedisRepository<Qna> {
  protected readonly keyPrefix = 'qna:';

  constructor(
    redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(redisService, QnaManagerService.name);
  }

  // --- Key Generators ---

  /**
   * 강의실에 속한 질문 집계용 키
   */
  private getPollListKey(roomId: string): string {
    return `room:${roomId}:qna`;
  }

  /**
   * 활성화된 질문 확인용 키
   */
  private getActiveKey(roomId: string): string {
    return `${this.keyPrefix}${roomId}:active`;
  }

  /**
   * 질문 답변 전용 키
   */
  private getAnswerListKey(qnaId: string): string {
    return `${this.keyPrefix}${qnaId}:answers`;
  }

  /**
   * 답변 중복 검사용 키
   */
  private getAnswererSetKey(qnaId: string): string {
    return `${this.keyPrefix}${qnaId}:answerers`;
  }

  /**
   * 질문 정보 등록
   */
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

  /**
   * 질문 정보 조회
   */
  async getQnasInRoom(roomId: string): Promise<Qna[]> {
    const client = this.redisService.getClient();
    const listKey = this.getPollListKey(roomId);
    const pollIds = await client.lrange(listKey, 0, -1);

    if (!pollIds || pollIds.length === 0) return [];

    return await this.findMany(pollIds);
  }

  /**
   * 질문 시작
   */
  async startQna(
    qnaId: string,
    timeLimit: number,
  ): Promise<{ startedAt: string; endedAt: string }> {
    const client = this.redisService.getClient();
    const activeKey = this.getActiveKey(qnaId);

    const qna = await this.findOne(qnaId);
    if (!qna) throw new Error('Qna does not exist');

    const now = new Date();
    const startedAt = now.toISOString();
    const endedAt = timeLimit > 0 ? new Date(now.getTime() + timeLimit * 1000).toISOString() : '';

    try {
      const pipeline = client.pipeline();
      this.addUpdatePartialToPipeline(pipeline, qnaId, {
        status: 'active',
        startedAt,
        endedAt,
        updatedAt: startedAt,
      });
      pipeline.set(activeKey, 'true', 'EX', timeLimit || TTL_BOUNDS); // 좀비 데이터를 방지

      const results = await pipeline.exec();

      const hasError = results?.some(([err]) => err !== null);
      if (hasError) throw new Error('Pipeline execution failed');

      this.logger.log(`[StartQna] Success: ${qnaId} for ${timeLimit}s`);
      return { startedAt, endedAt };
    } catch (error) {
      this.logger.error(`[StartQna] Failed: ${qnaId}. Rolling back...`, error.stack);

      try {
        const rollbackPipeline = client.pipeline();

        this.addUpdatePartialToPipeline(rollbackPipeline, qnaId, {
          status: 'pending',
          startedAt: '',
          endedAt: '',
          updatedAt: new Date().toISOString(),
        });
        rollbackPipeline.del(activeKey);
        await rollbackPipeline.exec();
      } catch (rollbackError) {
        this.logger.error(`[CRITICAL] StartQna rollback failed: ${qnaId}`, rollbackError.stack);
      }
      throw error;
    }
  }

  /**
   * 응답 집계
   */
  async submitAnswer(
    qnaId: string,
    participantId: string,
    participantName: string,
    text: string,
  ): Promise<{ count: number }> {
    const client = this.redisService.getClient();
    const activeKey = this.getActiveKey(qnaId);
    const answerKey = this.getAnswerListKey(qnaId);
    const answererKey = this.getAnswererSetKey(qnaId);

    const isActive = await client.exists(activeKey);
    if (!isActive) {
      this.logger.warn(
        `[SubmitAnswer] Reject: Qna ${qnaId} is not active. Participant: ${participantId}`,
      );
      throw new Error('Qna is not active');
    }

    const newAnswerer = await client.sadd(answererKey, participantId);
    if (newAnswerer === 0) {
      this.logger.warn(
        `[SubmitAnswer] Reject: Duplicate answer attempt. Qna: ${qnaId}, Participant: ${participantId}`,
      );
      throw new Error('Duplicate answer attempt');
    }

    const answer = JSON.stringify({ participantId, participantName, text });

    try {
      const count = await client.rpush(answerKey, answer);
      await client.expire(answererKey, TTL_BOUNDS);

      this.logger.log(`[SubmitAnswer] Success: Qna ${qnaId}, Participant ${participantId}`);

      return { count };
    } catch (error) {
      this.logger.error(`[SubmitAnswer] Error: Qna ${qnaId}. Rollback executed.`, error.stack);
      await client.srem(answererKey, participantId);
      throw error;
    }
  }

  /**
   * 진행 중 질문의 응답 목록 조회
   */
  async getActiveAnswers(qnaId: string): Promise<Answer[]> {
    const client = this.redisService.getClient();
    const answerKey = this.getAnswerListKey(qnaId);

    const rawAnswers = (await client.lrange(answerKey, 0, -1)) || [];
    return rawAnswers.map((raw) => JSON.parse(raw));
  }

  /**
   * 특정 참가자가 질문에 답변했는지 여부
   */
  async hasAnswered(qnaId: string, participantId: string): Promise<boolean> {
    const client = this.redisService.getClient();
    const answererKey = this.getAnswererSetKey(qnaId);

    const result = await client.sismember(answererKey, participantId);
    return result === 1;
  }

  /**
   * 질문 종료
   */
  async closeQna(qnaId: string): Promise<Answer[]> {
    const client = this.redisService.getClient();
    const activeKey = this.getActiveKey(qnaId);
    const answerKey = this.getAnswerListKey(qnaId);
    const answererKey = this.getAnswererSetKey(qnaId);

    const qna: Qna | null = await this.findOne(qnaId);
    if (!qna) {
      throw new Error('Qna not found');
    }

    const now = new Date().toISOString();

    try {
      const pipeline = client.pipeline();
      pipeline.del(activeKey);
      pipeline.lrange(answerKey, 0, -1);

      const results = await pipeline.exec();
      if (!results || results.some(([err]) => err !== null)) throw new Error('Close failed');

      const rawAnswers = (results[1][1] as string[]) || [];
      const answers: Answer[] = rawAnswers.map((raw) => JSON.parse(raw));

      await this.updatePartial(qnaId, {
        status: 'ended',
        answers,
        endedAt: now,
        updatedAt: now,
      });

      await client.del(answererKey);

      this.logger.log(`[CloseQna] Successfully closed: ${qnaId}, Total answers: ${answers.length}`);
      return answers;
    } catch (error) {
      this.logger.error(`[CloseQna] Failed to close qna ${qnaId}`, error.stack);
      throw error;
    }
  }

  /**
   * 이미 종료된 질문의 결과를 조회 (저장된 answers 배열 반환)
   */
  async getFinalResults(qnaId: string): Promise<Answer[]> {
    const qna = await this.findOne(qnaId);
    if (!qna || qna.status !== 'ended' || !qna.answers) return [];

    return qna.answers;
  }

  @OnEvent('redis.expired.qna')
  async handleQnaAutoClose(key: string) {
    const parts = key.split(':');

    // 마지막 요소가 active인 경우에만 처리 (Shadow Key 역할)
    if (parts[parts.length - 1] !== 'active') return;

    const qnaId = parts[1];

    const qna = await this.findOne(qnaId);
    if (!qna || qna.status === 'ended') return;

    this.logger.log(`[Redis Expiry] 질문 ID: ${qnaId} 시간 만료됨`);

    try {
      const finalResults = await this.closeQna(qnaId);

      this.eventEmitter.emit('qna.autoClosed', {
        qnaId,
        answers: finalResults,
      });
    } catch (error) {
      this.logger.error(`[AutoClose Error] ${qnaId}: ${error.message}`);
    }
  }
}
