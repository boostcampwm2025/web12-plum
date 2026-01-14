export type ParticipantRole = 'presenter' | 'audience';

export interface Participant {
  id: string;
  roomId: string;
  currentRoomId: string;
  name: string;
  role: ParticipantRole;
  participationScore: number;
  gestureCount: number;
  chatCount: number;
  pollParticipation: number;
  cameraEnable: boolean;
  micEnable: boolean;
  screenEnable: boolean;
  transports: string[];
  producers: {
    audio: string;
    video: string;
    screen: string;
  };
  consumers: string[];
}
