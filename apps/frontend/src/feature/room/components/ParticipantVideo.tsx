import { memo, useRef } from 'react';
import type { ParticipantRole } from '@plum/shared-interfaces';

import { useParticipantMediaState } from '../hooks/useParticipantMediaState';
import { useParticipantVideoSubscription } from '../hooks/useParticipantVideoSubscription';
import { useVideoElementBinding } from '../hooks/useVideoElementBinding';
import { ParticipantVideoView } from './ParticipantVideoView';

export type VideoDisplayMode = 'minimize' | 'pip' | 'side';

export interface ParticipantVideoProps {
  id: string;
  name: string;
  mode: VideoDisplayMode;
  isCurrentUser?: boolean;
  onModeChange?: (mode: VideoDisplayMode) => void;
  stream?: MediaStream | null;
  isCameraOn?: boolean;
  isAudioMuted?: boolean;
  videoProducerId?: string;
  participantRole?: ParticipantRole;
  isActive?: boolean;
  isCurrentlyVisible?: boolean;
  isSpeaking?: boolean;
}

function ParticipantVideoComponent({
  id,
  name,
  mode,
  isCurrentUser = false,
  onModeChange,
  stream: localStream,
  isCameraOn: localCameraOn = false,
  isAudioMuted: localAudioMuted = false,
  videoProducerId,
  participantRole,
  isActive = true,
  isCurrentlyVisible = true,
  isSpeaking = false,
}: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const { activeStream, isVideoEnabled, isAudioMuted } = useParticipantMediaState({
    id,
    isCurrentUser,
    localStream,
    localCameraOn,
    localAudioMuted,
  });

  useParticipantVideoSubscription({
    id,
    name,
    isCurrentUser,
    videoProducerId,
    participantRole,
    isActive,
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
      isCurrentUser={isCurrentUser}
      onModeChange={onModeChange}
      isAudioMuted={isAudioMuted}
      isVideoEnabled={isVideoEnabled}
      isCurrentlyVisible={isCurrentlyVisible}
      isSpeaking={isSpeaking}
      showOverlay={showOverlay}
      videoRef={videoRef}
    />
  );
}

export const ParticipantVideo = memo(ParticipantVideoComponent, (prev, next) => {
  if (prev.isCurrentUser || next.isCurrentUser) {
    return false;
  }

  return (
    prev.id === next.id &&
    prev.mode === next.mode &&
    prev.isCurrentUser === next.isCurrentUser &&
    prev.videoProducerId === next.videoProducerId &&
    prev.isCurrentlyVisible === next.isCurrentlyVisible &&
    prev.isSpeaking === next.isSpeaking
  );
});
