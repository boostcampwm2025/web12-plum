import type {
  CreatePollRequest,
  EmitPollRequest,
  VoteRequest,
  BreakPollRequest,
  ServerToClientEvents,
} from '@plum/shared-interfaces';

import { SocketClient } from '@/shared/socket/client';

/**
 * 발표자 투표 서비스 이벤트 핸들러 인터페이스
 */
export interface PresenterEventHandlers {
  onUpdatePollDetail: ServerToClientEvents['update_poll_detail'];
  onPollEndDetail: ServerToClientEvents['poll_end_detail'];
}

/**
 * 청중 투표 서비스 이벤트 핸들러 인터페이스
 */
export interface AudienceEventHandlers {
  onStartPoll: ServerToClientEvents['start_poll'];
  onUpdatePoll: ServerToClientEvents['update_poll'];
  onPollEnd: ServerToClientEvents['poll_end'];
}

/**
 * 실시간 투표 관련 서버 통신 서비스
 * SocketClient를 사용하여 투표 관련 소켓 I/O를 처리
 */
export class PollService {
  private static unsubscribers: Map<'presenter' | 'audience', (() => void)[]> = new Map([
    ['presenter', []],
    ['audience', []],
  ]);

  /** 실시간 투표 생성 요청 */
  static async createPoll(payload: CreatePollRequest) {
    return await SocketClient.emitWithAck('create_poll', payload);
  }

  /** 실시간 투표 정보 조회 요청 */
  static async getPoll() {
    return await SocketClient.emitWithAck('get_poll');
  }

  /** 활성화된 투표 정보 조회 요청 */
  static async getActivePoll() {
    return await SocketClient.emitWithAck('get_active_poll');
  }

  /** 실시간 투표 시작 요청 */
  static async emitPoll(payload: EmitPollRequest) {
    return await SocketClient.emitWithAck('emit_poll', payload);
  }

  /** 실시간 투표 참여 요청 */
  static async vote(payload: VoteRequest) {
    return await SocketClient.emitWithAck('vote', payload);
  }

  /** 실시간 투표 종료 요청 */
  static async breakPoll(payload: BreakPollRequest) {
    return await SocketClient.emitWithAck('break_poll', payload);
  }

  /** 발표자(Presenter) 전용 실시간 이벤트 구독 */
  static setupPresenterEventHandlers(handlers: PresenterEventHandlers) {
    this.removeEventHandlersByGroup('presenter');

    this.unsubscribers.set('presenter', [
      SocketClient.on('update_poll_detail', handlers.onUpdatePollDetail),
      SocketClient.on('poll_end_detail', handlers.onPollEndDetail),
    ]);
  }

  /** 청중(Audience) 전용 실시간 이벤트 구독 */
  static setupAudienceEventHandlers(handlers: AudienceEventHandlers) {
    this.removeEventHandlersByGroup('audience');

    this.unsubscribers.set('audience', [
      SocketClient.on('start_poll', handlers.onStartPoll),
      SocketClient.on('update_poll', handlers.onUpdatePoll),
      SocketClient.on('poll_end', handlers.onPollEnd),
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
  }
}
