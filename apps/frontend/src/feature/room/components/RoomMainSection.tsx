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
import DodoReady from '@/assets/logo/dodo-ready.svg';

/**
 * 화면공유 영상을 표시하는 컴포넌트
 * 로컬(내 화면공유) 또는 원격(다른 사람의 화면공유) 스트림을 표시
 */
function ScreenShareVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isScreenSharing = useMediaStore((state) => state.isScreenSharing);
  const screenStream = useMediaStore((state) => state.screenStream);
  const remoteStreams = useMediaStore((state) => state.remoteStreams);

  // 원격 화면공유 스트림 찾기
  const remoteScreenStream = Array.from(remoteStreams.values()).find(
    (stream) => stream.type === 'screen',
  );

  // 표시할 스트림 결정: 로컬 화면공유 > 원격 화면공유
  const displayStream = isScreenSharing ? screenStream : remoteScreenStream?.stream;

  useEffect(() => {
    if (videoRef.current && displayStream) {
      videoRef.current.srcObject = displayStream;
    }
  }, [displayStream]);

  return (
    <div className="flex h-full max-h-full w-full max-w-full items-center justify-center">
      <div className="aspect-video max-h-full w-full max-w-full">
        {displayStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full rounded-2xl bg-black object-contain"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl bg-gray-500">
            <img
              src={DodoReady}
              alt="화면공유 대기중"
              className="w-[clamp(6rem,20vw,10rem)] object-contain"
            />
            <span className="text-text text-[clamp(1rem,2.5vw,1.5rem)]">화면 공유 대기중...</span>
          </div>
        )}
      </div>
    </div>
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
          className="relative flex grow items-center justify-center overflow-hidden"
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
