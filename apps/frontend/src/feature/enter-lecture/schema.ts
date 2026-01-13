import { z } from 'zod';

/**
 * 강의 생성 폼의 제약 조건
 */
export const ENTER_LECTURE_CONSTRAINTS = {
  NICKNAME: { MIN: 2, MAX: 16 },
} as const;

/**
 * 강의 생성 폼 스키마
 */
export const enterLectureSchema = z.object({
  name: z.string(),
  nickname: z
    .string()
    .trim()
    .min(
      ENTER_LECTURE_CONSTRAINTS.NICKNAME.MIN,
      `닉네임은 ${ENTER_LECTURE_CONSTRAINTS.NICKNAME.MIN}자 이상이어야 합니다.`,
    )
    .max(
      ENTER_LECTURE_CONSTRAINTS.NICKNAME.MAX,
      `닉네임은 ${ENTER_LECTURE_CONSTRAINTS.NICKNAME.MAX}자 이하여야 합니다.`,
    ),
  isAgreed: z.boolean().refine((val) => val === true, {
    message: '데이터 수집에 동의해야 강의실을 입장할 수 있습니다.',
  }),
  isAudioOn: z.boolean(),
  isVideoOn: z.boolean(),
});

/**
 * 강의 생성 폼 값 타입
 */
export type EnterLectureValues = z.infer<typeof enterLectureSchema>;

/**
 * 강의 생성 폼 키 배열
 */
export const ENTER_LECTURE_KEYS = enterLectureSchema.keyof().enum;

/**
 * 강의 생성 폼 기본 값
 */
export const enterLectureDefaultValues: EnterLectureValues = {
  name: '',
  nickname: '',
  isAgreed: false,
  isAudioOn: false,
  isVideoOn: false,
};
