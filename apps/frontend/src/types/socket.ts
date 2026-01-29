import { ClientToServerEvents, ServerToClientEvents } from '@plum/shared-interfaces';
import { Socket } from 'socket.io-client';

/**
 * 공통 인터페이스로 정의된 타입을 사용한 소켓 타입
 */
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * 소켓 통신 관련 타입 정의
 */
export type SocketDomain =
  | 'room' // 강의실 / 세션 관련
  | 'media' // 미디어 스트림 관련
  | 'poll' // 실시간 투표 관련
  | 'qna' // 실시간 Q&A 관련
  | 'gesture' // 실시간 제스처 관련
  | 'presentation' // 발표 자료 관련
  | 'rank'; // 참여도 관련

/**
 * 소켓 이벤트 이름 타입
 */
export type SocketEventName = keyof ClientToServerEvents;

/**
 * 소켓 요청 페이로드 추출 (인자가 2개면 첫 번째 인자, 1개면(콜백만 있으면) void)
 */
export type SocketEventPayload<E extends SocketEventName> = ClientToServerEvents[E] extends (
  data: infer P,
  // 콜백 파라미터 무시를 위해 any 사용
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cb: (res: any) => void,
) => void
  ? //  첫 번째 인자가 콜백인지 체크
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    P extends (res: any) => void
    ? void // 첫 번째 인자가 콜백인 경우 (데이터 없음)
    : P
  : void;

/**
 * 소켓 이벤트의 ack 응답(Callback의 인자) 추출 헬퍼
 * 순서 변경: 콜백만 있는 경우를 먼저 체크
 */
type ExtractCallbackResponse<T> = T extends (cb: (res: infer R) => void) => void
  ? R
  : T extends (
        // 타입 추론을 위해 any 사용
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: any,
        cb: (res: infer R) => void,
      ) => void
    ? R
    : never;

/**
 * 소켓 이벤트의 ack 응답(Callback의 인자) 추출
 * 콜백의 인자가 없는 경우 never 반환
 */
export type SocketEventResponse<E extends SocketEventName> = ExtractCallbackResponse<
  ClientToServerEvents[E]
>;

/**
 * 성공 응답 타입으로 변환하는 헬퍼
 * - success: true인 타입은 그대로 유지
 * - success: false인 타입은 제거 (never)
 * - success: boolean인 타입은 success를 true로 좁힘
 */
type ToSuccessResponse<T> = T extends { success: true }
  ? T // 이미 success: true
  : T extends { success: false }
    ? never // success: false는 제거
    : T extends { success: boolean }
      ? Omit<T, 'success'> & { success: true } // success: boolean을 true로 좁힘
      : T;

/**
 * 소켓 성공 응답만 추출
 * SocketEventResponse<E>가 유니온 타입일 때, success: false인 멤버를 제거
 * BaseResponse(success: boolean)인 경우는 success를 true로 좁힙니다.
 */
export type SocketSuccessResponse<E extends SocketEventName> = ToSuccessResponse<
  SocketEventResponse<E>
>;

/**
 * 소켓 에러 응답 타입
 */
export interface SocketErrorResponse {
  domain: SocketDomain;
  code: string;
  message: string;
}
