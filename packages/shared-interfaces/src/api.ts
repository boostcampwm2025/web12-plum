import { z } from 'zod';
import { createLectureSchema, enterLectureSchema } from './room.js';
import { nicknameValidate, ParticipantRole } from './participant.js';

/**
 * 강의실 생성 요청
 */
export type CreateRoomRequest = z.infer<typeof createLectureSchema>;

export interface ErrorResponse {
  message: string;
  error: string;
  statusCode: number;
}

/**
 * 강의실 생성 응답
 */
export type CreateRoomResponse =
  | {
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
  | ErrorResponse;

export type EnterLectureRequestBody = z.infer<typeof enterLectureSchema>;

/**
 * 강의실 입장 요청
 */
export interface EnterRoomRequest {
  uri: {
    id: string;
  };
  body: EnterLectureRequestBody;
}

/**
 * 강의실 입장 응답
 */
export type EnterRoomResponse =
  | {
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
  | ErrorResponse;

/*
 * 강의실 id 검증 request
 */
export interface RoomValidationRequest {
  uri: {
    id: string;
  };
}

/**
 * 강의실 참여자 id 검증 request body
 */

export type NicknameValidationRequestQueryParam = z.infer<typeof nicknameValidate>;

/**
 * 강의실 참여자 id 검증 request
 */
export interface NicknameValidationRequest {
  uri: {
    id: string;
  };
  query: NicknameValidationRequestQueryParam;
}

/**
 * 강의실 참여자 id 검증 response
 */
export interface NicknameValidationResponse {
  available: boolean;
}
