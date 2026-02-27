import type { ParticipantRole } from '@plum/shared-interfaces';

import { ParticipantVideo } from './ParticipantVideo';

interface RemoteParticipantVideoProps {
  id: string;
  name: string;
  videoProducerId?: string;
  participantRole?: ParticipantRole;
  shouldConsume?: boolean;
  isCurrentlyVisible?: boolean;
  isSpeaking?: boolean;
}

export function RemoteParticipantVideo({
  id,
  name,
  videoProducerId,
  participantRole,
  shouldConsume = true,
  isCurrentlyVisible = true,
  isSpeaking = false,
}: RemoteParticipantVideoProps) {
  return (
    <ParticipantVideo
      id={id}
      name={name}
      mode="side"
      videoProducerId={videoProducerId}
      participantRole={participantRole}
      shouldConsume={shouldConsume}
      isCurrentlyVisible={isCurrentlyVisible}
      isSpeaking={isSpeaking}
    />
  );
}
