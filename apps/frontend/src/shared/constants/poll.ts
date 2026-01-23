import { z } from 'zod';
import { MAX_POLL_OPTIONS, MIN_POLL_OPTIONS, pollFormSchema } from '@plum/shared-interfaces';

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

export { MAX_POLL_OPTIONS, MIN_POLL_OPTIONS, pollFormSchema };
