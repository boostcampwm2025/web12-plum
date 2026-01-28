import { useCallback, useEffect, useRef } from 'react';
import { logger } from '@/shared/lib/logger';
import camBackground from '@/assets/images/cam-background.png';
import { useToastStore } from '@/store/useToastStore';
import {
  useBackgroundEffectStore,
  type BackgroundEffectMode,
} from '../stores/useBackgroundEffectStore';

const INFERENCE_FPS = 30;
const INFERENCE_INTERVAL_MS = 1000 / INFERENCE_FPS;
const OUTPUT_FPS = 30;
const BLUR_PX = 12;
const MASK_BLUR_PX = 6;

type WorkerMaskMessage = {
  type: 'mask';
  timestamp: number;
  maskBuffer: ArrayBuffer | null;
  maskWidth: number;
  maskHeight: number;
};

type WorkerMessage = { type: 'ready' } | { type: 'error'; message: string } | WorkerMaskMessage;

const isVideoReady = (video: HTMLVideoElement) =>
  video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0;

export function useBackgroundEffect() {
  const { setProcessedStream, setMode } = useBackgroundEffectStore.getState().actions;

  const workerRef = useRef<Worker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const personCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rawMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);

  const animationFrameRef = useRef<number>(0);
  const lastInferenceAtRef = useRef<number>(0);
  const isInferenceInFlightRef = useRef(false);
  const isWorkerReadyRef = useRef(false);
  const startPromiseRef = useRef<Promise<MediaStreamTrack | null> | null>(null);
  const latestMaskRef = useRef<ImageData | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);
  const modeRef = useRef<BackgroundEffectMode>(useBackgroundEffectStore.getState().mode);
  const canvasSizeRef = useRef<{ width: number; height: number } | null>(null);
  const imageLoadAttemptRef = useRef(0);
  const toastShownForAttemptRef = useRef(0);

  useEffect(() => {
    return useBackgroundEffectStore.subscribe((state) => {
      modeRef.current = state.mode;
      if (state.mode === 'image') {
        imageLoadAttemptRef.current += 1;
      }
    });
  }, []);

  const ensureBackgroundImage = useCallback(() => {
    if (backgroundImageRef.current) {
      return;
    }
    const image = new Image();
    image.onerror = () => {
      logger.media.warn('[BackgroundEffect] 배경 이미지 로드 실패, blur 모드로 폴백');
      backgroundImageRef.current = null;
      // image 모드였다면 blur로 전환
      if (modeRef.current === 'image') {
        logger.media.warn('배경 이미지 로드에 실패하여 blur 모드로 전환합니다.');
        setMode('blur');
        if (toastShownForAttemptRef.current !== imageLoadAttemptRef.current) {
          toastShownForAttemptRef.current = imageLoadAttemptRef.current;
          useToastStore.getState().actions.addToast({
            type: 'error',
            title: '배경 이미지 로드에 실패하여 블러 모드로 전환합니다',
          });
        }
      }
    };
    image.src = camBackground;
    backgroundImageRef.current = image;
  }, []);

  const ensureCanvases = useCallback((width: number, height: number) => {
    if (!outputCanvasRef.current) {
      outputCanvasRef.current = document.createElement('canvas');
    }
    if (!personCanvasRef.current) {
      personCanvasRef.current = document.createElement('canvas');
    }
    if (!rawMaskCanvasRef.current) {
      rawMaskCanvasRef.current = document.createElement('canvas');
    }
    if (!maskCanvasRef.current) {
      maskCanvasRef.current = document.createElement('canvas');
    }

    // output/person 캔버스는 비디오 크기에 맞춤
    // rawMask/mask 캔버스는 Worker가 반환하는 mask 크기에 맞춰야 하므로 여기서 설정하지 않음
    const videoCanvases = [outputCanvasRef.current, personCanvasRef.current];
    videoCanvases.forEach((canvas) => {
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
    });
  }, []);

  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const outputCanvas = outputCanvasRef.current;
    const personCanvas = personCanvasRef.current;
    const rawMaskCanvas = rawMaskCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const maskEntry = latestMaskRef.current;

    if (!video || !outputCanvas || !personCanvas || !rawMaskCanvas || !maskCanvas) {
      return;
    }
    if (!canvasSizeRef.current) {
      return;
    }
    const { width, height } = canvasSizeRef.current;

    const outputCtx = outputCanvas.getContext('2d');
    const personCtx = personCanvas.getContext('2d');
    const rawMaskCtx = rawMaskCanvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');

    if (!outputCtx || !personCtx || !rawMaskCtx || !maskCtx) {
      logger.media.warn('[BackgroundEffect] Canvas 2D context 획득 실패');
      return;
    }

    if (modeRef.current === 'off') {
      outputCtx.clearRect(0, 0, width, height);
      outputCtx.drawImage(video, 0, 0, width, height);
      return;
    }

    if (!maskEntry) {
      outputCtx.clearRect(0, 0, width, height);
      outputCtx.drawImage(video, 0, 0, width, height);
      return;
    }

    const mask = maskEntry;
    if (rawMaskCanvas.width !== mask.width) rawMaskCanvas.width = mask.width;
    if (rawMaskCanvas.height !== mask.height) rawMaskCanvas.height = mask.height;
    if (maskCanvas.width !== mask.width) maskCanvas.width = mask.width;
    if (maskCanvas.height !== mask.height) maskCanvas.height = mask.height;

    rawMaskCtx.putImageData(mask, 0, 0);
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    if (MASK_BLUR_PX > 0) {
      maskCtx.filter = `blur(${MASK_BLUR_PX}px)`;
    }
    maskCtx.drawImage(rawMaskCanvas, 0, 0, maskCanvas.width, maskCanvas.height);
    maskCtx.filter = 'none';

    personCtx.clearRect(0, 0, width, height);
    personCtx.globalCompositeOperation = 'source-over';
    personCtx.drawImage(video, 0, 0, width, height);
    personCtx.globalCompositeOperation = 'destination-in';
    personCtx.drawImage(maskCanvas, 0, 0, width, height);
    personCtx.globalCompositeOperation = 'source-over';

    outputCtx.clearRect(0, 0, width, height);

    if (modeRef.current === 'image' && backgroundImageRef.current?.complete) {
      const image = backgroundImageRef.current;
      const imageRatio = image.width / image.height;
      const canvasRatio = width / height;
      let drawWidth = width;
      let drawHeight = height;
      let offsetX = 0;
      let offsetY = 0;

      if (imageRatio > canvasRatio) {
        drawHeight = width / imageRatio;
        offsetY = (height - drawHeight) / 2;
      } else {
        drawWidth = height * imageRatio;
        offsetX = (width - drawWidth) / 2;
      }
      outputCtx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
    } else {
      outputCtx.filter = `blur(${BLUR_PX}px)`;
      outputCtx.drawImage(video, 0, 0, width, height);
      outputCtx.filter = 'none';
    }

    outputCtx.drawImage(personCanvas, 0, 0, width, height);
  }, [ensureCanvases]);

  const ensureWorker = useCallback(() => {
    if (workerRef.current) {
      return;
    }
    const worker = new Worker(
      new URL('../workers/backgroundSegmentationWorker.ts', import.meta.url),
      {
        type: 'classic',
      },
    );
    worker.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
      const payload = event.data;

      if (payload.type === 'ready') {
        isWorkerReadyRef.current = true;
        return;
      }

      if (payload.type === 'error') {
        isInferenceInFlightRef.current = false;
        logger.media.error('[BackgroundEffect] Worker 오류', payload.message);
        return;
      }

      if (payload.type === 'mask') {
        isInferenceInFlightRef.current = false;
        if (payload.maskBuffer) {
          const data = new Uint8ClampedArray(payload.maskBuffer);
          latestMaskRef.current = new ImageData(data, payload.maskWidth, payload.maskHeight);
        } else {
          latestMaskRef.current = null;
        }
      }
    });
    worker.postMessage({ type: 'init' });
    workerRef.current = worker;
  }, [renderFrame]);

  const stop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    // video 요소 정리 — srcObject 해제 및 참조 제거
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.onloadedmetadata = null;
      videoRef.current = null;
    }

    isWorkerReadyRef.current = false;
    isInferenceInFlightRef.current = false;
    latestMaskRef.current = null;
    canvasSizeRef.current = null;
    startPromiseRef.current = null;

    if (processedStreamRef.current) {
      processedStreamRef.current.getTracks().forEach((track) => track.stop());
      processedStreamRef.current = null;
    }

    // 오프스크린 canvas 참조 해제
    outputCanvasRef.current = null;
    personCanvasRef.current = null;
    rawMaskCanvasRef.current = null;
    maskCanvasRef.current = null;

    setProcessedStream(null);
  }, [setProcessedStream]);

  const start = useCallback(
    (rawTrack: MediaStreamTrack): Promise<MediaStreamTrack | null> => {
      if (startPromiseRef.current) {
        return startPromiseRef.current;
      }

      const doStart = async (): Promise<MediaStreamTrack | null> => {
        if (!videoRef.current) {
          const video = document.createElement('video');
          video.autoplay = true;
          video.muted = true;
          video.playsInline = true;
          videoRef.current = video;
        }

        const video = videoRef.current;

        ensureBackgroundImage();
        ensureWorker();

        // video에 트랙을 바인딩하고 metadata 로드를 기다림
        const metadataReady = new Promise<void>((resolve) => {
          if (!video || !rawTrack) {
            resolve();
            return;
          }
          video.srcObject = new MediaStream([rawTrack]);
          video.play().catch(() => {});

          if (video.videoWidth > 0 && video.videoHeight > 0) {
            resolve();
            return;
          }
          video.onloadedmetadata = () => {
            resolve();
          };
        });

        await metadataReady;

        // metadata 로드 후 canvas 크기 설정
        if (video && video.videoWidth > 0 && video.videoHeight > 0) {
          if (!canvasSizeRef.current) {
            canvasSizeRef.current = { width: video.videoWidth, height: video.videoHeight };
          }
          ensureCanvases(canvasSizeRef.current.width, canvasSizeRef.current.height);
        }

        // processedStream 생성
        if (!processedStreamRef.current && outputCanvasRef.current && canvasSizeRef.current) {
          processedStreamRef.current = outputCanvasRef.current.captureStream(OUTPUT_FPS);
          setProcessedStream(processedStreamRef.current);
        }

        const detectLoop = () => {
          const timestamp = performance.now();
          if (!videoRef.current || !isVideoReady(videoRef.current) || !workerRef.current) {
            animationFrameRef.current = requestAnimationFrame(detectLoop);
            return;
          }

          if (!isWorkerReadyRef.current) {
            animationFrameRef.current = requestAnimationFrame(detectLoop);
            return;
          }

          if (
            modeRef.current !== 'off' &&
            !isInferenceInFlightRef.current &&
            timestamp - lastInferenceAtRef.current >= INFERENCE_INTERVAL_MS
          ) {
            lastInferenceAtRef.current = timestamp;
            try {
              const frame = new VideoFrame(videoRef.current);
              isInferenceInFlightRef.current = true;
              workerRef.current.postMessage({ type: 'frame', frame, timestamp: timestamp }, [
                frame,
              ]);
            } catch (error) {
              isInferenceInFlightRef.current = false;
              logger.media.warn('[BackgroundEffect] VideoFrame 생성 실패', error);
            }
          }

          renderFrame();
          animationFrameRef.current = requestAnimationFrame(detectLoop);
        };

        // 기존 루프가 있으면 중복 방지를 위해 취소 후 재시작
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(detectLoop);

        return processedStreamRef.current?.getVideoTracks()[0] ?? null;
      };

      startPromiseRef.current = doStart().finally(() => {
        startPromiseRef.current = null;
      });
      return startPromiseRef.current;
    },
    [ensureBackgroundImage, ensureWorker, ensureCanvases, setProcessedStream, renderFrame],
  );

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { start, stop };
}
