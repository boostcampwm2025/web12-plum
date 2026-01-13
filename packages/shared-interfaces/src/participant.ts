export type ParticipantRole = 'presenter' | 'audience';

export interface Participant {
  id: string;
  roomId: string;
  currentRoomId: string;
  name: string;
  role: 'presenter' | 'audience';
  participationScore: number;
  gestureCount: number;
  chatCount: number;
  pollParticipation: number;
  cameraEnable: boolean;
  micEnable: boolean;
  screenEnable: boolean;
  transports: string[];
  producers: string[];
  consumers: string[];
}
