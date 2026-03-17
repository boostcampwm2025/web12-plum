import { SocketEventName, SocketFailResponse } from './types';

/**
 * 소켓 서버 에러를 Error 인스턴스로 래핑
 * - 서버에서 success: false 응답이 올 때 SocketError throw
 * - event: 에러가 발생한 소켓 이벤트 이름
 * - response: 서버에서 반환된 실패 응답 데이터
 */
export class SocketError<E extends SocketEventName = SocketEventName> extends Error {
  readonly event: E;
  readonly response: SocketFailResponse<E>;

  constructor(event: E, response: SocketFailResponse<E>) {
    super(response?.error ?? '소켓 오류');
    this.name = 'SocketError';
    this.event = event;
    this.response = response;
  }

  // 특정 이벤트 타입으로 좁히는 타입 가드
  isEvent<T extends SocketEventName>(event: T): this is SocketError<T> {
    return (this.event as SocketEventName) === event;
  }
}
