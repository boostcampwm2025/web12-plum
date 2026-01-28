import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ActivityType,
  CHAT_POLICY,
  PENALTY_LIMIT,
  RANK_LIMIT,
  RankItem,
  SCORE_RULES,
} from '@plum/shared-interfaces';
import { RedisService } from '../redis.service.js';
import { ParticipantManagerService } from './participant-manager.service.js';

@Injectable()
export class ActivityScoreManagerService {
  private readonly logger = new Logger(ActivityScoreManagerService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly participantManagerService: ParticipantManagerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private getPriorityScore(): number {
    return (2524608000000 - Date.now()) / 1000000000000;
  }

  /**
   * 입장 시 점수 업데이트
   * @param roomId 방 ID
   * @param participantId 참가자 ID
   */
  async initializeParticipantScore(roomId: string, participantId: string) {
    const zsetKey = `room:${roomId}:scores`;
    // 초기 입장 시점에도 우선순위 계산 (0점 + 소수점 타임스탬프)
    const priority = this.getPriorityScore();
    await this.redisService.getClient().zadd(zsetKey, priority, participantId);
  }

  /**
   * 활동에 따른 점수 및 카운트 업데이트
   * @param server Socket.IO Server 인스턴스
   * @param roomId 방 ID
   * @param participantId 참가자 ID
   * @param activity 활동 타입
   */
  async updateScore(roomId: string, participantId: string, activity: ActivityType): Promise<void> {
    const scoreToAdd = SCORE_RULES[activity];
    const zsetKey = `room:${roomId}:scores`; // 랭킹용 ZSET Key
    const statsKey = `room:${roomId}:stats:${participantId}`; // 통계용 Hash Key
    const client = this.redisService.getClient();

    try {
      // [랭킹용] Redis ZSET 점수 증가
      const currentScoreWithFraction = await client.zscore(zsetKey, participantId);
      let currentPureScore = 0;

      if (currentScoreWithFraction) {
        // 소수점 아래를 버리고 정수 점수만 추출
        currentPureScore = Math.floor(parseFloat(currentScoreWithFraction));
      }
      const newPureScore = currentPureScore + scoreToAdd;

      // 타임스탬프를 소수점으로 변환 (값이 작을수록 최신이므로 역산 필요) => 동점인 경우 우선 점수 획득자가 상위
      // 2100년을 기준으로 현재 시간을 빼서 소수점 생성 (점점 작아지게)
      const priority = this.getPriorityScore();
      const finalScore = newPureScore + priority;
      await this.redisService.getClient().zadd(zsetKey, finalScore, participantId);

      // [통계용] 별도 Hash Key에 카운트 증가 (Pipeline 사용)
      const pipeline = this.redisService.getClient().pipeline();

      // 총 점수 누적
      pipeline.hincrby(statsKey, 'participationScore', scoreToAdd);

      // 활동별 횟수 누적
      switch (activity) {
        case 'gesture':
          pipeline.hincrby(statsKey, 'gestureCount', 1);
          break;
        case 'chat':
          pipeline.hincrby(statsKey, 'chatCount', 1);
          break;
        case 'vote':
        case 'vote_gesture':
          pipeline.hincrby(statsKey, 'voteCount', 1);
          break;
        case 'qna_answer':
          pipeline.hincrby(statsKey, 'answerCount', 1);
      }

      await pipeline.exec();

      const result = await client.hget(statsKey, 'penaltyCount');
      const penaltyCount = parseInt(result || '0', 10);

      // 참가자에게 점수 업데이트 이벤트 발행
      this.eventEmitter.emit('activity.score.updated', {
        roomId,
        participantId,
        score: newPureScore,
        penaltyCount,
        reason: activity,
      });

      // 랭킹 정보는 매번 계산해서 전송
      const top = await this.getTopRankings(roomId, RANK_LIMIT);
      const lowest = await this.getLowest(roomId);
      this.eventEmitter.emit('activity.rank.changed', {
        roomId,
        top,
        lowest,
      });
    } catch (error) {
      this.logger.error(`점수 업데이트 실패: ${error.message}`, error.stack);
    }
  }

  /**
   * 도배 발생 시 패널티 부여
   * @param roomId 방 ID
   * @param participantId 참가자 ID
   */
  async applyPenalty(roomId: string, participantId: string): Promise<void> {
    const zsetKey = `room:${roomId}:scores`;
    const statsKey = `room:${roomId}:stats:${participantId}`;

    try {
      const client = this.redisService.getClient();
      const newPenaltyCount = await client.hincrby(statsKey, 'penaltyCount', 1);

      const isCritical = newPenaltyCount > PENALTY_LIMIT;
      const penaltyScore = CHAT_POLICY.PENALTY.DEDUCTION_PER_VIOLATION || 50;
      const priority = this.getPriorityScore();

      const pipeline = client.pipeline();

      if (isCritical) {
        // 💥 [임계치 초과] 점수 전체 초기화
        pipeline.zadd(zsetKey, priority, participantId);
        pipeline.hset(statsKey, 'participationScore', 0);
        this.logger.warn(
          `[CRITICAL PENALTY] ${participantId} 점수 초기화 (횟수: ${newPenaltyCount})`,
        );
      } else {
        // ⚠️ [일반 도배] 설정된 벌점만큼 차감
        const currentWithFraction = await client.zscore(zsetKey, participantId);
        const currentPureScore = currentWithFraction
          ? Math.floor(parseFloat(currentWithFraction))
          : 0;

        const newPureScore = Math.max(0, currentPureScore - penaltyScore);
        const finalScore = newPureScore + priority;

        // Redis 업데이트
        pipeline.zadd(zsetKey, finalScore, participantId);
        pipeline.hincrby(statsKey, 'participationScore', -penaltyScore);
        this.logger.log(
          `[PENALTY] ${participantId} -${penaltyScore}점 (누적: ${newPenaltyCount}회)`,
        );
      }

      await pipeline.exec();
      const newScore = await this.getParticipantScore(roomId, participantId);
      this.eventEmitter.emit('activity.score.updated', {
        roomId,
        participantId,
        score: newScore,
        penaltyCount: newPenaltyCount,
        reason: isCritical ? 'critical_penalty' : 'penalty',
      });

      // 랭킹 변경 이벤트 전송 (점수가 깎였으니 순위가 변함)
      const top = await this.getTopRankings(roomId, RANK_LIMIT);
      const lowest = await this.getLowest(roomId);
      this.eventEmitter.emit('activity.rank.changed', { roomId, top, lowest });
    } catch (error) {
      this.logger.error(`패널티 적용 실패: ${error.message}`, error.stack);
    }
  }

  /**
   * 상위 N명 랭킹 조회
   * @param roomId 방 ID
   * @param limit 조회할 랭킹 수
   * @returns 랭킹 아이템 배열
   */
  async getTopRankings(roomId: string, limit: number): Promise<RankItem[]> {
    const zsetKey = `room:${roomId}:scores`;
    // 점수 높은 순으로 조회 (Member, Score, Member, Score ... 형태)
    const rawResult = await this.redisService
      .getClient()
      .zrevrange(zsetKey, 0, limit - 1, 'WITHSCORES');

    const result: RankItem[] = [];
    for (let i = 0; i < rawResult.length; i += 2) {
      const pId = rawResult[i];
      const score = parseFloat(rawResult[i + 1]);

      const participant = await this.participantManagerService.findOne(pId);
      const name = participant ? participant.name : '알 수 없음';

      result.push({
        rank: i / 2 + 1,
        participantId: pId,
        name,
        score,
      });
    }

    return result;
  }

  /**
   * 특정 참가자의 현재 점수 조회
   * @param roomId 방 ID
   * @param participantId 참가자 ID
   */
  async getParticipantScore(roomId: string, participantId: string): Promise<number> {
    const zsetKey = `room:${roomId}:scores`;
    const scoreWithFraction = await this.redisService.getClient().zscore(zsetKey, participantId);

    if (!scoreWithFraction) {
      return 0;
    }

    return Math.floor(parseFloat(scoreWithFraction));
  }

  /**
   * 최하위 점수 조회
   * @param roomId 방 ID
   * @returns 최하위 점수
   */
  async getLowest(roomId: string): Promise<RankItem | null> {
    const zsetKey = `room:${roomId}:scores`;
    // 전체 참가자 수 조회
    const totalParticipants = await this.redisService.getClient().zcard(zsetKey);
    if (totalParticipants <= RANK_LIMIT) return null;

    // 점수가 가장 낮은 1명 조회 (zrange는 오름차순이므로 0번이 최하위)
    const result = await this.redisService.getClient().zrange(zsetKey, 0, 0, 'WITHSCORES');
    if (result.length > 1) {
      const [pId, score] = result;
      const participant = await this.participantManagerService.findOne(pId);
      return {
        rank: totalParticipants,
        participantId: pId,
        name: participant ? participant.name : '알 수 없음',
        score: Math.floor(parseFloat(score)),
      };
    }
    return null;
  }

  /**
   * 방 정보 만료 시 점수 데이터 삭제
   * @param roomId 방 ID
   */
  async clearScores(roomId: string) {
    const zsetKey = `room:${roomId}:scores`;
    const statsKeys = await this.redisService.getClient().keys(`room:${roomId}:stats:*`); // 모든 참가자의 stats 키 조회

    const pipeline = this.redisService.getClient().pipeline();
    pipeline.del(zsetKey); // ZSET 삭제
    if (statsKeys.length > 0) {
      pipeline.del(...statsKeys); // 모든 stats Hash 키 삭제
    }
    await pipeline.exec();
    this.logger.log(`[Score] ${roomId} 방의 모든 점수 데이터 정리 완료`);
  }
}
