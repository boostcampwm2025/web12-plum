import { RoomMenuBar } from '../feature/room/components/RoomMenuBar';
import { RoomDialogs } from '../feature/room/components/RoomDialogs';
import { RoomMainSection } from '../feature/room/components/RoomMainSection';
import { RoomSideSection } from '../feature/room/components/RoomSideSection';
import { RemoteAudioPlayer } from '../feature/room/components/RemoteAudioPlayer';
import { RoomEndedModal } from '../feature/room/components/RoomEndedModal';
import { useRoomInit } from '@/feature/room/hooks/useRoomInit';
import { MediaControlsProvider } from '@/feature/room/hooks/useMediaControlContext';
import { useRoomStore } from '@/feature/room/stores/useRoomStore';

function RoomContent() {
  const { isLoading, isSuccess, error, retry } = useRoomInit();
  const roomTitle = useRoomStore((state) => state.roomTitle);

  if (isLoading) {
    return <div>연결 중</div>;
  }

  if (!isSuccess) {
    return (
      <div>
        <p>에러: {error?.message}</p>
        <button onClick={retry}>다시 시도</button>
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
