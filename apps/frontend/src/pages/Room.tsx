import { RoomMenuBar } from '../feature/room/components/RoomMenuBar';
import { RoomDialogs } from '../feature/room/components/RoomDialogs';
import { RoomMainSection } from '../feature/room/components/RoomMainSection';
import { RoomSideSection } from '../feature/room/components/RoomSideSection';
import { RemoteAudioPlayer } from '../feature/room/components/RemoteAudioPlayer';
import { RoomEndedModal } from '../feature/room/components/RoomEndedModal';
import { PollResultModal } from '../feature/room/components/PollResultModal';
import { useRoomInit } from '@/feature/room/hooks/useRoomInit';
import { MediaControlsProvider } from '@/feature/room/hooks/useMediaControlContext';
import { useRoomStore } from '@/feature/room/stores/useRoomStore';
import { useEffect } from 'react';
import { SocketClient } from '@/shared/socket/socket';
import { useSocketStore } from '@/store/useSocketStore';
import { useRoomJoin } from '@/feature/room/hooks/useRoomJoin';
import { useSafeRoomId } from '@/shared/hooks/useSafeRoomId';
import { logger } from '@/shared/lib/logger';
import { useChatStore } from '@/feature/room/stores/useChatStore';

function RoomContent() {
  const { isLoading, isSuccess } = useRoomInit();

  const roomId = useSafeRoomId();
  const isReconnected = SocketClient.getIsReconnected();

  const roomTitle = useRoomStore((state) => state.roomTitle);
  const chatActions = useChatStore((state) => state.actions);

  const { joinRoom } = useRoomJoin();

  /**
   * 재연결 시 누락 메시지 동기화
   * TODO: 임시 처리
   */
  useEffect(() => {
    if (!isReconnected) return;

    const rejoinRoom = async () => {
      const myInfo = useRoomStore.getState().myInfo;
      const socket = useSocketStore.getState().socket;

      if (!myInfo || !socket?.connected) return;

      try {
        await joinRoom(roomId!, myInfo.id);
        logger.custom.info('[RoomInit] 재연결 후 재입장 완료');
      } catch (error) {
        logger.custom.error('[RoomInit] 재연결 후 재입장 실패:', error);
      }
    };

    const syncChat = async () => {
      const lastMessageId = chatActions.getLastMessageId();
      if (lastMessageId) {
        try {
          const response = await SocketClient.emitWithAck('sync_chat', { lastMessageId });
          if (!response.messages) return;
          for (const msg of response.messages) {
            chatActions.addChat(msg);
          }
          logger.custom.info('[RoomInit] 재연결 후 채팅 동기화 완료');
        } catch (error) {
          logger.socket.warn('재연결 후 채팅 동기화 실패', error);
        }
      }
    };

    rejoinRoom();
    syncChat();
  }, [isReconnected, chatActions, roomId, joinRoom]);

  if (isLoading) {
    return <div>연결 중</div>;
  }

  //TODO: 임시처리
  if (!isSuccess) {
    return (
      <div>
        <p>에러: 알 수 없는 오류가 발생했습니다.</p>
        <button onClick={() => window.location.reload()}>다시 시도</button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-gray-700 pt-4">
      <RemoteAudioPlayer />
      <RoomDialogs />
      <div className="flex h-full overflow-hidden px-4">
        <RoomMainSection />
        <RoomSideSection />
      </div>
      <RoomMenuBar roomTitle={roomTitle ?? '강의실'} />
      <RoomEndedModal />
      <PollResultModal />
    </div>
  );
}

export default function Room() {
  return (
    <MediaControlsProvider>
      <RoomContent />
    </MediaControlsProvider>
  );
}
