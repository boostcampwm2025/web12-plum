import { motion } from 'motion/react';
import { Draggable } from './Draggable';
import { ScreenShareBanner } from './ScreenShareBanner';
import { ParticipantGrid } from './ParticipantGrid';
import { ParticipantVideo, VideoDisplayMode } from './ParticipantVideo';
import { useStreamStore } from '@/store/useLocalStreamStore';
import { useMediaStore } from '../stores/useMediaStore';
import { useRoomStore } from '../stores/useRoomStore';
import { logger } from '@/shared/lib/logger';
import { useState } from 'react';

// Mock 데이터 (나중에 실제 데이터로 교체)
const participants = [
  { id: '1', name: '김자두' },
  { id: '2', name: '김자두' },
  { id: '3', name: '이자두' },
  { id: '4', name: '박자두' },
  { id: '5', name: '최자두' },
  { id: '6', name: '정자두' },
];

export function RoomMainSection() {
  const myInfo = useRoomStore((state) => state.myInfo);
  const currentUser = myInfo ?? { id: '', name: '' };

  const isScreenSharing = useMediaStore((state) => state.isScreenSharing);
  const localStream = useStreamStore((state) => state.localStream);
  const isCameraOn = useMediaStore((state) => state.isCameraOn);

  const [userVideoMode, setUserVideoMode] = useState<VideoDisplayMode>('pip');

  const { toggleScreenShare } = useMediaStore((state) => state.actions);

  const handleStopScreenShare = () => {
    logger.ui.debug('화면 공유 중지 요청');
    toggleScreenShare();
    // TODO: 화면 공유 중지 로직
  };

  return (
    <>
      <main className="relative flex grow flex-col text-sm">
        {isScreenSharing && (
          <ScreenShareBanner
            userName={currentUser.name}
            onStop={handleStopScreenShare}
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
                onModeChange={(mode) => setUserVideoMode(mode)}
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
            onModeChange={(mode) => setUserVideoMode(mode)}
            localStream={localStream}
            isCameraOn={isCameraOn}
          />
        </aside>
      )}
    </>
  );
}
