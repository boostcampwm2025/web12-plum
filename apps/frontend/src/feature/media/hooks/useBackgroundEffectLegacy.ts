import { useCallback, useEffect, useRef } from 'react';

import { logger } from '@/shared/lib/logger';

import { useBackgroundEffectStore } from '../stores/useBackgroundEffectStore';
import {
  INFERENCE_INTERVAL_MS,
  renderBackgroundEffect,
  useBackgroundEffectCommon,
} from './useBackgroundEffectCommon';

const OUTPUT_FPS = 30;

export function useBackgroundEffectLegacy() {
  const { setProcessedStream } = useBackgroundEffectStore.getState().actions;
  const common = useBackgroundEffectCommon({ useBitmap: false });
  const {
    workerRef,
    backgroundImageRef,
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
  } = common;

  const legacyVideoRef = useRef<HTMLVideoElement | null>(null);
  const legacyOutputCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const legacyPersonCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const legacyRawMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const legacyMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const legacyAnimationRef = useRef<number>(0);
  const startPromiseRef = useRef<Promise<MediaStreamTrack | null> | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);

  const ensureLegacyCanvases = useCallback((width: number, height: number) => {
    if (!legacyOutputCanvasRef.current) {
      legacyOutputCanvasRef.current = document.createElement('canvas');
    }
    if (!legacyPersonCanvasRef.current) {
      legacyPersonCanvasRef.current = document.createElement('canvas');
    }
    if (!legacyRawMaskCanvasRef.current) {
      legacyRawMaskCanvasRef.current = document.createElement('canvas');
    }
    if (!legacyMaskCanvasRef.current) {
      legacyMaskCanvasRef.current = document.createElement('canvas');
    }

    const videoCanvases = [legacyOutputCanvasRef.current, legacyPersonCanvasRef.current];
    videoCanvases.forEach((canvas) => {
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
    });
  }, []);

  const renderFrameLegacy = useCallback((video: HTMLVideoElement) => {
    const outputCanvas = legacyOutputCanvasRef.current;
    const personCanvas = legacyPersonCanvasRef.current;
    const rawMaskCanvas = legacyRawMaskCanvasRef.current;
    const maskCanvas = legacyMaskCanvasRef.current;

    if (!outputCanvas || !personCanvas || !rawMaskCanvas || !maskCanvas) {
      return;
    }
    if (!canvasSizeRef.current) {
      return;
    }

    const outputCtx = outputCanvas.getContext('2d');
    const personCtx = personCanvas.getContext('2d');
    const rawMaskCtx = rawMaskCanvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');

    if (!outputCtx || !personCtx || !rawMaskCtx || !maskCtx) {
      logger.media.warn('[BackgroundEffect] Canvas 2D context 생성 실패');
      return;
    }

    const background =
      modeRef.current === 'image' && backgroundImageRef.current?.complete
        ? backgroundImageRef.current
        : null;

    renderBackgroundEffect(
      video,
      background,
      latestMaskRef.current,
      canvasSizeRef.current,
      modeRef.current,
      { outputCtx, personCtx, rawMaskCtx, maskCtx, personCanvas, rawMaskCanvas, maskCanvas },
    );
  }, []);

  const stop = useCallback(() => {
    if (legacyAnimationRef.current) {
      cancelAnimationFrame(legacyAnimationRef.current);
      legacyAnimationRef.current = 0;
    }

    stopWorker();
    resetCommonState();
    startPromiseRef.current = null;

    if (processedStreamRef.current) {
      processedStreamRef.current.getTracks().forEach((track) => track.stop());
      processedStreamRef.current = null;
    }

    legacyOutputCanvasRef.current = null;
    legacyPersonCanvasRef.current = null;
    legacyRawMaskCanvasRef.current = null;
    legacyMaskCanvasRef.current = null;

    if (legacyVideoRef.current) {
      legacyVideoRef.current.pause();
      legacyVideoRef.current.srcObject = null;
      legacyVideoRef.current.onloadedmetadata = null;
      legacyVideoRef.current = null;
    }

    setProcessedStream(null);
  }, [stopWorker, resetCommonState]);

  const start = useCallback(
    (rawTrack: MediaStreamTrack): Promise<MediaStreamTrack | null> => {
      if (startPromiseRef.current) {
        return startPromiseRef.current;
      }

      const doStart = async (): Promise<MediaStreamTrack | null> => {
        ensureBackgroundImage();
        ensureWorker();

        if (!legacyVideoRef.current) {
          const video = document.createElement('video');
          video.autoplay = true;
          video.muted = true;
          video.playsInline = true;
          legacyVideoRef.current = video;
        }

        const video = legacyVideoRef.current;
        if (!video) return null;

        const metadataReady = new Promise<void>((resolve) => {
          video.srcObject = new MediaStream([rawTrack]);
          video.play().catch(() => {});
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            resolve();
            return;
          }
          video.onloadedmetadata = () => resolve();
        });

        await metadataReady;

        if (video.videoWidth > 0 && video.videoHeight > 0) {
          canvasSizeRef.current = { width: video.videoWidth, height: video.videoHeight };
          ensureLegacyCanvases(video.videoWidth, video.videoHeight);
        }

        if (!processedStreamRef.current && legacyOutputCanvasRef.current) {
          processedStreamRef.current = legacyOutputCanvasRef.current.captureStream(OUTPUT_FPS);
          setProcessedStream(processedStreamRef.current);
        }

        const loop = () => {
          if (!legacyVideoRef.current) return;
          const timestamp = performance.now();
          if (
            modeRef.current !== 'off' &&
            isWorkerReadyRef.current &&
            !isInferenceInFlightRef.current &&
            timestamp - lastInferenceAtRef.current >= INFERENCE_INTERVAL_MS
          ) {
            lastInferenceAtRef.current = timestamp;
            try {
              const inferFrame = new VideoFrame(legacyVideoRef.current);
              isInferenceInFlightRef.current = true;
              workerRef.current?.postMessage({ type: 'frame', frame: inferFrame, timestamp }, [
                inferFrame,
              ]);
            } catch (error) {
              isInferenceInFlightRef.current = false;
              logger.media.warn('[BackgroundEffect] VideoFrame 생성 실패', error);
            }
          }

          renderFrameLegacy(legacyVideoRef.current);
          legacyAnimationRef.current = requestAnimationFrame(loop);
        };

        if (legacyAnimationRef.current) {
          cancelAnimationFrame(legacyAnimationRef.current);
        }
        legacyAnimationRef.current = requestAnimationFrame(loop);

        return processedStreamRef.current?.getVideoTracks()[0] ?? null;
      };

      startPromiseRef.current = doStart().finally(() => {
        startPromiseRef.current = null;
      });
      return startPromiseRef.current;
    },
    [ensureBackgroundImage, ensureWorker, ensureLegacyCanvases, renderFrameLegacy],
  );

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { start, stop };
}
