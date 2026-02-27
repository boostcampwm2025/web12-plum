import { ParticipantVideo, type VideoDisplayMode } from './ParticipantVideo';

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
  return (
    <ParticipantVideo
      id={id}
      name={name}
      mode={mode}
      isCurrentUser={true}
      onModeChange={onModeChange}
      stream={stream}
      isCameraOn={isCameraOn}
      isAudioMuted={isAudioMuted}
      isSpeaking={isSpeaking}
    />
  );
}
