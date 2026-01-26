import { RoomMenuBar } from '../feature/room/components/RoomMenuBar';
import { RoomDialogs } from '../feature/room/components/RoomDialogs';
import { RoomMainSection } from '../feature/room/components/RoomMainSection';
import { RoomSideSection } from '../feature/room/components/RoomSideSection';
import { MediaConnectionProvider } from '@/feature/room/hooks/useMediaConnectionContext';
import { useRoomInit } from '@/feature/room/hooks/useRoomInit';
import { RemoteAudioPlayer } from '@/feature/room/components/RemoteAudioPlayer';

function RoomContent() {
  const { isLoading, isSuccess, error, retry } = useRoomInit();

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
      <RoomMenuBar roomTitle="강의실 제목" />
    </div>
  );
}

export default function Room() {
  return (
    <MediaConnectionProvider>
      <RoomContent />
    </MediaConnectionProvider>
  );
}
