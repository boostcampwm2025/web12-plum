import { useRef } from 'react';
import type { ParticipantRole } from '@plum/shared-interfaces';

import { useRemoteParticipantMediaState } from '../hooks/useRemoteParticipantMediaState';
import { useVideoElementBinding } from '../hooks/useVideoElementBinding';
import { ParticipantVideoView } from './ParticipantVideoView';
import { VideoDisplayMode } from '@/feature/room/types';
import { useParticipantVideoSubscription } from '../hooks/useParticipantVideoSubscription';

interface RemoteParticipantVideoProps {
  id: string;
  name: string;
  mode?: VideoDisplayMode;
  videoProducerId?: string;
  participantRole?: ParticipantRole;
  shouldConsume?: boolean;
  isCurrentlyVisible?: boolean;
  isSpeaking?: boolean;
}

export function RemoteParticipantVideo({
  id,
  name,
  mode = 'side',
  videoProducerId,
  participantRole,
  shouldConsume = true,
  isCurrentlyVisible = true,
  isSpeaking = false,
}: RemoteParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { activeStream, isVideoEnabled, isAudioMuted } = useRemoteParticipantMediaState({ id });

  useParticipantVideoSubscription({
    id,
    name,
    isCurrentUser: false,
    videoProducerId,
    participantRole,
    shouldConsume,
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
      isCurrentUser={false}
      isAudioMuted={isAudioMuted}
      isVideoEnabled={isVideoEnabled}
      isCurrentlyVisible={isCurrentlyVisible}
      isSpeaking={isSpeaking}
      showOverlay={showOverlay}
      videoRef={videoRef}
    />
  );
}
