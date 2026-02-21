import { ClientToServerEvents, ServerToClientEvents } from '@plum/shared-interfaces';
import { Socket } from 'socket.io-client';

// 양방향 이벤트 타입이 지정된 socket.io 클라이언트 인스턴스
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// 클라이언트 -> 서버 이벤트 이름 유니온
export type SocketEventName = keyof ClientToServerEvents;

// 서버 -> 클라이언트 이벤트 이름 유니온
export type SocketEventNameFromServer = keyof ServerToClientEvents;

// 이벤트 이름 E에 해당하는 ClientToServerEvents 함수 시그니처
type ClientEventFn<E extends SocketEventName> = ClientToServerEvents[E];

// ClientEventFn<E>의 매개변수 튜플
type ClientEventParams<E extends SocketEventName> = Parameters<ClientEventFn<E>>;

/**
 * 이벤트 E의 서버 응답 중 성공(success: true) 브랜치 타입
 * - ClientToServerEvents 콜백의 첫 번째 인자를 Extract로 좁힘
 */
export type SocketSuccessResponse<E extends SocketEventName> = Extract<
  Parameters<ClientEventParams<E>[1]>[0],
  { success: true }
>;

/**
 * 이벤트 E의 서버 응답 중 실패(success: false) 브랜치 타입
 * - SocketSuccessResponse와 반대로 Exclude로 필터링
 */
export type SocketFailResponse<E extends SocketEventName> = Exclude<
  Parameters<ClientEventParams<E>[1]>[0],
  { success: true }
>;

// ServerToClientEvents.on 메서드 시그니처 타입
export type SocketOnType = (
  event: SocketEventNameFromServer,
  listener: ServerToClientEvents[SocketEventNameFromServer],
) => TypedSocket;

// ServerToClientEvents.off 메서드 시그니처 타입
export type SocketOffType = (
  event: SocketEventNameFromServer,
  listener?: ServerToClientEvents[SocketEventNameFromServer],
) => TypedSocket;

/**
 * T가 정확히 Record<string, never>(빈 객체)인지 양방향 extends로 판별
 * - 단방향 extends만으로는 서브타입을 잘못 판단할 수 있어 쌍방향 체크로 정확도 확보
 * - payload 없는 소켓 이벤트를 선택적 매개변수로 처리하기 위해 사용
 */
type IsEmptyRecord<T> = [T] extends [Record<string, never>]
  ? [Record<string, never>] extends [T]
    ? true
    : false
  : false;

/**
 * emitWithAck 호출 시 data 인자 튜플 타입
 * - data가 빈 객체(payload 없는 이벤트)이면 선택적(optional), 그 외엔 필수
 * - 튜플로 정의해 스프레드 인자(...args)에 그대로 사용 가능
 */
export type EmitWithAckArgs<E extends SocketEventName> =
  IsEmptyRecord<ClientEventParams<E>[0]> extends true
    ? [data?: ClientEventParams<E>[0]]
    : [data: ClientEventParams<E>[0]];

/**
 * socket.emitWithAck 커스텀 오버로드 타입
 * - 이벤트별로 data 선택성이 다르므로 제네릭 조건부 타입 적용
 * - 반환값은 서버 응답(success | fail 유니온)의 Promise
 */
export type EmitWithAckType = <E extends SocketEventName>(
  event: E,
  ...args: EmitWithAckArgs<E>
) => Promise<Parameters<ClientEventParams<E>[1]>[0]>;

/**
 * 서버 응답이 성공인지 판별하는 type predicate
 * - 제네릭 conditional type 내부에서는 discriminant로 자동 narrowing 불가
 * - isSuccessResponse로 명시적으로 좁혀야 SocketSuccessResponse<E> 타입 보장
 */
export function isSuccessResponse<E extends SocketEventName>(
  response: unknown,
): response is SocketSuccessResponse<E> {
  return (response as { success: boolean }).success === true;
}
