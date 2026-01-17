type Landmark = { x: number; y: number };

const LANDMARK_INDEX = {
  thumbTip: 4,
  indexTip: 8,
  middleTip: 12,
  ringTip: 16,
  pinkyTip: 20,
  indexPip: 6,
  middlePip: 10,
  ringPip: 14,
  pinkyPip: 18,
} as const;

const OK_PINCH_THRESHOLD = 0.06;
const EXTENDED_FINGER_DELTA = 0.02;

const isFingerExtended = (landmarks: Landmark[], tip: number, pip: number) =>
  landmarks[tip].y + EXTENDED_FINGER_DELTA < landmarks[pip].y;

export const isOkSign = (landmarks: Landmark[]) => {
  const thumb = landmarks[LANDMARK_INDEX.thumbTip];
  const index = landmarks[LANDMARK_INDEX.indexTip];
  const pinchDistance = Math.hypot(thumb.x - index.x, thumb.y - index.y);

  if (pinchDistance > OK_PINCH_THRESHOLD) {
    return false;
  }

  const middleExtended = isFingerExtended(
    landmarks,
    LANDMARK_INDEX.middleTip,
    LANDMARK_INDEX.middlePip,
  );
  const ringExtended = isFingerExtended(landmarks, LANDMARK_INDEX.ringTip, LANDMARK_INDEX.ringPip);
  const pinkyExtended = isFingerExtended(
    landmarks,
    LANDMARK_INDEX.pinkyTip,
    LANDMARK_INDEX.pinkyPip,
  );

  return middleExtended && ringExtended && pinkyExtended;
};
