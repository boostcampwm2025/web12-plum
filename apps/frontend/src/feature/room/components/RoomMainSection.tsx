import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

import DodoReady from '@/assets/logo/dodo-ready.svg';

import { useGestureHandlers } from '@/feature/gesture/hooks/useGestureHandlers';
import { useGestureRecognition } from '@/feature/gesture/hooks/useGestureRecognition';
import { MyParticipantVideo } from '@/feature/media/components/MyParticipantVideo';
import { ParticipantGrid } from '@/feature/media/components/ParticipantGrid';
import { ScreenShareBanner } from '@/feature/media/components/ScreenShareBanner';
import { useBackgroundEffectStore } from '@/feature/media/stores/useBackgroundEffectStore';
import { useMediaStore } from '@/feature/media/stores/useMediaStore';

import { ToastStack } from '@/shared/components/ToastStack';
import { useStreamStore } from '@/shared/stores/useLocalStreamStore';

import { MyInfo, useRoomStore } from '../stores/useRoomStore';
import type { VideoDisplayMode } from '../types';
import { Draggable } from './Draggable';

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
          <div className="flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-gray-500">
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
  stream: MediaStream | null;
  isAudioMuted: boolean;
  isSpeaking: boolean;
}

/**
 * 내 비디오 컴포넌트
 * 비디오 모드가 'pip' 또는 'minimize'일 때만 렌더링
 */
function MyVideo({
  currentUser,
  videoMode,
  onModeChange,
  stream,
  isAudioMuted,
  isSpeaking,
}: MyVideoProps) {
  const isCameraOn = useMediaStore((state) => state.isCameraOn);

  if (videoMode !== 'pip' && videoMode !== 'minimize') return null;

  return (
    <Draggable>
      <MyParticipantVideo
        id={currentUser.id}
        name={currentUser.name}
        mode={videoMode}
        onModeChange={onModeChange}
        stream={stream}
        isCameraOn={isCameraOn}
        isAudioMuted={isAudioMuted}
        isSpeaking={isSpeaking}
      />
    </Draggable>
  );
}

interface RoomMainSectionProps {
  onDisableScreenShare: () => void;
}

/**
 * 강의실 메인 섹션 컴포넌트
 * 강의 화면과 참가자 비디오를 포함
 */
export function RoomMainSection({ onDisableScreenShare }: RoomMainSectionProps) {
  const [userVideoMode, setUserVideoMode] = useState<VideoDisplayMode>('side');
  const [gestureVideoElement, setGestureVideoElement] = useState<HTMLVideoElement | null>(null);
  const isCameraOn = useMediaStore((state) => state.isCameraOn);
  const isMicOn = useMediaStore((state) => state.isMicOn);
  const localStream = useStreamStore((state) => state.localStream);
  const processedStream = useBackgroundEffectStore((state) => state.processedStream);
  const activeSpeakerIds = useRoomStore((state) => state.activeSpeakerIds);

  const myInfo = useRoomStore((state) => state.myInfo);
  const currentUser = myInfo ?? { id: '', name: '', role: 'audience' };
  const { handleGesture, shouldAllowGesture } = useGestureHandlers();

  useEffect(() => {
    const video = gestureVideoElement;
    if (!video) return;
    if (!localStream) {
      video.srcObject = null;
      return;
    }
    if (video.srcObject !== localStream) {
      video.srcObject = localStream;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.play().catch(() => {});
    }
  }, [localStream, gestureVideoElement]);

  useGestureRecognition({
    enabled: isCameraOn && userVideoMode !== 'minimize',
    videoElement: gestureVideoElement,
    shouldAllowGesture,
    onConfirmedGesture: handleGesture,
  });

  const displayStream = processedStream ?? localStream;

  return (
    <>
      <main className="relative flex grow flex-col text-sm">
        <ScreenShareBanner
          userName={currentUser.name}
          onDisableScreenShare={onDisableScreenShare}
        />
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
            stream={displayStream}
            isAudioMuted={!isMicOn}
            isSpeaking={activeSpeakerIds.has(currentUser.id)}
          />
        </motion.div>

        <video
          ref={setGestureVideoElement}
          className="hidden"
        />
      </main>

      <ParticipantGrid
        currentUser={currentUser}
        videoMode={userVideoMode}
        onModeChange={setUserVideoMode}
      />
    </>
  );
}
