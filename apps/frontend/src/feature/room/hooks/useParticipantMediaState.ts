import { selectRemoteVideoStreamByParticipant, useMediaStore } from '../stores/useMediaStore';
import { useRoomStore } from '../stores/useRoomStore';

interface UseParticipantMediaStateParams {
  id: string;
  isCurrentUser: boolean;
  localStream?: MediaStream | null;
  localCameraOn?: boolean;
  localAudioMuted?: boolean;
}

interface UseParticipantMediaStateResult {
  activeStream: MediaStream | null;
  isVideoEnabled: boolean;
  isAudioMuted: boolean;
}

/**
 * 참가자 비디오 렌더링에 필요한 local/remote 파생 상태를 한 곳에서 계산한다.
 */
export function useParticipantMediaState({
  id,
  isCurrentUser,
  localStream = null,
  localCameraOn = false,
  localAudioMuted = false,
}: UseParticipantMediaStateParams): UseParticipantMediaStateResult {
  const remoteStream = useMediaStore(selectRemoteVideoStreamByParticipant(id));
  const remoteAudioMuted = useRoomStore((state) => state.participantAudioMuted.get(id) ?? true);

  if (isCurrentUser) {
    return {
      activeStream: localStream,
      isVideoEnabled: localCameraOn,
      isAudioMuted: localAudioMuted,
    };
  }

  return {
    activeStream: remoteStream,
    isVideoEnabled: !!remoteStream,
    isAudioMuted: remoteAudioMuted,
  };
}
