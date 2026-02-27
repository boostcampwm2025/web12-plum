import { selectRemoteVideoStreamByParticipant, useMediaStore } from '../stores/useMediaStore';
import { useRoomStore } from '../stores/useRoomStore';

interface UseRemoteParticipantMediaStateParams {
  id: string;
}

interface UseRemoteParticipantMediaStateResult {
  activeStream: MediaStream | null;
  isVideoEnabled: boolean;
  isAudioMuted: boolean;
}

export function useRemoteParticipantMediaState({
  id,
}: UseRemoteParticipantMediaStateParams): UseRemoteParticipantMediaStateResult {
  const remoteStream = useMediaStore(selectRemoteVideoStreamByParticipant(id));
  const remoteAudioMuted = useRoomStore((state) => state.participantAudioMuted.get(id) ?? true);

  return {
    activeStream: remoteStream,
    isVideoEnabled: !!remoteStream,
    isAudioMuted: remoteAudioMuted,
  };
}
