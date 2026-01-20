/// <reference lib="webworker" />

const TASKS_VISION_VERSION = '0.10.22-rc.20250304';
const WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const GESTURE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task';
const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';
const MIN_GESTURE_SCORE = 0.5;

const GESTURE_NAME_MAP: Record<string, string> = {
  Thumb_Up: 'thumbs_up',
  Thumb_Down: 'thumbs_down',
  Open_Palm: 'hand_raise',
};

type HandLandmark = { x: number; y: number };
type PoseLandmark = { x: number; y: number };

const HAND_LANDMARK_INDEX = {
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

const isFingerExtended = (landmarks: HandLandmark[], tip: number, pip: number) =>
  landmarks[tip].y + EXTENDED_FINGER_DELTA < landmarks[pip].y;

const isFingerFolded = (landmarks: HandLandmark[], tip: number, pip: number) =>
  landmarks[tip].y - EXTENDED_FINGER_DELTA > landmarks[pip].y;

const isOkSign = (landmarks: HandLandmark[]) => {
  const thumb = landmarks[HAND_LANDMARK_INDEX.thumbTip];
  const index = landmarks[HAND_LANDMARK_INDEX.indexTip];
  const pinchDistance = Math.hypot(thumb.x - index.x, thumb.y - index.y);

  if (pinchDistance > OK_PINCH_THRESHOLD) {
    return false;
  }

  const middleExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARK_INDEX.middleTip,
    HAND_LANDMARK_INDEX.middlePip,
  );
  const ringExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARK_INDEX.ringTip,
    HAND_LANDMARK_INDEX.ringPip,
  );
  const pinkyExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARK_INDEX.pinkyTip,
    HAND_LANDMARK_INDEX.pinkyPip,
  );

  return middleExtended && ringExtended && pinkyExtended;
};

const isOneSign = (landmarks: HandLandmark[]) => {
  const indexExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARK_INDEX.indexTip,
    HAND_LANDMARK_INDEX.indexPip,
  );
  const middleFolded = isFingerFolded(
    landmarks,
    HAND_LANDMARK_INDEX.middleTip,
    HAND_LANDMARK_INDEX.middlePip,
  );
  const ringFolded = isFingerFolded(
    landmarks,
    HAND_LANDMARK_INDEX.ringTip,
    HAND_LANDMARK_INDEX.ringPip,
  );
  const pinkyFolded = isFingerFolded(
    landmarks,
    HAND_LANDMARK_INDEX.pinkyTip,
    HAND_LANDMARK_INDEX.pinkyPip,
  );

  return indexExtended && middleFolded && ringFolded && pinkyFolded;
};

const isTwoSign = (landmarks: HandLandmark[]) => {
  const indexExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARK_INDEX.indexTip,
    HAND_LANDMARK_INDEX.indexPip,
  );
  const middleExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARK_INDEX.middleTip,
    HAND_LANDMARK_INDEX.middlePip,
  );
  const ringFolded = isFingerFolded(
    landmarks,
    HAND_LANDMARK_INDEX.ringTip,
    HAND_LANDMARK_INDEX.ringPip,
  );
  const pinkyFolded = isFingerFolded(
    landmarks,
    HAND_LANDMARK_INDEX.pinkyTip,
    HAND_LANDMARK_INDEX.pinkyPip,
  );

  return indexExtended && middleExtended && ringFolded && pinkyFolded;
};

const isThreeSign = (landmarks: HandLandmark[]) => {
  const indexExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARK_INDEX.indexTip,
    HAND_LANDMARK_INDEX.indexPip,
  );
  const middleExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARK_INDEX.middleTip,
    HAND_LANDMARK_INDEX.middlePip,
  );
  const ringExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARK_INDEX.ringTip,
    HAND_LANDMARK_INDEX.ringPip,
  );
  const pinkyFolded = isFingerFolded(
    landmarks,
    HAND_LANDMARK_INDEX.pinkyTip,
    HAND_LANDMARK_INDEX.pinkyPip,
  );

  return indexExtended && middleExtended && ringExtended && pinkyFolded;
};

const isFourSign = (landmarks: HandLandmark[]) => {
  const indexExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARK_INDEX.indexTip,
    HAND_LANDMARK_INDEX.indexPip,
  );
  const middleExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARK_INDEX.middleTip,
    HAND_LANDMARK_INDEX.middlePip,
  );
  const ringExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARK_INDEX.ringTip,
    HAND_LANDMARK_INDEX.ringPip,
  );
  const pinkyExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARK_INDEX.pinkyTip,
    HAND_LANDMARK_INDEX.pinkyPip,
  );

  return indexExtended && middleExtended && ringExtended && pinkyExtended;
};

const POSE_WRIST_ABOVE_SHOULDER_OFFSET = 0.03;
const POSE_WRIST_O_MIN = 0.18;
const POSE_WRIST_O_MAX = 0.4;
const POSE_ELBOW_O_MIN = 0.2;
const POSE_ELBOW_O_MAX = 0.65;

const isPoseO = (landmarks: PoseLandmark[]) => {
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

const isPoseX = (landmarks: PoseLandmark[]) => {
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];

  const wristsAboveElbows = leftWrist.y < leftElbow.y && rightWrist.y < rightElbow.y;
  const wristsCrossed = leftWrist.x < rightWrist.x;

  return wristsAboveElbows && wristsCrossed;
};

const HAND_GESTURE_DETECTORS: Array<{
  name: string;
  detector: (landmarks: HandLandmark[]) => boolean;
}> = [
  { name: 'ok_sign', detector: isOkSign },
  { name: 'one', detector: isOneSign },
  { name: 'two', detector: isTwoSign },
  { name: 'three', detector: isThreeSign },
  { name: 'four', detector: isFourSign },
];

const POSE_GESTURE_DETECTORS: Array<{
  name: string;
  detector: (landmarks: PoseLandmark[]) => boolean;
}> = [
  { name: 'o_sign', detector: isPoseO },
  { name: 'x_sign', detector: isPoseX },
];

type InitMessage = { type: 'init'; bundleUrl: string };
type FrameMessage = { type: 'frame'; frame: VideoFrame; timestamp: number };
type WorkerMessage = InitMessage | FrameMessage;

type TasksVisionModule = typeof import('@mediapipe/tasks-vision');
type GestureRecognizerInstance = Awaited<
  ReturnType<TasksVisionModule['GestureRecognizer']['createFromOptions']>
>;
type PoseLandmarkerInstance = Awaited<
  ReturnType<TasksVisionModule['PoseLandmarker']['createFromOptions']>
>;

let recognizer: GestureRecognizerInstance | null = null;
let poseLandmarker: PoseLandmarkerInstance | null = null;
let isReady = false;
let tasksVision: TasksVisionModule | null = null;
let tasksVisionBundleUrl: string | null = null;

const loadTasksVision = () => {
  if (tasksVision) {
    return tasksVision;
  }

  const workerGlobal = self as unknown as {
    importScripts: typeof importScripts;
    exports?: Record<string, unknown>;
    module?: unknown;
  };

  if (!workerGlobal.exports) {
    workerGlobal.exports = {};
  }
  const moduleShim = workerGlobal.module as { exports?: Record<string, unknown> } | undefined;
  if (!moduleShim) {
    workerGlobal.module = { exports: workerGlobal.exports } as { exports: Record<string, unknown> };
  } else if (!moduleShim.exports) {
    moduleShim.exports = workerGlobal.exports;
  }

  if (!tasksVisionBundleUrl) {
    throw new Error('MediaPipe 번들 URL이 설정되지 않았습니다.');
  }

  workerGlobal.importScripts(tasksVisionBundleUrl);
  tasksVision = (workerGlobal.module as { exports: Record<string, unknown> })
    .exports as TasksVisionModule;
  return tasksVision;
};

const initTasks = async () => {
  if (isReady) {
    return;
  }

  isReady = true; // 중복 초기화 방지 (초기화 중이거나 완료됨)
  try {
    const { FilesetResolver, GestureRecognizer, PoseLandmarker } = loadTasksVision();
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
    recognizer = await GestureRecognizer.createFromOptions(vision, {
      baseOptions: { modelAssetPath: GESTURE_MODEL_URL },
      runningMode: 'VIDEO',
    });
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: POSE_MODEL_URL },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
    self.postMessage({ type: 'ready' });
  } catch (error) {
    isReady = false; // 실패 시 재시도 가능하도록 리셋
    const message = error instanceof Error ? error.message : 'MediaPipe 초기화 실패';
    self.postMessage({ type: 'error', message });
  }
};

self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const payload = event.data;

  if (payload.type === 'init') {
    tasksVisionBundleUrl = payload.bundleUrl;
    await initTasks();
    return;
  }

  if (!isReady || !recognizer || !poseLandmarker) {
    return;
  }

  const { frame, timestamp } = payload;

  try {
    const result = recognizer.recognizeForVideo(frame, timestamp);
    const topGesture = result.gestures?.[0]?.[0];
    let detectedGesture: string | null = null;

    // 1. MediaPipe 기본 제스처 인식
    if (topGesture?.categoryName && topGesture.score >= MIN_GESTURE_SCORE) {
      detectedGesture = GESTURE_NAME_MAP[topGesture.categoryName];
    }

    // 2. 커스텀 손 제스처 인식 (랜드마크 기반)
    if (!detectedGesture && result.landmarks?.[0]) {
      const landmarks = result.landmarks[0];
      for (const { name, detector } of HAND_GESTURE_DETECTORS) {
        if (detector(landmarks)) {
          detectedGesture = name;
          break;
        }
      }
    }

    // 3. 전신 포즈 인식 (O, X)
    if (!detectedGesture) {
      const poseResult = poseLandmarker.detectForVideo(frame, timestamp);
      if (poseResult.landmarks?.[0]) {
        const poseLandmarks = poseResult.landmarks[0];
        for (const { name, detector } of POSE_GESTURE_DETECTORS) {
          if (detector(poseLandmarks)) {
            detectedGesture = name;
            break;
          }
        }
      }
    }

    self.postMessage({
      type: 'result',
      timestamp,
      gesture: detectedGesture,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MediaPipe 추론 실패';
    self.postMessage({ type: 'error', message });
  } finally {
    frame.close();
  }
});
