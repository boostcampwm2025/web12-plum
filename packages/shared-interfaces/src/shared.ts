import { ParticipantPayload } from './participant.js';

export type Status = 'pending' | 'active' | 'ended';
export type MediaKind = 'audio' | 'video'; // mediasoup에서 사용하는 미디어 타입
export type MediaType = MediaKind | 'screen'; // 우리가 사용할 미디어 소스 타입
export type ToggleActionType = 'pause' | 'resume';

export interface RoomInfo {
  mediasoup: MediasoupRoomInfo;
  participants: ParticipantPayload[];
}

export interface MediasoupRoomInfo {
  routerRtpCapabilities: unknown;
  existingProducers: Array<MediasoupProducer>;
}

export interface MediasoupProducer {
  producerId: string;
  participantId: string;
  kind: MediaKind;
  type: MediaType;
}
