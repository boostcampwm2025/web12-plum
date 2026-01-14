import { z } from 'zod';
import { type Status } from './shared.js';

/**
 * QnA 폼 유효성 검사 제약 조건
 */
export const QNA_VALIDATION_CONSTRAINTS = {
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
      QNA_VALIDATION_CONSTRAINTS.TITLE.MAX_LENGTH,
      `QnA 제목은 ${QNA_VALIDATION_CONSTRAINTS.TITLE.MAX_LENGTH}자 이하여야 합니다`,
    ),
  timeLimit: z
    .number()
    .min(
      QNA_VALIDATION_CONSTRAINTS.TIME_LIMIT.MIN_VALUE,
      `제한 시간은 ${QNA_VALIDATION_CONSTRAINTS.TIME_LIMIT.MIN_VALUE} 이상이어야 합니다`,
    )
    .max(
      QNA_VALIDATION_CONSTRAINTS.TIME_LIMIT.MAX_VALUE,
      `제한 시간은 ${QNA_VALIDATION_CONSTRAINTS.TIME_LIMIT.MAX_VALUE}초 이하여야 합니다`,
    ),
  isPublic: z.boolean(),
});

export interface Qna {
  id: string;
  roomId: string;
  status: Status;
  title: string;
  timeLimit: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}
