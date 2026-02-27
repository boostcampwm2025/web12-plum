import { memo } from 'react';
import type { ParticipantRole } from '@plum/shared-interfaces';

import type { VideoDisplayMode } from '../types';
import { MyParticipantVideo } from './MyParticipantVideo';
import { RemoteParticipantVideo } from './RemoteParticipantVideo';

export type { VideoDisplayMode } from '../types';

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
  shouldConsume?: boolean;
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
  shouldConsume = true,
  isCurrentlyVisible = true,
  isSpeaking = false,
}: ParticipantVideoProps) {
  if (isCurrentUser) {
    return (
      <MyParticipantVideo
        id={id}
        name={name}
        mode={mode}
        onModeChange={onModeChange}
        stream={localStream ?? null}
        isCameraOn={localCameraOn}
        isAudioMuted={localAudioMuted}
        isSpeaking={isSpeaking}
      />
    );
  }

  return (
    <RemoteParticipantVideo
      id={id}
      name={name}
      mode={mode}
      videoProducerId={videoProducerId}
      participantRole={participantRole}
      shouldConsume={shouldConsume}
      isCurrentlyVisible={isCurrentlyVisible}
      isSpeaking={isSpeaking}
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
    prev.shouldConsume === next.shouldConsume &&
    prev.videoProducerId === next.videoProducerId &&
    prev.isCurrentlyVisible === next.isCurrentlyVisible &&
    prev.isSpeaking === next.isSpeaking
  );
});
