import { z } from 'zod';
import { Poll, pollFormSchema } from './poll.js';
import { Qna, qnaFormSchema } from './qna.js';
import { type Status } from './shared.js';
import { FileInfo, fileSchema } from './file.js';
import { NICKNAME_CONSTRAINT } from './participant.js';
import { ActivityStatistics } from './score.js';

/**
 * 강의 생성 폼의 제약 조건
 */
export const LECTURE_CONSTRAINTS = {
  NAME: { MIN: 5, MAX: 30 },
  HOST: NICKNAME_CONSTRAINT,
  FILES: { MAX: 5 },
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
  presentationFiles: z
    .array(fileSchema)
    .max(
      LECTURE_CONSTRAINTS.FILES.MAX,
      `파일은 최대 ${LECTURE_CONSTRAINTS.FILES.MAX}개까지 업로드 가능합니다.`,
    )
    .optional(),
});

export const enterLectureSchema = z.object({
  name: z.string(),
  nickname: z
    .string()
    .trim()
    .min(NICKNAME_CONSTRAINT.MIN, `닉네임은 ${NICKNAME_CONSTRAINT.MIN}자 이상이어야 합니다.`)
    .max(NICKNAME_CONSTRAINT.MAX, `닉네임은 ${NICKNAME_CONSTRAINT.MAX}자 이하여야 합니다.`),
  isAgreed: z.boolean().refine((val) => val === true, {
    message: '데이터 수집에 동의해야 강의실을 입장할 수 있습니다.',
  }),
  isAudioOn: z.boolean(),
  isVideoOn: z.boolean(),
});

export interface Room {
  id: string;
  name: string;
  presenter: string;
  status: Status;
  createdAt: string;
  startedAt: string;
  endedAt: string;
  files: FileInfo[];
}

export interface RoomSummary {
  name: string;
  roomId: string;
  summary: string; // ai 요약
  timelines: string; // ai 요약 - 타임라인
  polls: Poll[];
  qnas: Qna[];
  activityStatistics: ActivityStatistics;
}
