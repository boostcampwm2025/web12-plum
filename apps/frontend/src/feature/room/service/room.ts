import { SocketClient } from '@/shared/socket/socket';
import type { JoinRoomRequest, ServerToClientEvents } from '@plum/shared-interfaces';

/**
 * 강의실 서비스 이벤트 핸들러 인터페이스
 */
export interface RoomEventHandlers {
  onUserJoined: ServerToClientEvents['user_joined'];
  onUserLeft: ServerToClientEvents['user_left'];
  onRoomEnd: ServerToClientEvents['room_end'];
  onSpeakerDetected: ServerToClientEvents['speaker_detected'];
}

/**
 * 강의실 관련 서버 통신 서비스
 * SocketClient를 사용하여 강의실 관련 소켓 I/O를 처리
 */
export class RoomService {
  private static unsubscribers: (() => void)[] = [];

  /** 강의실 입장 알림 전송 */
  static async joinRoom(payload: JoinRoomRequest) {
    return await SocketClient.emitWithAck('join_room', payload);
  }

  /** 강의실 퇴장 알림 전송 */
  static async leaveRoom() {
    return await SocketClient.emitWithAck('leave_room');
  }

  /** 강의실 종료 알림 전송 */
  static async breakRoom() {
    return await SocketClient.emitWithAck('break_room');
  }

  /** 현재 강의실의 프레젠테이션 정보 조회 */
  static async getPresentation() {
    return await SocketClient.emitWithAck('get_presentation');
  }

  /** 방 관련 이벤트 리스너 등록 */
  static setupEventHandlers(handlers: RoomEventHandlers) {
    this.removeEventHandlers();

    this.unsubscribers = [
      SocketClient.on('user_joined', handlers.onUserJoined),
      SocketClient.on('user_left', handlers.onUserLeft),
      SocketClient.on('room_end', handlers.onRoomEnd),
      SocketClient.on('speaker_detected', handlers.onSpeakerDetected),
    ];
  }

  /** 방 관련 이벤트 리스너 해제 */
  static removeEventHandlers() {
    if (this.unsubscribers.length === 0) return;

    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }
}
