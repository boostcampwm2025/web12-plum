import { ConflictException, Injectable } from '@nestjs/common';
import { Participant, Room } from '@plum/shared-interfaces';
import { RedisService } from '../redis.service.js';
import { BaseRedisRepository } from './base-redis.repository.js';
import { ParticipantManagerService } from './participant-manager.service.js';
import { PollManagerService } from './poll-manager.service.js';
import { QnaManagerService } from './qna-manager.service.js';
import { ActivityScoreManagerService } from './activity-score-manager.service.js';
import { OnEvent } from '@nestjs/event-emitter';

/**
 * 강의실 데이터 관리
 */
@Injectable()
export class RoomManagerService extends BaseRedisRepository<Room> {
  protected readonly keyPrefix = 'room:';

  constructor(
    redisService: RedisService,
    private readonly participantManager: ParticipantManagerService,
    private readonly pollManager: PollManagerService,
    private readonly qnaManager: QnaManagerService,
    private readonly activityScoreManager: ActivityScoreManagerService,
  ) {
    super(redisService, RoomManagerService.name);
  }

  /**
   * 단순히 이름 존재 여부만 확인
   * @returns 사용 가능하면 true, 중복이면 false
   */
  async isNameAvailable(roomId: string, name: string): Promise<boolean> {
    const client = this.redisService.getClient();
    const nameKey = `${this.keyPrefix}${roomId}:names`; // prefix 일관성 유지

    const exists = await client.sismember(nameKey, name);
    return exists === 0;
  }

  /**
   * 참가자 추가 및 이름 선점
   */
  async addParticipant(roomId: string, participant: Participant): Promise<void> {
    const client = this.redisService.getClient();
    const nameKey = `room:${roomId}:names`;
    const listKey = `room:${roomId}:participants`;

    // 1. 이름 선점 (Atomic)
    const isNewName = await client.sadd(nameKey, participant.name);
    if (isNewName === 0) {
      throw new ConflictException(`Name "${participant.name}" is already taken.`);
    }

    try {
      const pipeline = client.pipeline();
      this.participantManager.addSaveToPipeline(pipeline, participant.id, participant);
      pipeline.sadd(listKey, participant.id);

      await pipeline.exec();
      this.logger.log(
        `[AddParticipant] ${participant.name} (${participant.id}) joined room ${roomId}`,
      );
    } catch (error) {
      this.logger.error(`[AddParticipant] Main logic failed. Starting rollback...`, error.stack);
      try {
        // 롤백 실행
        const cleanupPipeline = client.pipeline();
        cleanupPipeline.srem(nameKey, participant.name);
        cleanupPipeline.srem(listKey, participant.id);
        this.participantManager.addDeleteToPipeline(cleanupPipeline, participant.id);

        await cleanupPipeline.exec();
        this.logger.log(`[AddParticipant] Rollback completed for ${participant.name}`);
      } catch (rollbackError) {
        this.logger.error(
          `[CRITICAL] Rollback failed for ${participant.name}. Manual cleanup may be required.`,
          rollbackError.stack,
        );
      }
      throw error;
    }
  }

  /**
   * 참가자 정보 조회
   */
  async getParticipantsInRoom(roomId: string): Promise<Participant[]> {
    const client = this.redisService.getClient();
    const listKey = `room:${roomId}:participants`;

    const pIds = await client.smembers(listKey);
    if (pIds.length === 0) return [];

    return await this.participantManager.findMany(pIds);
  }

  /**
   * 퇴장 처리 (참가자 정보 조회 후 안전하게 삭제)
   */
  async removeParticipant(roomId: string, participantId: string): Promise<void> {
    const client = this.redisService.getClient();

    const participant = await this.participantManager.findOne(participantId);
    if (!participant) return;

    const nameKey = `${this.keyPrefix}${roomId}:names`;
    const listKey = `${this.keyPrefix}${roomId}:participants`;

    const pipeline = client.pipeline();
    pipeline.srem(nameKey, participant.name);
    pipeline.srem(listKey, participantId);

    await pipeline.exec();
    this.logger.log(
      `[RemoveParticipant] ${participant.name} (${participantId}) left room ${roomId}`,
    );
  }

  async clearAllRoomData(roomId: string) {
    const client = this.redisService.getClient();
    const participantIds = await client.smembers(`room:${roomId}:participants`);

    const pipeline = client.pipeline();
    participantIds.forEach((id) => pipeline.del(`participant:${id}`));

    await Promise.all([
      this.pollManager.addClearToPipeline(pipeline, roomId),
      this.qnaManager.addClearToPipeline(pipeline, roomId),
      this.activityScoreManager.addClearToPipeline(pipeline, roomId),
    ]);

    const roomRelatedKeys = await client.keys(`*:${roomId}:*`);
    if (roomRelatedKeys.length > 0) {
      pipeline.del(...roomRelatedKeys);
    }

    await pipeline.exec();
    this.logger.log(`[Cleanup] Room ${roomId} resources cascadingly cleared.`);
  }

  @OnEvent('redis.expired.room')
  async handleRoomExpired(key: string) {
    const parts = key.split(':');
    if (parts[parts.length - 1] !== 'stats') return;

    const roomId = parts[1];
    this.logger.log(`[Room Expired] Room ${roomId} expired. Starting finalization...`);

    try {
      await this.clearAllRoomData(roomId);

      this.logger.log(`[Room Expired] Room ${roomId} cleanup completed.`);
    } catch (error) {
      this.logger.error(
        `[Room Expired] Cleanup failed for room ${roomId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
