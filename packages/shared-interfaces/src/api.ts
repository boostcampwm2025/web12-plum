import { z } from 'zod';
import { createLectureSchema } from './room.js';
import { ParticipantRole } from './participant.js';

/**
 * 강의실 생성 요청
 */
export type CreateRoomRequest = z.infer<typeof createLectureSchema>;

/**
 * 강의실 생성 응답
 */
export interface CreateRoomResponse {
  roomId: string;
  host: {
    id: string;
    name: string;
    role: ParticipantRole;
  };
  mediasoup: {
    routerRtpCapabilities: unknown;
    existingProducers: Array<{
      producerId: string;
      participantId: string;
      kind: 'audio' | 'video' | 'screen';
    }>;
  };
}

/**
 * 강의실 입장 요청
 */
export interface JoinRoomRequest {
  participantName: string;
  role: ParticipantRole;
}

/**
 * 강의실 입장 응답
 */
export interface JoinRoomResponse {
  participantId: string;
  name: string;
  role: ParticipantRole;
  mediasoup: {
    routerRtpCapabilities: unknown;
    existingProducers: Array<{
      producerId: string;
      participantId: string;
      kind: 'audio' | 'video' | 'screen';
    }>;
  };
}
