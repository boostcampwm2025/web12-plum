import { RoomMenuBar } from '../feature/room/components/RoomMenuBar';
import { RoomDialogs } from '../feature/room/components/RoomDialogs';
import { RoomMainSection } from '../feature/room/components/RoomMainSection';
import { RoomSideSection } from '../feature/room/components/RoomSideSection';
import { MediaConnectionProvider } from '@/feature/room/hooks/useMediaConnectionContext';

function RoomContent() {
  return (
    <div className="flex h-full w-full flex-col bg-gray-700 pt-4">
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
