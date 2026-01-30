import { useCallback, useEffect, useRef } from 'react';
import { logger } from '@/shared/lib/logger';
import camBackground from '@/assets/images/cam-background.png';
import { useToastStore } from '@/store/useToastStore';
import {
  useBackgroundEffectStore,
  type BackgroundEffectMode,
} from '../stores/useBackgroundEffectStore';

export const INFERENCE_FPS = 30;
export const INFERENCE_INTERVAL_MS = 1000 / INFERENCE_FPS;
export const BLUR_PX = 12;
export const MASK_BLUR_PX = 6;

type RenderContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export type RenderCanvases<T extends HTMLCanvasElement | OffscreenCanvas> = {
  outputCtx: RenderContext;
  personCtx: RenderContext;
  rawMaskCtx: RenderContext;
  maskCtx: RenderContext;
  personCanvas: T;
  rawMaskCanvas: T;
  maskCanvas: T;
};

export function renderBackgroundEffect<T extends HTMLCanvasElement | OffscreenCanvas>(
  source: CanvasImageSource,
  background: CanvasImageSource | null,
  mask: ImageData | null,
  canvasSize: { width: number; height: number },
  mode: 'off' | 'blur' | 'image',
  canvases: RenderCanvases<T>,
): void {
  const { outputCtx, personCtx, rawMaskCtx, maskCtx, personCanvas, rawMaskCanvas, maskCanvas } =
    canvases;
  const { width, height } = canvasSize;

  if (mode === 'off' || !mask) {
    outputCtx.clearRect(0, 0, width, height);
    outputCtx.drawImage(source, 0, 0, width, height);
    return;
  }

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
  personCtx.drawImage(source, 0, 0, width, height);
  personCtx.globalCompositeOperation = 'destination-in';
  personCtx.drawImage(maskCanvas, 0, 0, width, height);
  personCtx.globalCompositeOperation = 'source-over';

  outputCtx.clearRect(0, 0, width, height);

  if (mode === 'image' && background) {
    const bgWidth = (background as HTMLImageElement | ImageBitmap).width;
    const bgHeight = (background as HTMLImageElement | ImageBitmap).height;
    const imageRatio = bgWidth / bgHeight;
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
    outputCtx.drawImage(background, offsetX, offsetY, drawWidth, drawHeight);
  } else {
    outputCtx.filter = `blur(${BLUR_PX}px)`;
    outputCtx.drawImage(source, 0, 0, width, height);
    outputCtx.filter = 'none';
  }

  outputCtx.drawImage(personCanvas, 0, 0, width, height);
}

export type WorkerMaskMessage = {
  type: 'mask';
  timestamp: number;
  maskBuffer: ArrayBuffer | null;
  maskWidth: number;
  maskHeight: number;
};

export type WorkerMessage =
  | { type: 'ready' }
  | { type: 'error'; message: string }
  | WorkerMaskMessage;

type CommonOptions = {
  useBitmap: boolean;
};

export function useBackgroundEffectCommon({ useBitmap }: CommonOptions) {
  const { setMode } = useBackgroundEffectStore.getState().actions;

  const workerRef = useRef<Worker | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundBitmapRef = useRef<ImageBitmap | null>(null);

  const lastInferenceAtRef = useRef<number>(0);
  const isInferenceInFlightRef = useRef(false);
  const isWorkerReadyRef = useRef(false);
  const latestMaskRef = useRef<ImageData | null>(null);
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
    image.onload = async () => {
      if (!useBitmap) return;
      try {
        backgroundBitmapRef.current = await createImageBitmap(image);
      } catch (error) {
        logger.media.warn('[BackgroundEffect] ImageBitmap 생성 실패', error);
      }
    };
    image.onerror = () => {
      logger.media.warn('[BackgroundEffect] 배경 이미지 로드 실패, blur 모드로 폴백');
      backgroundImageRef.current = null;
      backgroundBitmapRef.current = null;
      if (modeRef.current === 'image') {
        logger.media.warn('배경 이미지 로드에 실패하여 blur 모드로 전환합니다.');
        setMode('blur');
        if (toastShownForAttemptRef.current !== imageLoadAttemptRef.current) {
          toastShownForAttemptRef.current = imageLoadAttemptRef.current;
          useToastStore.getState().actions.addToast({
            type: 'error',
            title: '배경 이미지 로드에 실패하여 블러 모드로 전환합니다.',
          });
        }
      }
    };
    image.src = camBackground;
    backgroundImageRef.current = image;
  }, [setMode, useBitmap]);

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
  }, []);

  const resetCommonState = useCallback(() => {
    isWorkerReadyRef.current = false;
    isInferenceInFlightRef.current = false;
    latestMaskRef.current = null;
    canvasSizeRef.current = null;
    lastInferenceAtRef.current = 0;
  }, []);

  const stopWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  return {
    workerRef,
    backgroundImageRef,
    backgroundBitmapRef,
    modeRef,
    latestMaskRef,
    isWorkerReadyRef,
    isInferenceInFlightRef,
    lastInferenceAtRef,
    canvasSizeRef,
    ensureBackgroundImage,
    ensureWorker,
    resetCommonState,
    stopWorker,
  };
}
