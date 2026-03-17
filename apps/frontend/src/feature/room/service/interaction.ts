import type { GestureType, ServerToClientEvents } from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';
import { SocketClient } from '@/shared/socket/client';

/**
 * 발표자(Presenter) 이벤트 핸들러 인터페이스
 */
export interface PresenterEventHandlers {
  onUpdateGestureStatus: ServerToClientEvents['update_gesture_status'];
  onPresenterRankUpdate: ServerToClientEvents['presenter_rank_update'];
}

/**
 * 청중(Audience) 이벤트 핸들러 인터페이스
 */
export interface AudienceEventHandlers {
  onUpdateGestureStatus: ServerToClientEvents['update_gesture_status'];
  onScoreUpdate: ServerToClientEvents['score_update'];
  onRankUpdate: ServerToClientEvents['rank_update'];
}

/**
 * 상호작용 관련 서버 통신 서비스
 * SocketClient를 사용하여 상호작용 관련 소켓 I/O를 처리
 */
export class InteractionService {
  private static unsubscribers: Map<'presenter' | 'audience', (() => void)[]> = new Map([
    ['presenter', []],
    ['audience', []],
  ]);

  /** 제스처 액션 수행 요청 */
  static async actionGesture(gesture: GestureType) {
    return await SocketClient.emitWithAck('action_gesture', { gesture });
  }

  /** 활동 점수 랭킹 정보 조회 요청 */
  static async getActivityScoreRank() {
    return await SocketClient.emitWithAck('get_activity_score_rank');
  }

  /** 발표자(Presenter) 전용 실시간 이벤트 구독 */
  static setupPresenterEventHandlers(handlers: PresenterEventHandlers) {
    this.removeEventHandlersByGroup('presenter');

    this.unsubscribers.set('presenter', [
      SocketClient.on('update_gesture_status', handlers.onUpdateGestureStatus),
      SocketClient.on('presenter_rank_update', handlers.onPresenterRankUpdate),
    ]);
  }

  /** 청중(Audience) 전용 실시간 이벤트 구독 */
  static setupAudienceEventHandlers(handlers: AudienceEventHandlers) {
    this.removeEventHandlersByGroup('audience');

    this.unsubscribers.set('audience', [
      SocketClient.on('update_gesture_status', handlers.onUpdateGestureStatus),
      SocketClient.on('score_update', handlers.onScoreUpdate),
      SocketClient.on('rank_update', handlers.onRankUpdate),
    ]);
  }

  /** 특정 그룹의 이벤트 핸들러만 해제 */
  static removeEventHandlersByGroup(group: 'presenter' | 'audience') {
    const list = this.unsubscribers.get(group);

    if (list) {
      list.forEach((unsub) => unsub());
      this.unsubscribers.delete(group);
    }
  }

  /** 모든 리소스 정리 */
  static removeAllEventHandlers() {
    this.removeEventHandlersByGroup('presenter');
    this.removeEventHandlersByGroup('audience');
    logger.socket.debug('[Interaction] 모든 상호작용 핸들러 정리 완료');
  }
}
