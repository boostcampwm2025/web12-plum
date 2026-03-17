import type {
  AnswerRequest,
  BreakQnaRequest,
  CreateQnaRequest,
  EmitQnaRequest,
  ServerToClientEvents,
} from '@plum/shared-interfaces';

import { SocketClient } from '@/shared/socket/client';

/**
 * 발표자 QnA 서비스 이벤트 핸들러 인터페이스
 */
export interface PresenterEventHandlers {
  onUpdateQnaDetail: ServerToClientEvents['update_qna_detail'];
  onQnaEndDetail: ServerToClientEvents['qna_end_detail'];
}

/**
 * 청중 QnA 서비스 이벤트 핸들러 인터페이스
 */
export interface AudienceEventHandlers {
  onStartQna: ServerToClientEvents['start_qna'];
  onUpdateQna: ServerToClientEvents['update_qna'];
  onQnaEnd: ServerToClientEvents['qna_end'];
}

/**
 * 실시간 QnA 관련 서버 통신 서비스
 * SocketClient를 사용하여 QnA 관련 소켓 I/O를 처리
 */
export class QnaService {
  private static unsubscribers: Map<'presenter' | 'audience', (() => void)[]> = new Map([
    ['presenter', []],
    ['audience', []],
  ]);

  /** 실시간 QnA 생성 요청 */
  static async createQna(payload: CreateQnaRequest) {
    return await SocketClient.emitWithAck('create_qna', payload);
  }

  /** 실시간 QnA 정보 조회 요청 */
  static async getQna() {
    return await SocketClient.emitWithAck('get_qna');
  }

  /** 활성화된 QnA 정보 조회 요청 */
  static async getActiveQna() {
    return await SocketClient.emitWithAck('get_active_qna');
  }

  /** 실시간 QnA 질문 등록 요청 */
  static async emitQna(payload: EmitQnaRequest) {
    return await SocketClient.emitWithAck('emit_qna', payload);
  }

  /** 실시간 QnA 답변 등록 요청 */
  static async answer(payload: AnswerRequest) {
    return await SocketClient.emitWithAck('answer', payload);
  }

  /** 실시간 QnA 종료 요청 */
  static async breakQna(payload: BreakQnaRequest) {
    return await SocketClient.emitWithAck('break_qna', payload);
  }

  /** 발표자(Presenter) 전용 실시간 이벤트 구독 */
  static setupPresenterEventHandlers(handlers: PresenterEventHandlers) {
    this.removeEventHandlersByGroup('presenter');

    this.unsubscribers.set('presenter', [
      SocketClient.on('update_qna_detail', handlers.onUpdateQnaDetail),
      SocketClient.on('qna_end_detail', handlers.onQnaEndDetail),
    ]);
  }

  /** 청중(Audience) 전용 실시간 이벤트 구독 */
  static setupAudienceEventHandlers(handlers: AudienceEventHandlers) {
    this.removeEventHandlersByGroup('audience');

    this.unsubscribers.set('audience', [
      SocketClient.on('start_qna', handlers.onStartQna),
      SocketClient.on('update_qna', handlers.onUpdateQna),
      SocketClient.on('qna_end', handlers.onQnaEnd),
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
