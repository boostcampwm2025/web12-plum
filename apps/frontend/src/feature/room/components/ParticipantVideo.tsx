import { memo, useRef } from 'react';
import type { ParticipantRole } from '@plum/shared-interfaces';

import { useMediaStore } from '../stores/useMediaStore';
import { useRoomStore } from '../stores/useRoomStore';
import { useParticipantVideoSubscription } from '../hooks/useParticipantVideoSubscription';
import { useVideoElementBinding } from '../hooks/useVideoElementBinding';
import { ParticipantVideoView } from './ParticipantVideoView';

export type VideoDisplayMode = 'minimize' | 'pip' | 'side';

/**
 * UI에서 특정 참가자의 비디오 스트림을 실시간으로 조회하기 위한 셀렉터
 * remoteStreams는 consumerId 기반 Map이라 participantId로 직접 조회한다.
 */
function useRemoteVideoStream(participantId: string): MediaStream | null {
  return useMediaStore((state) => {
    for (const stream of state.remoteStreams.values()) {
      if (stream.participantId === participantId && stream.type === 'video') {
        return stream.stream;
      }
    }
    return null;
  });
}

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

  const remoteStream = useRemoteVideoStream(isCurrentUser ? '' : id);

  const remoteAudioMuted = useRoomStore(
    (state) => state.participantAudioMuted.get(isCurrentUser ? '' : id) ?? true,
  );
  const isAudioMuted = isCurrentUser ? localAudioMuted : remoteAudioMuted;

  const activeStream = isCurrentUser ? localStream : remoteStream;
  const isVideoEnabled = isCurrentUser ? localCameraOn : !!remoteStream;

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
