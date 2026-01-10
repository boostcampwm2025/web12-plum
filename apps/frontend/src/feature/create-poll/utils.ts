import { PollOption } from './types';

/**
 * 선택지 고유 ID 생성 함수
 * @returns 고유 ID 문자열
 */
export function generateOptionId(): string {
  const id = `option-${Date.now()}-${Math.random().toString(36)}`;
  return id;
}

/**
 * 빈 선택지 배열 생성 함수
 */
export function createEmptyOptions(count: number): PollOption[] {
  return Array.from({ length: count }, () => ({
    id: generateOptionId(),
    value: '',
  }));
}
