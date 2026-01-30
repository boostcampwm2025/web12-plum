import { z } from 'zod';

export type ParticipantRole = 'presenter' | 'audience';

export const NICKNAME_CONSTRAINT = { MIN: 2, MAX: 16 };

export interface Participant {
  id: string;
  roomId: string;
  currentRoomId: string;
  name: string;
  role: ParticipantRole;
  cameraEnable: boolean;
  micEnable: boolean;
  screenEnable: boolean;
  transports: string[];
  producers: {
    audio: string;
    video: string;
    screen: string;
  };
  consumers: string[];
  joinedAt: string;
}

export interface ParticipantPayload {
  id: string;
  name: string;
  role: string;
  joinedAt: Date;
}

export const nicknameValidate = z.object({
  nickname: z
    .string()
    .trim()
    .min(NICKNAME_CONSTRAINT.MIN, `닉네임은 ${NICKNAME_CONSTRAINT.MIN}자 이상이어야 합니다.`)
    .max(NICKNAME_CONSTRAINT.MAX, `닉네임은 ${NICKNAME_CONSTRAINT.MAX}자 이하여야 합니다.`),
});
