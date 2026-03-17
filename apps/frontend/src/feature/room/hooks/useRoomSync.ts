import { useSafeRoomId } from '@/shared/hooks/useSafeRoomId';
import { SocketClient } from '@/shared/socket/client';
import { useRoomJoin } from './useRoomJoin';
import { useEffect, useCallback } from 'react';
import { useRoomStore } from '../stores/useRoomStore';
import { logger } from '@/shared/lib/logger';
import { useChatStore } from '@/feature/chat/stores/useChatStore';
import { ChatService } from '@/feature/chat/services/chat';

/**
 * 소켓 재연결 시 방 상태를 동기화하는 훅
 *
 * 네트워크 끊김 후 재연결되었을 때 서버와 클라이언트 상태를 맞추는 역할
 *
 * - 일시적인 네트워크 끊김 동안 서버에서 발생한 이벤트를 놓칠 수 있음
 * - 재연결 시 방 참가자 목록, 채팅 메시지 등이 불일치할 수 있음
 *
 * ## 동기화 대상
 * - 방 참가자 목록 (joinRoom으로 최신 상태 획득)
 * - 채팅 메시지 (놓친 메시지 sync_chat으로 보충)
 *
 * ## 동작 조건
 * - socket.io의 reconnect 이벤트 발생 시 실행
 * - roomId와 myInfo가 있어야 실행 (방에 입장한 상태)
 */
export function useRoomSync() {
  const roomId = useSafeRoomId();
  const chatActions = useChatStore((state) => state.actions);
  const { joinRoom } = useRoomJoin();

  /**
   * 재연결 시 동기화 수행
   *
   * 동기화 순서:
   * 1. joinRoom으로 방 재입장 -> 최신 참가자 목록, Producer 정보 획득
   * 2. sync_chat으로 놓친 채팅 메시지 보충
   *    - lastMessageId 이후의 메시지만 요청 (중복 방지)
   *    - 메시지가 없으면 요청 안 함
   */
  const performSync = useCallback(async () => {
    if (!roomId) return;

    const myInfo = useRoomStore.getState().myInfo;
    if (!myInfo) return;

    try {
      // 방 재입장으로 참가자 목록 동기화
      await joinRoom(roomId, myInfo.id);

      // 놓친 채팅 메시지 동기화
      const lastMessageId = chatActions.getLastMessageId();
      if (lastMessageId) {
        const { messages } = await ChatService.syncChat({ lastMessageId });
        messages?.forEach(chatActions.addChat);
      }
      logger.custom.debug('[useRoomSync] 재연결 및 데이터 동기화 완료');
    } catch (error) {
      logger.custom.error('[useRoomSync] 동기화 중 오류 발생:', error);
    }
  }, [roomId, joinRoom, chatActions]);

  /**
   * reconnect 이벤트 구독
   * - SocketClient의 onReconnect 메서드를 사용하여 재연결 시 performSync가 호출되도록 설정
   * - 컴포넌트 언마운트 시 구독 해제
   */
  useEffect(() => {
    return SocketClient.onReconnect(performSync);
  }, [performSync]);
}
