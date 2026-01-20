import { ParticipantRole } from './participant.js';
import {
  MediaKind,
  MediasoupProducer,
  MediasoupRoomInfo,
  MediaType,
  ToggleActionType,
} from './shared.js';

// 제스처 타입 정의
export type GestureType =
  | 'thumbs_up' // 👍 좋아요/이해했어요
  | 'thumbs_down' // 👎 모르겠어요
  | 'hand_raise' // ✋ 손들기/질문
  | 'ok_sign' // 👌 괜찮아요
  | 'x_sign' // ❌ 반대
  | 'o_sign' // 🙆 찬성
  | 'one' // ☝️ 1번 투표
  | 'two' // ✌️ 2번 투표
  | 'three' // 3번 투표
  | 'four'; // 4번 투표

// 클라이언트에서 보내는 데이터 페이로드

export interface JoinRoomRequest {
  roomId: string;
  participantId: string;
}

export interface CreateTransportRequest {
  direction: 'send' | 'recv';
}

export interface ConnectTransportRequest<T = any> {
  transportId: string;
  dtlsParameters: T; // mediasoup-client/node DtlsParameters
}

export interface ProduceRequest<T = any> {
  transportId: string;
  type: MediaType;
  rtpParameters: T; // RtpParameters
}

export interface GetProducerRequest {
  targetParticipantId: string;
  type: MediaType;
}

export interface ConsumeRequest<T = any> {
  transportId: string;
  producerId: string;
  rtpCapabilities: T; // RtpCapabilities
}

export interface ConsumeResumeRequest {
  consumerId: string;
}

export interface ToggleMediaRequest {
  producerId: string;
  action: ToggleActionType;
  type: MediaType;
}

// 제스처 요청 (클라이언트 -> 서버)
export interface ActionGestureRequest {
  gesture: GestureType;
}

// 클라이언트에서 보낸 요청에 따라 발생하는 이벤트 페이로드

export interface BaseResponse {
  success: boolean;
  error?: string;
}

export type JoinRoomResponse =
  | BaseResponse
  | {
      success: boolean;
      mediasoup: MediasoupRoomInfo;
    };

export type CreateTransportResponse<T1 = any, T2 = any, T3 = any> =
  | BaseResponse
  | {
      success: boolean;
      id: string;
      iceParameters: T1;
      iceCandidates: T2;
      dtlsParameters: T3;
    };

export type ConnectTransportResponse = BaseResponse;

export type ProduceResponse =
  | BaseResponse
  | {
      success: boolean;
      producerId: string;
      kind: MediaKind;
      type: MediaType;
    };

export type GetProducerResponse =
  | BaseResponse
  | {
      success: boolean;
      producerId?: string;
    };

export type ConsumeResponse<T = any> =
  | BaseResponse
  | {
      success: boolean;
      producerId: string;
      consumerId: string;
      kind: MediaKind;
      type: MediaType;
      rtpParameters: T;
    };

export type ConsumeResumeResponse = BaseResponse;

export type ToggleMediaResponse = BaseResponse;

export type LeaveRoomResponse = BaseResponse;

export type BreakRoomResponse = BaseResponse;

// 서버에서 보내는 브로드캐스트 페이로드
export interface UserJoinedPayload {
  id: string;
  name: string;
  role: string;
  joinedAt: Date;
}

export interface UserLeftPayload {
  id: string;
  name: string;
  leavedAt: Date;
}

export interface NewProducerPayload extends MediasoupProducer {
  participantRole: ParticipantRole;
  kind: MediaKind;
  type: MediaType;
}

export type MediaStateChangedPayload = NewProducerPayload & {
  action: ToggleActionType;
};

// 제스처 상태 업데이트 페이로드
export interface UpdateGestureStatusPayload {
  participantId: string;
  gesture: GestureType;
}

export type ActionGestureResponse = BaseResponse;

/**
 * 서버 -> 클라이언트 이벤트
 */
export interface ServerToClientEvents {
  user_joined: (data: UserJoinedPayload) => void;

  user_left: (data: UserLeftPayload) => void;

  new_producer: (data: NewProducerPayload) => void;

  media_state_changed: (data: MediaStateChangedPayload) => void;

  update_gesture_status: (data: UpdateGestureStatusPayload) => void;

  room_end: () => void;
}

/**
 * 클라이언트 -> 서버 이벤트
 */
export interface ClientToServerEvents {
  join_room: (data: JoinRoomRequest, cb: (res: JoinRoomResponse) => void) => void;

  create_transport: (
    data: CreateTransportRequest,
    cb: (res: CreateTransportResponse) => void,
  ) => void;

  connect_transport: (
    data: ConnectTransportRequest,
    cb: (res: ConnectTransportResponse) => void,
  ) => void;

  produce: (data: ProduceRequest, cb: (res: ProduceResponse) => void) => void;

  consume: (data: ConsumeRequest, cb: (res: ConsumeResponse) => void) => void;

  consume_resume: (data: ConsumeResumeRequest, cb: (res: ConsumeResumeResponse) => void) => void;

  toggle_media: (data: ToggleMediaRequest, cb: (res: ToggleMediaResponse) => void) => void;

  get_producer: (data: GetProducerRequest, cb: (res: GetProducerRequest) => void) => void;

  leave_room: (cb: (res: LeaveRoomResponse) => void) => void;

  action_gesture: (data: ActionGestureRequest, cb: (res: ActionGestureResponse) => void) => void;

  break_room: (cb: (res: BreakRoomResponse) => void) => void;
}
