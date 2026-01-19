import { motion } from 'motion/react';
import { Draggable } from './Draggable';
import { ScreenShareBanner } from './ScreenShareBanner';
import { ParticipantGrid } from './ParticipantGrid';
import { ParticipantVideo, VideoDisplayMode } from './ParticipantVideo';
import { useStreamStore } from '@/store/useLocalStreamStore';
import { useMediaStore } from '../stores/useMediaStore';
import { MyInfo, useRoomStore } from '../stores/useRoomStore';
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

interface ParticipantVideoProps {
  currentUser: MyInfo;
  videoMode: VideoDisplayMode;
  onModeChange: (mode: VideoDisplayMode) => void;
}

/**
 * 내 비디오 컴포넌트
 * 비디오 모드가 'pip' 또는 'minimize'일 때만 렌더링
 */
function MyVideo({ currentUser, videoMode, onModeChange }: ParticipantVideoProps) {
  const isCameraOn = useMediaStore((state) => state.isCameraOn);
  const localStream = useStreamStore((state) => state.localStream);

  if (videoMode !== 'pip' && videoMode !== 'minimize') return null;

  return (
    <Draggable>
      <ParticipantVideo
        id={currentUser.id}
        name={currentUser.name}
        mode={videoMode}
        isCurrentUser={true}
        onModeChange={onModeChange}
        localStream={localStream}
        isCameraOn={isCameraOn}
      />
    </Draggable>
  );
}

/**
 * 강의실 메인 섹션 컴포넌트
 * 강의 화면과 참가자 비디오를 포함
 */
export function RoomMainSection() {
  const [userVideoMode, setUserVideoMode] = useState<VideoDisplayMode>('pip');

  const myInfo = useRoomStore((state) => state.myInfo);
  const currentUser = myInfo ?? { id: '', name: '', role: 'audience' };

  return (
    <>
      <main className="relative flex grow flex-col text-sm">
        <ScreenShareBanner userName={currentUser.name} />
        <motion.div
          layout
          className="relative flex grow items-center justify-center"
          transition={{
            duration: 0.3,
            ease: 'easeInOut',
          }}
        >
          <div className="aspect-video w-full rounded-2xl bg-gray-200"></div>
          <MyVideo
            currentUser={currentUser}
            videoMode={userVideoMode}
            onModeChange={setUserVideoMode}
          />
        </motion.div>
      </main>

      <ParticipantGrid
        currentUser={currentUser}
        videoMode={userVideoMode}
        participants={participants}
        onModeChange={setUserVideoMode}
      />
    </>
  );
}
