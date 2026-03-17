import { useEffect, useRef } from 'react';
import type { GestureType } from '@plum/shared-interfaces';
import { logger } from '@/shared/lib/logger';
import { useGestureStore } from '../stores/useGestureStore';

type GestureRecognitionOptions = {
  enabled: boolean;
  videoElement: HTMLVideoElement | null;
  onConfirmedGesture?: (gesture: GestureType) => void;
  shouldAllowGesture?: (gesture: GestureType) => boolean;
};

type GestureRecognitionState = {
  gesture: GestureType | null;
  startedAt: number;
  confirmedGesture: GestureType | null;
};

const HOLD_DURATION_MS = 1500;
const INFERENCE_FPS = 5;
const INFERENCE_INTERVAL_MS = 1000 / INFERENCE_FPS;
const isVideoReady = (video: HTMLVideoElement) =>
  video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0;

type GestureWorkerResult = {
  type: 'result';
  timestamp: number;
  gesture: GestureType | null;
};

type GestureWorkerMessage =
  | { type: 'ready' }
  | { type: 'error'; message: string }
  | GestureWorkerResult;

export function useGestureRecognition({
  enabled,
  videoElement,
  onConfirmedGesture,
  shouldAllowGesture,
}: GestureRecognitionOptions) {
  const { setGestureProgress, resetGestureProgress } = useGestureStore((state) => state.actions);
  const onConfirmedGestureRef = useRef<typeof onConfirmedGesture>(onConfirmedGesture);
  const shouldAllowGestureRef = useRef<typeof shouldAllowGesture>(shouldAllowGesture);

  const gestureStateRef = useRef<GestureRecognitionState>({
    gesture: null,
    startedAt: 0,
    confirmedGesture: null,
  });

  useEffect(() => {
    onConfirmedGestureRef.current = onConfirmedGesture;
    shouldAllowGestureRef.current = shouldAllowGesture;
  }, [onConfirmedGesture, shouldAllowGesture]);

  useEffect(() => {
    if (!enabled || !videoElement) {
      gestureStateRef.current = { gesture: null, startedAt: 0, confirmedGesture: null };
      resetGestureProgress();
      return;
    }

    if (typeof VideoFrame === 'undefined') {
      logger.media.warn('VideoFrame을 지원하지 않아 제스처 인식을 시작할 수 없습니다.');
      gestureStateRef.current = { gesture: null, startedAt: 0, confirmedGesture: null };
      resetGestureProgress();
      return;
    }

    let animationFrameId = 0;
    let lastInferenceAt = 0;
    let isActive = true;
    let isWorkerReady = false;
    let isInferenceInFlight = false;
    const worker = new Worker(new URL('../workers/gestureWorker.ts', import.meta.url), {
      type: 'classic',
    });

    const handleWorkerResult = (payload: GestureWorkerResult) => {
      updateGestureState(payload.gesture, payload.timestamp);
    };

    const startDetection = () => {
      if (!animationFrameId && isWorkerReady && isActive) {
        detectLoop();
      }
    };

    const handleWorkerMessage = (event: MessageEvent<GestureWorkerMessage>) => {
      const payload = event.data;

      if (payload.type === 'ready') {
        isWorkerReady = true;
        startDetection();
        return;
      }

      if (payload.type === 'error') {
        isInferenceInFlight = false;
        logger.media.error('MediaPipe Worker 오류', payload.message);
        return;
      }

      isInferenceInFlight = false;
      handleWorkerResult(payload);
    };

    const handleLoadedData = () => {
      logger.media.info('제스처 인식용 비디오 준비됨', {
        width: videoElement.videoWidth,
        height: videoElement.videoHeight,
      });
      startDetection();
    };

    const updateGestureState = (nextGesture: GestureType | null, now: number) => {
      if (nextGesture && shouldAllowGestureRef.current) {
        if (!shouldAllowGestureRef.current(nextGesture)) {
          nextGesture = null;
        }
      }
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

      // 이미 확정된 제스처는 무시
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
        if (onConfirmedGestureRef.current) {
          onConfirmedGestureRef.current(nextGesture);
        }
      }
    };

    const detectLoop = () => {
      if (!isActive || !videoElement) {
        return;
      }

      // 비디오가 준비되지 않은 경우 다음 프레임까지 대기
      if (!isVideoReady(videoElement) || !isWorkerReady) {
        animationFrameId = requestAnimationFrame(detectLoop);
        return;
      }

      const timestamp = performance.now();

      // 지정된 FPS에 맞춰 추론 수행
      if (timestamp - lastInferenceAt < INFERENCE_INTERVAL_MS || isInferenceInFlight) {
        animationFrameId = requestAnimationFrame(detectLoop);
        return;
      }
      lastInferenceAt = timestamp;
      try {
        const frame = new VideoFrame(videoElement);
        isInferenceInFlight = true;
        worker.postMessage({ type: 'frame', frame, timestamp }, [frame]);
      } catch (error) {
        isInferenceInFlight = false;
        logger.media.warn('VideoFrame 생성 실패', error);
      }
      animationFrameId = requestAnimationFrame(detectLoop);
    };

    const start = () => {
      videoElement.addEventListener('loadeddata', handleLoadedData);
      worker.addEventListener('message', handleWorkerMessage);
      worker.postMessage({ type: 'init' });
      startDetection();
    };

    start();

    return () => {
      isActive = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      videoElement.removeEventListener('loadeddata', handleLoadedData);
      worker.removeEventListener('message', handleWorkerMessage);
      worker.terminate();
      gestureStateRef.current = { gesture: null, startedAt: 0, confirmedGesture: null };
      resetGestureProgress();
    };
  }, [enabled, videoElement, resetGestureProgress]);
}
