import { z } from 'zod';

/**
 * 투표 폼 유효성 검사 제약 조건
 */
export const VALIDATION_CONSTRAINTS = {
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
      VALIDATION_CONSTRAINTS.OPTIONS.MAX_OPTION_LENGTH,
      `각 선택지는 ${VALIDATION_CONSTRAINTS.OPTIONS.MAX_OPTION_LENGTH}자 이하여야 합니다`,
    ),
});

/**
 * 투표 폼 스키마
 */
export const pollFormSchema = z.object({
  title: z
    .string()
    .min(1, '투표 제목을 입력해주세요')
    .max(
      VALIDATION_CONSTRAINTS.TITLE.MAX_LENGTH,
      `투표 제목은 ${VALIDATION_CONSTRAINTS.TITLE.MAX_LENGTH}자 이하여야 합니다`,
    ),
  options: z
    .array(pollOptionSchema)
    .min(
      VALIDATION_CONSTRAINTS.OPTIONS.MIN_COUNT,
      `최소 ${VALIDATION_CONSTRAINTS.OPTIONS.MIN_COUNT}개 이상의 선택지가 필요합니다`,
    )
    .max(
      VALIDATION_CONSTRAINTS.OPTIONS.MAX_COUNT,
      `최대 ${VALIDATION_CONSTRAINTS.OPTIONS.MAX_COUNT}개 까지 선택지를 추가할 수 있습니다`,
    ),
  timeLimit: z
    .number()
    .min(
      VALIDATION_CONSTRAINTS.TIME_LIMIT.MIN_VALUE,
      `제한 시간은 ${VALIDATION_CONSTRAINTS.TIME_LIMIT.MIN_VALUE} 이상이어야 합니다`,
    )
    .max(
      VALIDATION_CONSTRAINTS.TIME_LIMIT.MAX_VALUE,
      `제한 시간은 ${VALIDATION_CONSTRAINTS.TIME_LIMIT.MAX_VALUE}초 이하여야 합니다`,
    ),
});

/**
 * 투표 폼 키 열거형
 */
export const POLL_FORM_KEYS = pollFormSchema.keyof().enum;

/**
 * 투표 폼 타입
 */
export type PollFormValues = z.infer<typeof pollFormSchema>;

/**
 * 투표 폼 기본값
 */
export const pollFormDefaultValues: PollFormValues = {
  title: '',
  options: [{ value: '' }, { value: '' }],
  timeLimit: 0,
};
