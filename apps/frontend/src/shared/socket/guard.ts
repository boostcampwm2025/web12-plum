import { SocketEventName, SocketFailResponse } from './types';

/** 소켓 실패 응답 타입 가드 */
export function isSocketFailResponse<E extends SocketEventName>(
  error: unknown,
): error is SocketFailResponse<E> {
  const isFailResponse =
    typeof error === 'object' && error !== null && 'success' in error && !error.success;

  return isFailResponse;
}
