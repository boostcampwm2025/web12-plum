import { CreateRoomRequest, createLectureSchema } from '@plum/shared-interfaces';

/**
 * 강의 생성 폼 키 배열
 */
export const LECTURE_FORM_KEYS = createLectureSchema.keyof().enum;

/**
 * 강의 생성 폼 기본 값
 */
export const lectureFormDefaultValues: CreateRoomRequest = {
  name: '',
  hostName: '',
  isAgreed: false,
  polls: [],
  qnas: [],
  presentationFiles: [],
};
