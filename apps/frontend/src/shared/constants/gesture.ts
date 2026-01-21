import type { GestureType } from '@plum/shared-interfaces';
import type { IconName } from '@/shared/components/icon/iconMap';

export const GESTURE_ICON_MAP: Record<GestureType, IconName> = {
  thumbs_up: 'thumbs-up',
  thumbs_down: 'thumbs-down',
  hand_raise: 'hand-raise',
  ok_sign: 'circle-check',
  x_sign: 'gesture-x',
  o_sign: 'gesture-o',
  one: 'one',
  two: 'two',
  three: 'three',
  four: 'four',
};

export const GESTURE_BG_CLASS: Record<GestureType, string> = {
  thumbs_up: 'bg-success/60',
  thumbs_down: 'bg-error/60',
  hand_raise: 'bg-primary/60',
  ok_sign: 'bg-[#4796FF]/60',
  x_sign: 'bg-error/60',
  o_sign: 'bg-success/60',
  one: 'bg-gray-500/60',
  two: 'bg-gray-500/60',
  three: 'bg-gray-500/60',
  four: 'bg-gray-500/60',
};
