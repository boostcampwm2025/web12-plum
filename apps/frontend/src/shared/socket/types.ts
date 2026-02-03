import { ClientToServerEvents, ServerToClientEvents } from '@plum/shared-interfaces';
import { Socket } from 'socket.io-client';

// 공통 인터페이스가 지정된 소켓
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// 소켓 이벤트 이름
export type SocketEventName = keyof ClientToServerEvents;
export type SocketEventNameFromServer = keyof ServerToClientEvents;

// 서비스 도메인 지정 타입
export type SocketDomain =
  | 'room'
  | 'media'
  | 'poll'
  | 'qna'
  | 'gesture'
  | 'presentation'
  | 'rank'
  | 'chat';

/**
 * 콜백에서 응답 타입 추출
 * (cb) => void | (data, cb) => void 에서 Response 타입 추출
 */
type ExtractResponse<T> = T extends (cb: (res: infer R) => void) => void
  ? R
  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends (data: any, cb: (res: infer R) => void) => void
    ? R
    : never;

/**
 * 이벤트에서 페이로드 추출
 * (cb) => void 일 때, void
 * (data, cb) => void 일 때, data
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtractPayload<T> = T extends (cb: (res: any) => void) => void
  ? void
  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends (data: infer P, cb: (res: any) => void) => void
    ? P
    : void;

// 소켓 이벤트 페이로드 및 응답 타입
export type SocketEventPayload<E extends SocketEventName> = ExtractPayload<ClientToServerEvents[E]>;
export type SocketEventResponse<E extends SocketEventName> = ExtractResponse<
  ClientToServerEvents[E]
> & { success: boolean };

// 성공 응답 타입 추출
export type SocketSuccessResponse<E extends SocketEventName> = Extract<
  SocketEventResponse<E>,
  { success: true }
>;

// 실패 응답 타입 추출
export type SocketFailResponse<E extends SocketEventName> = Exclude<
  SocketEventResponse<E>,
  { success: true }
>;

// 서버 이벤트 핸들러 및 페이로드 타입
export type ServerEventHandler = ServerToClientEvents[SocketEventNameFromServer];
export type SocketHandlerPayload<E extends SocketEventNameFromServer> = Parameters<
  ServerToClientEvents[E]
>[0];

// on 메서드 타입 단언
export type SocketOnType = <E extends SocketEventNameFromServer>(
  event: E,
  listener: ServerToClientEvents[E],
) => TypedSocket;

// off 메서드 타입 단언
export type SocketOffType = <E extends SocketEventNameFromServer>(
  event: E,
  listener?: ServerToClientEvents[E],
) => TypedSocket;

// 페이로드 없는 이벤트 콜백 타입
export type EmitWithCallbackNoPayload = <E extends SocketEventName>(
  event: E,
  callback: (response: SocketEventResponse<E>) => void,
) => void;

// 페이로드 있는 이벤트 콜백 타입
export type EmitWithCallbackWithPayload = <E extends SocketEventName>(
  event: E,
  data: SocketEventPayload<E>,
  callback: (response: SocketEventResponse<E>) => void,
) => void;
