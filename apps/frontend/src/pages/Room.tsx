import { RoomMenuBar } from '../feature/room/components/RoomMenuBar';
import { RoomDialogs } from '../feature/room/components/RoomDialogs';
import { RoomMainSection } from '../feature/room/components/RoomMainSection';
import { RoomSideSection } from '../feature/room/components/RoomSideSection';
import { useRoom } from '../feature/room/hooks/useRoom';
import { MediaConnectionProvider } from '@/feature/room/hooks/useMediaConnectionContext';

function RoomContent() {
  const {
    activeDialog,
    activeSidePanel,
    currentUser,
    handleExit,
    handleStopScreenShare,
    participants,
    setActiveDialog,
    setActiveSidePanel,
    userVideoMode,
    setUserVideoMode,
    isScreenSharing,
  } = useRoom();

  return (
    <div className="flex h-full w-full flex-col bg-gray-700 pt-4">
      <RoomDialogs
        activeDialog={activeDialog}
        onClose={() => setActiveDialog(activeDialog!)}
      />

      <div className="flex h-full overflow-hidden px-4">
        <RoomMainSection
          isScreenSharing={isScreenSharing}
          currentUser={currentUser}
          participants={participants}
          userVideoMode={userVideoMode}
          onModeChange={setUserVideoMode}
          onStopScreenShare={handleStopScreenShare}
        />

        <RoomSideSection
          activeSidePanel={activeSidePanel}
          onClosePanel={setActiveSidePanel}
        />
      </div>

      <RoomMenuBar
        roomTitle="강의실 제목"
        onExit={handleExit}
      />
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
