import { motion } from 'motion/react';
import { Draggable } from './Draggable';
import { ScreenShareBanner } from './ScreenShareBanner';
import { ParticipantGrid } from './ParticipantGrid';
import { ParticipantVideo, VideoDisplayMode } from './ParticipantVideo';
import { useStreamStore } from '@/store/useLocalStreamStore';
import { useMediaStore } from '../stores/useMediaStore';

interface RoomMainSectionProps {
  isScreenSharing: boolean;
  currentUser: { id: string; name: string };
  participants: Array<{ id: string; name: string }>;
  userVideoMode: VideoDisplayMode;
  onModeChange: (mode: VideoDisplayMode) => void;
  onStopScreenShare: () => void;
}

export function RoomMainSection({
  isScreenSharing,
  currentUser,
  participants,
  userVideoMode,
  onModeChange,
  onStopScreenShare,
}: RoomMainSectionProps) {
  const localStream = useStreamStore((state) => state.localStream);
  const isCameraOn = useMediaStore((state) => state.isCameraOn);

  return (
    <>
      <main className="relative flex grow flex-col text-sm">
        {isScreenSharing && (
          <ScreenShareBanner
            userName={currentUser.name}
            onStop={onStopScreenShare}
          />
        )}

        <motion.div
          layout
          className="relative flex grow items-center justify-center"
          transition={{
            duration: 0.3,
            ease: 'easeInOut',
          }}
        >
          <div className="aspect-video w-full rounded-2xl bg-gray-200"></div>

          {(userVideoMode === 'pip' || userVideoMode === 'minimize') && (
            <Draggable>
              <ParticipantVideo
                id={currentUser.id}
                name={currentUser.name}
                mode={userVideoMode}
                isCurrentUser={true}
                onModeChange={onModeChange}
                localStream={localStream}
                isCameraOn={isCameraOn}
              />
            </Draggable>
          )}
        </motion.div>
      </main>

      {userVideoMode === 'side' && (
        <aside className="bg-gray-700">
          <ParticipantGrid
            currentUser={currentUser}
            participants={participants}
            onModeChange={onModeChange}
            localStream={localStream}
            isCameraOn={isCameraOn}
          />
        </aside>
      )}
    </>
  );
}
