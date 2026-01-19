import { useEffect, useRef } from 'react';
import { useParams } from 'react-router';
import { FilesetResolver, GestureRecognizer, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { GestureType } from '@plum/shared-interfaces';
import { logger } from '@/shared/lib/logger';
import { isFourSign, isOkSign, isOneSign, isThreeSign, isTwoSign } from '../utils/gestureLandmarks';
import { isPoseO, isPoseX } from '../utils/poseLandmarks';
import { useRoomStore } from '../stores/useRoomStore';
import { useSocketStore } from '@/store/useSocketStore';
import { useGestureStore } from '../stores/useGestureStore';

type GestureRecognitionOptions = {
  enabled: boolean;
  videoElement: HTMLVideoElement | null;
};

type GestureRecognitionState = {
  gesture: GestureType | null;
  startedAt: number;
  confirmedGesture: GestureType | null;
};

const WASM_BASE_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm';
const GESTURE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task';
const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

const GESTURE_NAME_MAP: Record<string, GestureType> = {
  thumb_up: 'thumbs_up',
  thumb_down: 'thumbs_down',
  open_palm: 'hand_raise',
  ok_sign: 'ok_sign',
  one: 'one',
  two: 'two',
  three: 'three',
  four: 'four',
};

const HOLD_DURATION_MS = 1500;
const INFERENCE_FPS = 5;
const INFERENCE_INTERVAL_MS = 1000 / INFERENCE_FPS;
const MIN_GESTURE_SCORE = 0.5;
const isVideoReady = (video: HTMLVideoElement) => video.readyState >= 2 && video.videoWidth > 0;
const normalizeGestureName = (name: string) => name.trim().toLowerCase();

export function useGestureRecognition({ enabled, videoElement }: GestureRecognitionOptions) {
  const { roomId } = useParams();
  const myInfo = useRoomStore((state) => state.myInfo);
  const { emit } = useSocketStore((state) => state.actions);
  const { setGestureProgress, resetGestureProgress } = useGestureStore((state) => state.actions);

  const gestureStateRef = useRef<GestureRecognitionState>({
    gesture: null,
    startedAt: 0,
    confirmedGesture: null,
  });

  useEffect(() => {
    if (!enabled || !videoElement) {
      gestureStateRef.current = { gesture: null, startedAt: 0, confirmedGesture: null };
      resetGestureProgress();
      return;
    }

    let animationFrameId = 0;
    let lastInferenceAt = 0;
    let recognizer: GestureRecognizer | null = null;
    let poseLandmarker: PoseLandmarker | null = null;
    let isActive = true;
    let hasRecognizer = false;
    let hasStarted = false;

    const setupRecognizer = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
        recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: GESTURE_MODEL_URL,
          },
          runningMode: 'VIDEO',
        });
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: POSE_MODEL_URL,
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
        hasRecognizer = true;
        logger.media.info('MediaPipe GestureRecognizer 초기화 완료');
        logger.media.info('MediaPipe PoseLandmarker 초기화 완료');
      } catch (error) {
        logger.media.error('MediaPipe GestureRecognizer 초기화 실패', error);
      }
    };

    const handleLoadedData = () => {
      logger.media.info('제스처 인식용 비디오 준비됨', {
        width: videoElement.videoWidth,
        height: videoElement.videoHeight,
      });
      if (isActive && hasRecognizer && !hasStarted && isVideoReady(videoElement)) {
        hasStarted = true;
        detectLoop();
      }
    };

    const updateGestureState = (nextGesture: GestureType | null, now: number) => {
      const state = gestureStateRef.current;

      // 제스처가 인식되지 않는 경우 상태 초기화
      if (!nextGesture) {
        gestureStateRef.current = { gesture: null, startedAt: 0, confirmedGesture: null };
        setGestureProgress({ gesture: null, progress: 0 });
        return;
      }

      // 새로운 제스처가 인식된 경우 상태 갱신
      if (state.gesture !== nextGesture) {
        gestureStateRef.current = {
          gesture: nextGesture,
          startedAt: now,
          confirmedGesture: null,
        };
        setGestureProgress({ gesture: nextGesture, progress: 0 });
        return;
      }

      // 동일한 제스처가 계속 인식되는 경우 확인된 제스처로 처리
      if (state.confirmedGesture === nextGesture) {
        return;
      }

      // 진행률 계산 및 업데이트
      const elapsed = now - state.startedAt;
      const progress = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setGestureProgress({ gesture: nextGesture, progress });

      // 제스처가 일정 시간 이상 유지된 경우 확인된 제스처로 설정
      if (elapsed >= HOLD_DURATION_MS) {
        gestureStateRef.current = {
          gesture: nextGesture,
          startedAt: state.startedAt,
          confirmedGesture: nextGesture,
        };
        logger.media.info('제스처 인식 확정', { gesture: nextGesture });
        if (!roomId || !myInfo?.id) {
          logger.socket.warn('제스처 전송 불가: roomId 또는 participantId 없음', {
            roomId,
            participantId: myInfo?.id,
          });
          return;
        }
        emit('action_gesture', { gesture: nextGesture }, (res) => {
          if (!res.success) {
            logger.socket.warn('제스처 전송 실패', res.error);
          }
        });
      }
    };

    const detectLoop = () => {
      if (!isActive || !videoElement || !recognizer || !poseLandmarker) {
        return;
      }

      // 비디오가 준비되지 않은 경우 다음 프레임까지 대기
      if (!isVideoReady(videoElement)) {
        animationFrameId = requestAnimationFrame(detectLoop);
        return;
      }

      const timestamp = performance.now();

      // 지정된 FPS에 맞춰 추론 수행
      if (timestamp - lastInferenceAt < INFERENCE_INTERVAL_MS) {
        animationFrameId = requestAnimationFrame(detectLoop);
        return;
      }
      lastInferenceAt = timestamp;
      const result = recognizer.recognizeForVideo(videoElement, timestamp);
      const poseResult = poseLandmarker.detectForVideo(videoElement, timestamp);
      const topGesture = result.gestures?.[0]?.[0];
      let detectedGesture: GestureType | null = null;

      // 신뢰도 기준으로 제스처 필터링
      if (topGesture?.categoryName && topGesture.score >= MIN_GESTURE_SCORE) {
        const normalized = normalizeGestureName(topGesture.categoryName);
        detectedGesture = GESTURE_NAME_MAP[normalized] ?? null;
      }

      // 랜드마크 기반 커스텀 제스처 인식
      if (!detectedGesture && result.landmarks?.[0]) {
        const landmarks = result.landmarks[0];

        if (isOkSign(landmarks)) {
          detectedGesture = 'ok_sign';
        } else if (isOneSign(landmarks)) {
          detectedGesture = 'one';
        } else if (isTwoSign(landmarks)) {
          detectedGesture = 'two';
        } else if (isThreeSign(landmarks)) {
          detectedGesture = 'three';
        } else if (isFourSign(landmarks)) {
          detectedGesture = 'four';
        }
      }

      if (!detectedGesture && poseResult.landmarks?.[0]) {
        const poseLandmarks = poseResult.landmarks[0];
        if (isPoseO(poseLandmarks)) {
          detectedGesture = 'o_sign';
        } else if (isPoseX(poseLandmarks)) {
          detectedGesture = 'x_sign';
        }
      } else if (!detectedGesture) {
        logger.media.debug('Pose landmarks 미검출');
      }

      updateGestureState(detectedGesture, timestamp);
      animationFrameId = requestAnimationFrame(detectLoop);
    };

    const start = async () => {
      videoElement.addEventListener('loadeddata', handleLoadedData);
      await setupRecognizer();
      if (isActive) {
        if (isVideoReady(videoElement) && !hasStarted) {
          hasStarted = true;
          detectLoop();
        }
      }
    };

    start();

    return () => {
      isActive = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      videoElement.removeEventListener('loadeddata', handleLoadedData);
      recognizer?.close();
      poseLandmarker?.close();
      gestureStateRef.current = { gesture: null, startedAt: 0, confirmedGesture: null };
      resetGestureProgress();
    };
  }, [enabled, videoElement, resetGestureProgress]);
}
