import { useRef } from 'react';

import { useLocalParticipantMediaState } from '../hooks/useLocalParticipantMediaState';
import { useVideoElementBinding } from '../hooks/useVideoElementBinding';
import { ParticipantVideoView } from './ParticipantVideoView';
import { VideoDisplayMode } from '@/feature/room/types';

interface MyParticipantVideoProps {
  id: string;
  name: string;
  mode: VideoDisplayMode;
  onModeChange?: (mode: VideoDisplayMode) => void;
  stream: MediaStream | null;
  isCameraOn: boolean;
  isAudioMuted: boolean;
  isSpeaking: boolean;
}

export function MyParticipantVideo({
  id,
  name,
  mode,
  onModeChange,
  stream,
  isCameraOn,
  isAudioMuted,
  isSpeaking,
}: MyParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    activeStream,
    isVideoEnabled,
    isAudioMuted: resolvedAudioMuted,
  } = useLocalParticipantMediaState({
    localStream: stream,
    localCameraOn: isCameraOn,
    localAudioMuted: isAudioMuted,
  });

  const { showOverlay } = useVideoElementBinding({
    videoRef,
    mode,
    activeStream,
    isVideoEnabled,
  });

  return (
    <ParticipantVideoView
      id={id}
      name={name}
      mode={mode}
      isCurrentUser={true}
      onModeChange={onModeChange}
      isAudioMuted={resolvedAudioMuted}
      isVideoEnabled={isVideoEnabled}
      isCurrentlyVisible={true}
      isSpeaking={isSpeaking}
      showOverlay={showOverlay}
      videoRef={videoRef}
    />
  );
}
