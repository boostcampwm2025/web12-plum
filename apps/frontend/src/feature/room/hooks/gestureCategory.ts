import type { GestureType } from '@plum/shared-interfaces';

export const GESTURE_CATEGORIES = {
  numeric: ['one', 'two', 'three', 'four'],
  reaction: ['thumbs_up', 'thumbs_down', 'hand_raise', 'ok_sign'],
  pose: ['o_sign', 'x_sign'],
} as const;

export type GestureCategory = keyof typeof GESTURE_CATEGORIES;

export function getGestureCategory(gesture: GestureType): GestureCategory {
  for (const [category, gestures] of Object.entries(GESTURE_CATEGORIES)) {
    if ((gestures as readonly string[]).includes(gesture)) {
      return category as GestureCategory;
    }
  }
  return 'reaction';
}

export type NumericGesture = (typeof GESTURE_CATEGORIES.numeric)[number];

export function isNumericGesture(gesture: GestureType): gesture is NumericGesture {
  return GESTURE_CATEGORIES.numeric.includes(gesture as NumericGesture);
}
