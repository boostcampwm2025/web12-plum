import { ApiError } from './types';

/**
 * 사용자가 취할 수 있는 행동 기준으로 분류
 */
export type ErrorAction = 'retry' | 'check-input' | 'check-network' | 'report';

export interface UserFriendlyError {
  action: ErrorAction;
  title: string;
  description?: string;
}

const ERROR_MAP: Record<ErrorAction, UserFriendlyError> = {
  retry: {
    action: 'retry',
    title: '일시적인 문제가 발생했습니다.',
    description: '잠시 후 다시 시도해주세요.',
  },
  'check-input': {
    action: 'check-input',
    title: '입력 내용을 확인해주세요.',
  },
  'check-network': {
    action: 'check-network',
    title: '네트워크 연결을 확인해주세요.',
    description: '인터넷 연결 상태를 확인 후 다시 시도해주세요.',
  },
  report: {
    action: 'report',
    title: '문제가 발생했습니다.',
    description: '문제가 지속되면 관리자에게 문의해주세요.',
  },
};

/**
 * 에러를 사용자 친화적인 메시지로 변환
 * - 기술적 디테일(401, 403, 404 등)은 숨기고 행동 가능한 메시지만 노출
 */
export function getUserFriendlyError(error: unknown): UserFriendlyError {
  // API 에러가 아닌 버그/예상치 못한 에러
  if (!(error instanceof ApiError)) {
    return ERROR_MAP.report;
  }

  const { statusCode } = error;

  // 네트워크 에러 (statusCode 없음)
  if (!statusCode) {
    return ERROR_MAP['check-network'];
  }

  // 서버 에러 (5xx) → 재시도
  if (statusCode >= 500) {
    return ERROR_MAP.retry;
  }

  // 입력 오류 (400, 422)
  if (statusCode === 400 || statusCode === 422) {
    return ERROR_MAP['check-input'];
  }

  // 그 외 4xx (401, 403, 404, 409 등) → 일반 메시지
  return ERROR_MAP.report;
}
