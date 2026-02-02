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

function RoomContent() {
  const { isLoading, isSuccess } = useRoomInit();
  const roomTitle = useRoomStore((state) => state.roomTitle);

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
