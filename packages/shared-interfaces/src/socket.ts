import { z } from 'zod';

import { ParticipantPayload, ParticipantRole } from './participant.js';
import { MediaKind, MediasoupProducer, MediaType, RoomInfo, ToggleActionType } from './shared.js';
import { Poll, pollFormSchema, PollOption, PollPayload } from './poll.js';
import { Answer, Qna, qnaFormSchema, QnaPayload } from './qna.js';
import { FileInfo } from './file.js';
import { ChatMessage, SendChatRequest, SyncChatRequest } from './chat.js';
import { RankItem } from './score.js';

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

export interface CloseProducerRequest {
  producerId: string;
}

export interface ConsumeRequest<T = any> {
  transportId: string;
  producerId: string;
  rtpCapabilities: T; // RtpCapabilities
}

export interface ConsumeResumeRequest {
  consumerId: string;
}

export interface CloseConsumerRequest {
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

export type CreatePollRequest = z.infer<typeof pollFormSchema>;

export type CreateQnaRequest = z.infer<typeof qnaFormSchema>;

export interface EmitPollRequest {
  pollId: string;
}

export interface EmitQnaRequest {
  qnaId: string;
}

export interface VoteRequest {
  pollId: string;
  optionId: number;
  isGesture: boolean;
}

export type AnswerRequest = {
  qnaId: string;
  text: string;
};

export interface BreakPollRequest {
  pollId: string;
}

export interface BreakQnaRequest {
  qnaId: string;
}

// 페이로드 없는 이벤트의 빈 요청 타입
export type LeaveRoomRequest = Record<string, never>;
export type BreakRoomRequest = Record<string, never>;
export type GetPollRequest = Record<string, never>;
export type GetActivePollRequest = Record<string, never>;
export type GetQnaRequest = Record<string, never>;
export type GetActiveQnaRequest = Record<string, never>;
export type GetPresentationRequest = Record<string, never>;
export type GetActivityScoreRankRequest = Record<string, never>;

// 클라이언트에서 보낸 요청에 따라 발생하는 이벤트 페이로드

export interface BaseResponse {
  success: boolean;
  error?: string;
}

export type JoinRoomResponse =
  | (BaseResponse & { success: false })
  | ({
      success: true;
      participantId: string;
      participantName: string;
      role: ParticipantRole;
    } & RoomInfo);

export type CreateTransportResponse<T1 = any, T2 = any, T3 = any> =
  | (BaseResponse & { success: false })
  | {
      success: true;
      id: string;
      iceParameters: T1;
      iceCandidates: T2;
      dtlsParameters: T3;
    };

export type ConnectTransportResponse = BaseResponse;

export type ProduceResponse =
  | (BaseResponse & { success: false })
  | {
      success: true;
      producerId: string;
      kind: MediaKind;
      type: MediaType;
    };

export type GetProducerResponse =
  | (BaseResponse & { success: false })
  | {
      success: true;
      producerId?: string;
    };

export type CloseProducerResponse = BaseResponse;

export type ConsumeResponse<T = any> =
  | (BaseResponse & { success: false })
  | {
      success: true;
      producerId: string;
      consumerId: string;
      kind: MediaKind;
      type: MediaType;
      rtpParameters: T;
      producerPaused: boolean; // 추가된 필드
    };

export type ConsumeResumeResponse = BaseResponse;

export type CloseConsumerResponse = BaseResponse;

export type ToggleMediaResponse = BaseResponse;

export type LeaveRoomResponse = BaseResponse;

export type BreakRoomResponse = BaseResponse;

export type ActionGestureResponse = BaseResponse;

export type CreatePollResponse = BaseResponse;

export type CreateQnaResponse = BaseResponse;

export type GetPollResponse =
  | (BaseResponse & { success: false })
  | {
      success: true;
      polls: Poll[];
    };

export type GetActivePollResponse =
  | (BaseResponse & { success: false })
  | {
      success: true;
      poll: PollPayload | null;
      votedOptionId: number | null;
    };

export type GetQnaResponse =
  | (BaseResponse & { success: false })
  | {
      success: true;
      qnas: Qna[];
    };

export type GetActiveQnaResponse =
  | (BaseResponse & { success: false })
  | {
      success: true;
      qna: QnaPayload | null;
      answered?: boolean;
    };

export type EmitPollResponse =
  | (BaseResponse & { success: false })
  | ({ success: true } & Pick<PollPayload, 'startedAt' | 'endedAt'>);

export type EmitQnaResponse =
  | (BaseResponse & { success: false })
  | ({ success: true } & Pick<QnaPayload, 'startedAt' | 'endedAt'>);

export type VoteResponse = BaseResponse;

export type AnswerResponse = BaseResponse;

export type BreakPollResponse =
  | (BaseResponse & { success: false })
  | { success: true; options: PollOption[] };

export type BreakQnaResponse =
  | (BaseResponse & { success: false })
  | { success: true; answers: Answer[]; count: number };

export type GetPresentationResponse =
  | (BaseResponse & { success: false })
  | { success: true; files: FileInfo[] };

export type SendChatResponse =
  | (BaseResponse & { success: false; retryable?: boolean })
  | { success: true; messageId: string };

export type SyncChatResponse =
  | (BaseResponse & { success: false })
  | { success: true; messages: ChatMessage[] };

export type GetActivityScoreRank =
  | (BaseResponse & { success: false })
  | ({ success: true; score: number } & RankUpdatePayload)
  | ({ success: true } & PresenterScoreInfoPayload);

// 서버에서 보내는 브로드캐스트 페이로드
export type UserJoinedPayload = ParticipantPayload;

export interface UserLeftPayload {
  id: string;
  name: string;
  leavedAt: Date;
}

export interface NewProducerPayload extends MediasoupProducer {
  participantRole: ParticipantRole;
}

export interface ProducerClosedPayload {
  participantId: string;
  producerId: string;
  kind: MediaKind;
  type: MediaType;
}

export interface ConsumerClosedPayload {
  consumerId: string;
  producerId: string;
}

export type MediaStateChangedPayload = NewProducerPayload & {
  action: ToggleActionType;
};

// 제스처 상태 업데이트 페이로드
export interface UpdateGestureStatusPayload {
  participantId: string;
  participantName: string;
  gesture: GestureType;
}

export type StartPollPayload = PollPayload;

export type StartQnaPayload = QnaPayload;

export interface UpdatePollStatusFullPayload {
  pollId: string;
  options: Pick<PollOption, 'id' | 'count'>[];
  voter: {
    participantId: string;
    name: string;
    optionId: number;
  };
}

export type UpdatePollStatusSubPayload = Omit<UpdatePollStatusFullPayload, 'voter'>;

export type UpdateQnaFullPayload = Answer & {
  qnaId: string;
  count: number;
};

export type UpdateQnaSubPayload = {
  qnaId: string;
  count: number;
  text?: string;
};

export interface EndPollPayload {
  pollId: string;
  title: string;
  options: Omit<PollOption, 'voters'>[];
}

export interface EndPollDetailPayload {
  pollId: string;
  options: PollOption[];
}

export interface EndQnaDetailPayload {
  qnaId: string;
  title: string;
  count: number;
  answers: Answer[];
}

export type EndQnaPayload = {
  qnaId: string;
  title: string;
  count: number;
  text?: string[];
};

export interface ScoreUpdatePayload {
  score: number;
  penaltyCount: number;
  reason: string;
}

export interface RankUpdatePayload {
  top: RankItem[];
}

export interface PresenterScoreInfoPayload {
  top: RankItem[];
  lowest: RankItem | null;
}

export type RoomEndPayload = Record<string, never>;

// 발화 감지 이벤트 페이로드
export interface SpeakerDetectedPayload {
  participantId: string;
  participantName: string;
  detectedAt: number;
}

/**
 * 서버 -> 클라이언트 이벤트
 */
export interface ServerToClientEvents {
  user_joined: (data: UserJoinedPayload) => void;

  user_left: (data: UserLeftPayload) => void;

  new_producer: (data: NewProducerPayload) => void;

  producer_closed: (data: ProducerClosedPayload) => void;

  consumer_closed: (data: ConsumerClosedPayload) => void;

  media_state_changed: (data: MediaStateChangedPayload) => void;

  update_gesture_status: (data: UpdateGestureStatusPayload) => void;

  room_end: (data: RoomEndPayload) => void;

  start_poll: (data: StartPollPayload) => void;

  start_qna: (data: StartQnaPayload) => void;

  update_poll: (data: UpdatePollStatusSubPayload) => void;

  update_poll_detail: (data: UpdatePollStatusFullPayload) => void;

  update_qna: (data: UpdateQnaSubPayload) => void;

  update_qna_detail: (data: UpdateQnaFullPayload) => void;

  poll_end: (data: EndPollPayload) => void;

  poll_end_detail: (data: EndPollDetailPayload) => void;

  qna_end: (data: EndQnaPayload) => void;

  qna_end_detail: (data: EndQnaDetailPayload) => void;

  new_chat: (data: ChatMessage) => void;

  score_update: (data: ScoreUpdatePayload) => void;

  rank_update: (data: RankUpdatePayload) => void;

  presenter_rank_update: (data: PresenterScoreInfoPayload) => void;

  speaker_detected: (data: SpeakerDetectedPayload) => void;
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

  close_producer: (data: CloseProducerRequest, cb: (res: CloseProducerResponse) => void) => void;

  consume: (data: ConsumeRequest, cb: (res: ConsumeResponse) => void) => void;

  consume_resume: (data: ConsumeResumeRequest, cb: (res: ConsumeResumeResponse) => void) => void;

  close_consumer: (data: CloseConsumerRequest, cb: (res: CloseConsumerResponse) => void) => void;

  toggle_media: (data: ToggleMediaRequest, cb: (res: ToggleMediaResponse) => void) => void;

  get_producer: (data: GetProducerRequest, cb: (res: GetProducerResponse) => void) => void;

  leave_room: (data: LeaveRoomRequest, cb: (res: LeaveRoomResponse) => void) => void;

  action_gesture: (data: ActionGestureRequest, cb: (res: ActionGestureResponse) => void) => void;

  break_room: (data: BreakRoomRequest, cb: (res: BreakRoomResponse) => void) => void;

  create_poll: (data: CreatePollRequest, cb: (res: CreatePollResponse) => void) => void;

  create_qna: (data: CreateQnaRequest, cb: (res: CreateQnaResponse) => void) => void;

  get_poll: (data: GetPollRequest, cb: (res: GetPollResponse) => void) => void;

  get_active_poll: (data: GetActivePollRequest, cb: (res: GetActivePollResponse) => void) => void;

  get_qna: (data: GetQnaRequest, cb: (res: GetQnaResponse) => void) => void;

  get_active_qna: (data: GetActiveQnaRequest, cb: (res: GetActiveQnaResponse) => void) => void;

  emit_poll: (data: EmitPollRequest, cb: (res: EmitPollResponse) => void) => void;

  emit_qna: (data: EmitQnaRequest, cb: (res: EmitQnaResponse) => void) => void;

  vote: (data: VoteRequest, cb: (res: VoteResponse) => void) => void;

  answer: (data: AnswerRequest, cb: (res: AnswerResponse) => void) => void;

  break_poll: (data: BreakPollRequest, cb: (res: BreakPollResponse) => void) => void;

  break_qna: (data: BreakQnaRequest, cb: (res: BreakQnaResponse) => void) => void;

  get_presentation: (
    data: GetPresentationRequest,
    cb: (res: GetPresentationResponse) => void,
  ) => void;

  send_chat: (data: SendChatRequest, cb: (res: SendChatResponse) => void) => void;

  sync_chat: (data: SyncChatRequest, cb: (res: SyncChatResponse) => void) => void;

  get_activity_score_rank: (
    data: GetActivityScoreRankRequest,
    cb: (res: GetActivityScoreRank) => void,
  ) => void;
}
