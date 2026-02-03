import { useEffect } from 'react';
import { AsyncBoundary } from '@/shared/components/AsyncBoundary';
import { ErrorFallback } from '@/shared/components/ErrorFallback';
import { useToastStore } from '@/store/useToastStore';
import { useRoomInit } from '@/feature/room/hooks/useRoomInit';
import { useLocalMedia } from '@/feature/room/hooks/useLocalMedia';
import { useRoomSync } from '@/feature/room/hooks/useRoomSync';

import { RoomMenuBar } from '../feature/room/components/RoomMenuBar';
import { RoomDialogs } from '../feature/room/components/RoomDialogs';
import { RoomMainSection } from '../feature/room/components/RoomMainSection';
import { RoomSideSection } from '../feature/room/components/RoomSideSection';
import { RemoteAudioPlayer } from '../feature/room/components/RemoteAudioPlayer';
import { RoomEndedModal } from '../feature/room/components/RoomEndedModal';
import { PollResultModal } from '../feature/room/components/PollResultModal';
import { RoomGuide } from '../feature/room/components/RoomGuide.tsx';

export default function Room() {
  const { addToast } = useToastStore((state) => state.actions);
  const { toggleCamera, toggleMic, toggleScreenShare, disableScreenShare, handleInitialMedia } =
    useLocalMedia();
  const { isLoading, isError } = useRoomInit(handleInitialMedia);

  // 방 재접속 시 세션 복구 및 데이터 동기화
  useRoomSync();

  // 초기화 에러 시 토스트 알림
  useEffect(() => {
    if (isError) {
      addToast({ type: 'error', title: '강의실 입장에 실패했습니다.' });
    }
  }, [isError, addToast]);

  // 로딩 및 에러 상태 처리
  if (isLoading) return <div>연결 중</div>;
  if (isError) {
    return (
      <div>
        <p>에러: 알 수 없는 오류가 발생했습니다.</p>
        <button onClick={() => window.location.reload()}>다시 시도</button>
      </div>
    );
  }

  return (
    <AsyncBoundary
      isLoading={isLoading}
      isError={isError}
      errorFallback={
        <ErrorFallback
          title="연결에 실패했어요"
          description="강의실에 연결할 수 없습니다."
          onRetry={() => {
            //TODO: 강의실 재입장 로직 추가 예정
            // window.location.reload();
          }}
        />
      }
    >
      <div className="flex h-full w-full flex-col bg-gray-700 pt-4">
        <RemoteAudioPlayer />
        <RoomDialogs />
        <RoomGuide />
        <div className="flex h-full overflow-hidden px-4">
          <RoomMainSection onDisableScreenShare={disableScreenShare} />
          <RoomSideSection />
        </div>
        <RoomMenuBar
          onToggleCamera={toggleCamera}
          onToggleMic={toggleMic}
          onToggleScreenShare={toggleScreenShare}
        />
        <RoomEndedModal />
        <PollResultModal />
      </div>
    </AsyncBoundary>
  );
}
