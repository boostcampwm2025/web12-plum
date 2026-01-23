import { z } from 'zod';
import { qnaFormSchema } from '@plum/shared-interfaces';

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

export { qnaFormSchema };
