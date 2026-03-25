interface UseLocalParticipantMediaStateParams {
  localStream?: MediaStream | null;
  localCameraOn?: boolean;
  localAudioMuted?: boolean;
}

interface UseLocalParticipantMediaStateResult {
  activeStream: MediaStream | null;
  isVideoEnabled: boolean;
  isAudioMuted: boolean;
}

export function useLocalParticipantMediaState({
  localStream = null,
  localCameraOn = false,
  localAudioMuted = false,
}: UseLocalParticipantMediaStateParams): UseLocalParticipantMediaStateResult {
  return {
    activeStream: localStream,
    isVideoEnabled: localCameraOn,
    isAudioMuted: localAudioMuted,
  };
}
