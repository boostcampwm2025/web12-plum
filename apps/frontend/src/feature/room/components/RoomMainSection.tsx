import { motion } from 'motion/react';
import { Draggable } from './Draggable';
import { ScreenShareBanner } from './ScreenShareBanner';
import { ParticipantGrid } from './ParticipantGrid';
import { ParticipantVideo, VideoDisplayMode } from './ParticipantVideo';
import { ToastStack } from '@/shared/components/ToastStack';
import { useStreamStore } from '@/store/useLocalStreamStore';
import { useMediaStore } from '../stores/useMediaStore';
import { MyInfo, useRoomStore } from '../stores/useRoomStore';
import { useEffect, useRef, useState } from 'react';
import { useGestureRecognition } from '../hooks/useGestureRecognition';

/**
 * 화면공유 영상을 표시하는 컴포넌트
 */
function ScreenShareVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isScreenSharing = useMediaStore((state) => state.isScreenSharing);
  const screenStream = useMediaStore((state) => state.screenStream);

  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  if (!isScreenSharing) return <div className="aspect-video w-full rounded-2xl bg-gray-200"></div>;

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="h-full w-full rounded-2xl bg-black object-contain"
    />
  );
}

interface MyVideoProps {
  currentUser: MyInfo;
  videoMode: VideoDisplayMode;
  onModeChange: (mode: VideoDisplayMode) => void;
  onVideoElementChange?: (element: HTMLVideoElement | null) => void;
}

/**
 * 내 비디오 컴포넌트
 * 비디오 모드가 'pip' 또는 'minimize'일 때만 렌더링
 */
function MyVideo({ currentUser, videoMode, onModeChange, onVideoElementChange }: MyVideoProps) {
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
        stream={localStream}
        isCameraOn={isCameraOn}
        onVideoElementChange={onVideoElementChange}
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
  const [gestureVideoElement, setGestureVideoElement] = useState<HTMLVideoElement | null>(null);
  const isCameraOn = useMediaStore((state) => state.isCameraOn);

  const myInfo = useRoomStore((state) => state.myInfo);
  const currentUser = myInfo ?? { id: '', name: '', role: 'audience' };

  useGestureRecognition({
    enabled: isCameraOn && userVideoMode !== 'minimize',
    videoElement: gestureVideoElement,
  });

  return (
    <>
      <main className="relative flex grow flex-col text-sm">
        <ScreenShareBanner userName={currentUser.name} />
        <ToastStack />
        <motion.div
          layout
          className="relative flex grow items-center justify-center"
          transition={{
            duration: 0.3,
            ease: 'easeInOut',
          }}
        >
          <ScreenShareVideo />
          <MyVideo
            currentUser={currentUser}
            videoMode={userVideoMode}
            onModeChange={setUserVideoMode}
            onVideoElementChange={setGestureVideoElement}
          />
        </motion.div>
      </main>

      <ParticipantGrid
        currentUser={currentUser}
        videoMode={userVideoMode}
        onModeChange={setUserVideoMode}
        onCurrentUserVideoElementChange={setGestureVideoElement}
      />
    </>
  );
}
