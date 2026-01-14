import { EnterLectureRequestBody, enterLectureSchema } from '@plum/shared-interfaces';

/**
 * 강의 생성 폼 키 배열
 */
export const ENTER_LECTURE_KEYS = enterLectureSchema.keyof().enum;

/**
 * 강의 생성 폼 기본 값
 */
export const enterLectureDefaultValues: EnterLectureRequestBody = {
  name: '',
  nickname: '',
  isAgreed: false,
  isAudioOn: false,
  isVideoOn: false,
};
