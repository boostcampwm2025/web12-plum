type PoseLandmark = { x: number; y: number };

const POSE_WRIST_ABOVE_SHOULDER_OFFSET = 0.03;
const POSE_WRIST_O_MIN = 0.18;
const POSE_WRIST_O_MAX = 0.4;
const POSE_ELBOW_O_MIN = 0.2;
const POSE_ELBOW_O_MAX = 0.65;

export const isPoseO = (landmarks: PoseLandmark[]) => {
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];

  const wristsAboveShoulders =
    leftWrist.y < leftShoulder.y - POSE_WRIST_ABOVE_SHOULDER_OFFSET &&
    rightWrist.y < rightShoulder.y - POSE_WRIST_ABOVE_SHOULDER_OFFSET;
  const wristsDistance = Math.hypot(leftWrist.x - rightWrist.x, leftWrist.y - rightWrist.y);
  const elbowsDistance = Math.hypot(leftElbow.x - rightElbow.x, leftElbow.y - rightElbow.y);
  const elbowsAboveShoulders = leftElbow.y < leftShoulder.y && rightElbow.y < rightShoulder.y;
  const wristsInRange = wristsDistance > POSE_WRIST_O_MIN && wristsDistance < POSE_WRIST_O_MAX;
  const elbowsInRange = elbowsDistance > POSE_ELBOW_O_MIN && elbowsDistance < POSE_ELBOW_O_MAX;

  return wristsAboveShoulders && elbowsAboveShoulders && wristsInRange && elbowsInRange;
};

export const isPoseX = (landmarks: PoseLandmark[]) => {
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];

  const wristsAboveElbows = leftWrist.y < leftElbow.y && rightWrist.y < rightElbow.y;
  const wristsCrossed = leftWrist.x < rightWrist.x;

  return wristsAboveElbows && wristsCrossed;
};
