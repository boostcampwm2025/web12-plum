import { z } from 'zod';
import { pollFormSchema } from '@/shared/constants/poll';
import { qnaFormSchema } from '@/shared/constants/qna';

/**
 * 강의 생성 폼의 제약 조건
 */
export const LECTURE_CONSTRAINTS = {
  NAME: { MIN: 5, MAX: 30 },
  HOST: { MIN: 2, MAX: 16 },
} as const;

/**
 * 강의 생성 폼 스키마
 */
export const createLectureSchema = z.object({
  name: z
    .string()
    .trim()
    .min(
      LECTURE_CONSTRAINTS.NAME.MIN,
      `강의실 이름은 ${LECTURE_CONSTRAINTS.NAME.MIN}자 이상이어야 합니다.`,
    )
    .max(
      LECTURE_CONSTRAINTS.NAME.MAX,
      `강의실 이름은 ${LECTURE_CONSTRAINTS.NAME.MAX}자 이하여야 합니다.`,
    ),
  hostName: z
    .string()
    .trim()
    .min(
      LECTURE_CONSTRAINTS.HOST.MIN,
      `호스트 이름은 ${LECTURE_CONSTRAINTS.HOST.MIN}자 이상이어야 합니다.`,
    )
    .max(
      LECTURE_CONSTRAINTS.HOST.MAX,
      `호스트 이름은 ${LECTURE_CONSTRAINTS.HOST.MAX}자 이하여야 합니다.`,
    ),
  isAgreed: z.boolean().refine((val) => val === true, {
    message: '데이터 수집에 동의해야 강의실을 생성할 수 있습니다.',
  }),

  polls: z.array(pollFormSchema),
  qnas: z.array(qnaFormSchema),
  presentationFiles: z.array(z.instanceof(File)),
});

/**
 * 강의 생성 폼 값 타입
 */
export type CreateLectureFormValues = z.infer<typeof createLectureSchema>;

/**
 * 강의 생성 폼 키 배열
 */
export const LECTURE_FORM_KEYS = createLectureSchema.keyof().enum;

/**
 * 강의 생성 폼 기본 값
 */
export const lectureFormDefaultValues: CreateLectureFormValues = {
  name: '',
  hostName: '',
  isAgreed: false,
  polls: [],
  qnas: [],
  presentationFiles: [],
};
