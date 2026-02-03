import { RoomMenuBar } from '../feature/room/components/RoomMenuBar';
import { RoomDialogs } from '../feature/room/components/RoomDialogs';
import { RoomMainSection } from '../feature/room/components/RoomMainSection';
import { RoomSideSection } from '../feature/room/components/RoomSideSection';
import { RemoteAudioPlayer } from '../feature/room/components/RemoteAudioPlayer';
import { RoomEndedModal } from '../feature/room/components/RoomEndedModal';
import { PollResultModal } from '../feature/room/components/PollResultModal';
import { RoomGuide } from '../feature/room/components/RoomGuide.tsx';
import { useRoomInit } from '@/feature/room/hooks/useRoomInit';
import { MediaControlsProvider } from '@/feature/room/hooks/useMediaControlContext';
import { useRoomStore } from '@/feature/room/stores/useRoomStore';
import { AsyncBoundary } from '@/shared/components/AsyncBoundary';
import { ErrorFallback } from '@/shared/components/ErrorFallback';

function RoomContent() {
  const { isLoading, isSuccess, retry } = useRoomInit();
  const roomTitle = useRoomStore((state) => state.roomTitle);

  return (
    <AsyncBoundary
      isLoading={isLoading}
      isError={!isLoading && !isSuccess}
      errorFallback={
        <ErrorFallback
          title="연결에 실패했어요"
          description="강의실에 연결할 수 없습니다."
          onRetry={retry}
        />
      }
    >
      <div className="flex h-full w-full flex-col bg-gray-700 pt-4">
        <RemoteAudioPlayer />
        <RoomDialogs />
        <RoomGuide />
        <div className="flex h-full overflow-hidden px-4">
          <RoomMainSection />
          <RoomSideSection />
        </div>
        <RoomMenuBar roomTitle={roomTitle ?? '강의실'} />
        <RoomEndedModal />
        <PollResultModal />
      </div>
    </AsyncBoundary>
  );
}

export default function Room() {
  return (
    <MediaControlsProvider>
      <RoomContent />
    </MediaControlsProvider>
  );
}
