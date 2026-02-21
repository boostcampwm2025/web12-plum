import { SocketClient } from '@/shared/socket/socket';
import type {
  SendChatRequest,
  SyncChatRequest,
  ServerToClientEvents,
} from '@plum/shared-interfaces';

/**
 * 채팅 서비스 이벤트 핸들러 인터페이스
 */
export interface ChatEventHandlers {
  onNewChat: ServerToClientEvents['new_chat'];
}

/**
 * 채팅 관련 서버 통신 서비스
 * SocketClient를 사용하여 채팅 관련 소켓 I/O를 처리
 */
export class ChatService {
  private static unsubscribers: (() => void)[] = [];

  /** 채팅 메시지 전송 */
  static async sendChat(payload: SendChatRequest) {
    return await SocketClient.emitWithAck('send_chat', payload);
  }

  /** 채팅 메시지 동기화 요청 */
  static async syncChat(payload: SyncChatRequest) {
    return await SocketClient.emitWithAck('sync_chat', payload);
  }

  /** 채팅 서비스 이벤트 핸들러 등록 */
  static setupEventHandlers(handlers: ChatEventHandlers) {
    this.removeAllEventHandlers();

    this.unsubscribers = [SocketClient.on('new_chat', handlers.onNewChat)];
  }

  /** 등록된 모든 이벤트 핸들러 해제 */
  static removeAllEventHandlers() {
    if (this.unsubscribers.length === 0) return;

    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }
}
