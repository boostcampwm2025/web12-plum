import { z } from 'zod';

/**
 * QnA 폼 유효성 검사 제약 조건
 */
export const VALIDATION_CONSTRAINTS = {
  TITLE: {
    MAX_LENGTH: 50,
  },
  TIME_LIMIT: {
    MIN_VALUE: 0,
    MAX_VALUE: 600,
  },
} as const;

/**
 * QnA 폼 스키마
 */
export const qnaFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'QnA 제목을 입력해주세요')
    .max(
      VALIDATION_CONSTRAINTS.TITLE.MAX_LENGTH,
      `QnA 제목은 ${VALIDATION_CONSTRAINTS.TITLE.MAX_LENGTH}자 이하여야 합니다`,
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
  isPublic: z.boolean(),
});

/**
 * QnA 폼 키 열거형
 */
export const QNA_FORM_KEYS = qnaFormSchema.keyof().enum;

/**
 * QnA 폼 타입
 */
export type QnAFormValues = z.infer<typeof qnaFormSchema>;

/**
 * QnA 폼 기본값
 */
export const qnaFormDefaultValues: QnAFormValues = {
  title: '',
  timeLimit: 0,
  isPublic: false,
};
