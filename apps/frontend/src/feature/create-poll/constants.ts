/**
 * 시간 제한 옵션 배열
 */
export const TIME_LIMIT_OPTIONS = [
  { label: '제한 없음', value: 0 },
  { label: '30초', value: 30 },
  { label: '1분', value: 60 },
  { label: '3분', value: 180 },
  { label: '5분', value: 300 },
  { label: '10분', value: 600 },
] as const;

/**
 * 기본 시간 제한 값 (초 단위)
 */
export const DEFAULT_TIME_LIMIT = 0;
