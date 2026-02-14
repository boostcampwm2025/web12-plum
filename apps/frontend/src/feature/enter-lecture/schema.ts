import { enterLectureSchema } from '@plum/shared-interfaces';
import z from 'zod';

/**
 * 강의실 입장 스키마
 *
 * `enterLectureSchema`를 기반으로 내부 사용을 위한 `_nicknameChecked` 필드 추가
 * _nicknameChecked`: 닉네임 중복 확인 여부를 나타내는 선택적 불리언 필드
 */
export const enterLectureFormSchema = enterLectureSchema.extend({
  _nicknameChecked: z.boolean(),
});

/**
 * 강의실 입장 폼 값 타입
 */
export type EnterLectureFormValues = z.infer<typeof enterLectureFormSchema>;

/**
 * 강의실 입장 폼 키 열거형
 */
export const ENTER_LECTURE_KEYS = enterLectureFormSchema.keyof().enum;

/**
 * 강의 입장 폼의 기본값
 */
export const enterLectureDefaultValues: EnterLectureFormValues = {
  name: '',
  nickname: '',
  isAgreed: false,
  isAudioOn: false,
  isVideoOn: false,
  _nicknameChecked: false,
};
