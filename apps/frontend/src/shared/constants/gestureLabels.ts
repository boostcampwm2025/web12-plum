import type { GestureType } from '@plum/shared-interfaces';

export const GESTURE_LABEL_MAP: Record<GestureType, string> = {
  thumbs_up: '엄지 업',
  thumbs_down: '엄지 다운',
  hand_raise: '손들기',
  ok_sign: 'OK',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  x_sign: 'X',
  o_sign: 'O',
};

export function formatGestureMessage(participantName: string, gesture: GestureType): string {
  const label = GESTURE_LABEL_MAP[gesture];
  return `${participantName}님이 ${label} 제스처를 취했습니다.`;
}
