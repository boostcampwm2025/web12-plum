import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import {
  GetActivityScoreRank,
  PresenterScoreInfoPayload,
  RANK_LIMIT,
  RankItem,
  RankUpdatePayload,
  ScoreUpdatePayload,
} from '@plum/shared-interfaces';

import { SOCKET_CONFIG } from '../../common/constants/socket.constants.js';
import { WsExceptionFilter } from '../../common/filters/index.js';
import { WsAuthGuard } from '../../common/guard/ws-action.guard.js';
import { ActivityScoreManagerService } from '../../redis/repository-manager/index.js';

@UseFilters(WsExceptionFilter)
@WebSocketGateway(SOCKET_CONFIG)
export class ActivityScoreGateway {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(ActivityScoreGateway.name);

  constructor(private readonly activityScoreManager: ActivityScoreManagerService) {}

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('get_activity_score_rank')
  async getCurrentActivityRank(@ConnectedSocket() socket: Socket): Promise<GetActivityScoreRank> {
    try {
      const { room, participant } = socket.data;

      // 점수 매니저를 통해 데이터 조회
      const top = await this.activityScoreManager.getTopRankings(room.id, RANK_LIMIT);

      // 역할(Role)에 따른 데이터 분기 처리
      if (participant.role === 'presenter') {
        const lowest = await this.activityScoreManager.getLowest(room.id);

        return { success: true, top, lowest }; // 발표자용 (Top3 + Lowest)
      }

      const myScore = await this.activityScoreManager.getParticipantScore(room.id, participant.id);
      return { success: true, top, score: myScore }; // 청중용 (Top3만)
    } catch (error) {
      this.logger.error(`[get_current_rank] 실패: ${error.message}`);
      return { success: false, error: '랭킹 정보 조회에 실패했습니다.' };
    }
  }

  @OnEvent('activity.score.updated')
  handleActivityScoreUpdated(
    payload: { roomId: string; participantId: string } & ScoreUpdatePayload,
  ) {
    const { participantId, score, penaltyCount, reason } = payload;
    const scorePayload: ScoreUpdatePayload = { score, penaltyCount, reason };
    this.server.to(participantId).emit('score_update', scorePayload);
    this.logger.log(`[Score] ${participantId} 점수 업데이트: ${score}`);
  }

  @OnEvent('activity.rank.changed')
  handleActivityRankChanged(payload: { roomId: string; top: RankItem[]; lowest: RankItem | null }) {
    const { roomId, top, lowest } = payload;

    // 모든 청중에게 Top 3 랭킹 전송
    const rankPayload: RankUpdatePayload = { top };
    this.server.to(`${roomId}:audience`).emit('rank_update', rankPayload);
    this.logger.log(`[Rank] ${roomId} 랭킹 업데이트 (Top: ${top.length})`);

    // 발표자에게만 꼴찌 점수 전송
    const presenterPayload: PresenterScoreInfoPayload = { top, lowest };
    this.server.to(`${roomId}:presenter`).emit('presenter_rank_update', presenterPayload);
    this.logger.log(`[Rank] ${roomId} 발표자 꼴찌 점수 업데이트: ${lowest}`);
  }
}
