import { z } from 'zod';
import { Status } from './shared.js';

/**
 * 투표 선택지 개수 제한
 */
export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 5;

/**
 * 투표 폼 유효성 검사 제약 조건
 */
export const POLL_VALIDATION_CONSTRAINTS = {
  TITLE: {
    MAX_LENGTH: 50,
  },
  OPTIONS: {
    MIN_COUNT: 2,
    MAX_COUNT: 5,
    MAX_OPTION_LENGTH: 50,
  },
  TIME_LIMIT: {
    MIN_VALUE: 0,
    MAX_VALUE: 600,
  },
} as const;

/**
 * 투표 선택지 스키마
 */
const pollOptionSchema = z.object({
  value: z
    .string()
    .trim()
    .min(1, '선택지를 입력해주세요')
    .max(
      POLL_VALIDATION_CONSTRAINTS.OPTIONS.MAX_OPTION_LENGTH,
      `각 선택지는 ${POLL_VALIDATION_CONSTRAINTS.OPTIONS.MAX_OPTION_LENGTH}자 이하여야 합니다`,
    ),
});

/**
 * 투표 폼 스키마
 */
export const pollFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, '투표 제목을 입력해주세요')
    .max(
      POLL_VALIDATION_CONSTRAINTS.TITLE.MAX_LENGTH,
      `투표 제목은 ${POLL_VALIDATION_CONSTRAINTS.TITLE.MAX_LENGTH}자 이하여야 합니다`,
    ),
  options: z
    .array(pollOptionSchema)
    .min(
      POLL_VALIDATION_CONSTRAINTS.OPTIONS.MIN_COUNT,
      `최소 ${POLL_VALIDATION_CONSTRAINTS.OPTIONS.MIN_COUNT}개 이상의 선택지가 필요합니다`,
    )
    .max(
      POLL_VALIDATION_CONSTRAINTS.OPTIONS.MAX_COUNT,
      `최대 ${POLL_VALIDATION_CONSTRAINTS.OPTIONS.MAX_COUNT}개 까지 선택지를 추가할 수 있습니다`,
    ),
  timeLimit: z
    .number()
    .min(
      POLL_VALIDATION_CONSTRAINTS.TIME_LIMIT.MIN_VALUE,
      `제한 시간은 ${POLL_VALIDATION_CONSTRAINTS.TIME_LIMIT.MIN_VALUE} 이상이어야 합니다`,
    )
    .max(
      POLL_VALIDATION_CONSTRAINTS.TIME_LIMIT.MAX_VALUE,
      `제한 시간은 ${POLL_VALIDATION_CONSTRAINTS.TIME_LIMIT.MAX_VALUE}초 이하여야 합니다`,
    ),
});

export interface Voter {
  id: string;
  name: string;
}

export interface PollOption {
  id: number;
  value: string;
  count: number;
  voters: Voter[];
}

export interface Poll {
  id: string;
  roomId: string;
  status: Status;
  title: string;
  options: PollOption[];
  timeLimit: number;
  createdAt: string;
  updatedAt: string;
  startedAt: string;
  endedAt: string;
}

export interface PollPayload {
  id: string;
  title: string;
  options: PollOption[];
  timeLimit: number;
  startedAt: string;
  endedAt: string;
}
