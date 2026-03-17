import { useCallback, useEffect, useRef } from 'react';

import { logger } from '@/shared/lib/logger';

import { useBackgroundEffectStore } from '../stores/useBackgroundEffectStore';
import {
  INFERENCE_INTERVAL_MS,
  renderBackgroundEffect,
  useBackgroundEffectCommon,
} from './useBackgroundEffectCommon';

const supportsTrackPipeline =
  'MediaStreamTrackProcessor' in globalThis &&
  'MediaStreamTrackGenerator' in globalThis &&
  'VideoFrame' in globalThis;

export function useBackgroundEffectPipeline() {
  const { setProcessedStream } = useBackgroundEffectStore.getState().actions;
  const common = useBackgroundEffectCommon({ useBitmap: true });
  const {
    workerRef,
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
  } = common;

  const outputCanvasRef = useRef<OffscreenCanvas | null>(null);
  const personCanvasRef = useRef<OffscreenCanvas | null>(null);
  const rawMaskCanvasRef = useRef<OffscreenCanvas | null>(null);
  const maskCanvasRef = useRef<OffscreenCanvas | null>(null);

  const processorRef = useRef<MediaStreamTrackProcessor | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<VideoFrame> | null>(null);
  const generatorRef = useRef<MediaStreamTrackGenerator | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<VideoFrame> | null>(null);
  const processingLoopRef = useRef<Promise<void> | null>(null);
  const runningRef = useRef(false);
  const sourceTrackRef = useRef<MediaStreamTrack | null>(null);

  const startPromiseRef = useRef<Promise<MediaStreamTrack | null> | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);

  const ensureCanvases = useCallback((width: number, height: number) => {
    if (!outputCanvasRef.current) {
      outputCanvasRef.current = new OffscreenCanvas(width, height);
    }
    if (!personCanvasRef.current) {
      personCanvasRef.current = new OffscreenCanvas(width, height);
    }
    if (!rawMaskCanvasRef.current) {
      rawMaskCanvasRef.current = new OffscreenCanvas(width, height);
    }
    if (!maskCanvasRef.current) {
      maskCanvasRef.current = new OffscreenCanvas(width, height);
    }

    const videoCanvases = [outputCanvasRef.current, personCanvasRef.current];
    videoCanvases.forEach((canvas) => {
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
    });
  }, []);

  const renderFrame = useCallback((frame: VideoFrame) => {
    const outputCanvas = outputCanvasRef.current;
    const personCanvas = personCanvasRef.current;
    const rawMaskCanvas = rawMaskCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;

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
      modeRef.current === 'image' && backgroundBitmapRef.current
        ? backgroundBitmapRef.current
        : null;

    renderBackgroundEffect(
      frame,
      background,
      latestMaskRef.current,
      canvasSizeRef.current,
      modeRef.current,
      { outputCtx, personCtx, rawMaskCtx, maskCtx, personCanvas, rawMaskCanvas, maskCanvas },
    );
  }, []);

  const stop = useCallback(() => {
    runningRef.current = false;
    processingLoopRef.current = null;

    if (readerRef.current) {
      readerRef.current.cancel().catch(() => {});
      readerRef.current.releaseLock();
      readerRef.current = null;
    }

    if (writerRef.current) {
      writerRef.current.close().catch(() => {});
      writerRef.current.releaseLock();
      writerRef.current = null;
    }

    processorRef.current = null;
    generatorRef.current = null;
    sourceTrackRef.current = null;

    stopWorker();
    resetCommonState();
    startPromiseRef.current = null;

    if (processedStreamRef.current) {
      processedStreamRef.current.getTracks().forEach((track) => track.stop());
      processedStreamRef.current = null;
    }

    outputCanvasRef.current = null;
    personCanvasRef.current = null;
    rawMaskCanvasRef.current = null;
    maskCanvasRef.current = null;

    setProcessedStream(null);
  }, [stopWorker, resetCommonState]);

  const start = useCallback(
    (rawTrack: MediaStreamTrack): Promise<MediaStreamTrack | null> => {
      if (!supportsTrackPipeline) {
        logger.media.warn('[BackgroundEffect] Track processing 미지원 브라우저입니다.');
        return Promise.resolve(null);
      }

      if (startPromiseRef.current) {
        return startPromiseRef.current;
      }

      const doStart = async (): Promise<MediaStreamTrack | null> => {
        if (sourceTrackRef.current && sourceTrackRef.current !== rawTrack) {
          stop();
        }
        sourceTrackRef.current = rawTrack;

        ensureBackgroundImage();
        ensureWorker();

        const Processor = globalThis.MediaStreamTrackProcessor;
        const Generator = globalThis.MediaStreamTrackGenerator;
        if (!Processor || !Generator) {
          logger.media.warn('[BackgroundEffect] Track processing 생성자가 없습니다.');
          return null;
        }

        if (!processorRef.current) {
          processorRef.current = new Processor({ track: rawTrack });
          readerRef.current = processorRef.current.readable.getReader();
        }

        if (!generatorRef.current) {
          generatorRef.current = new Generator({ kind: 'video' });
          writerRef.current = generatorRef.current.writable.getWriter();
          processedStreamRef.current = new MediaStream([
            generatorRef.current as unknown as MediaStreamTrack,
          ]);
          setProcessedStream(processedStreamRef.current);
        }

        if (!processingLoopRef.current) {
          runningRef.current = true;
          processingLoopRef.current = (async () => {
            const reader = readerRef.current;
            const writer = writerRef.current;
            if (!reader || !writer) return;

            while (runningRef.current) {
              const { value: frame, done } = await reader.read();
              if (done || !frame) break;

              const width = frame.displayWidth || frame.codedWidth;
              const height = frame.displayHeight || frame.codedHeight;
              if (!canvasSizeRef.current && width && height) {
                canvasSizeRef.current = { width, height };
                ensureCanvases(width, height);
              }

              const timestamp = performance.now();
              if (
                modeRef.current !== 'off' &&
                isWorkerReadyRef.current &&
                !isInferenceInFlightRef.current &&
                timestamp - lastInferenceAtRef.current >= INFERENCE_INTERVAL_MS
              ) {
                lastInferenceAtRef.current = timestamp;
                try {
                  const inferFrame = frame.clone ? frame.clone() : new VideoFrame(frame);
                  isInferenceInFlightRef.current = true;
                  workerRef.current?.postMessage({ type: 'frame', frame: inferFrame, timestamp }, [
                    inferFrame,
                  ]);
                } catch (error) {
                  isInferenceInFlightRef.current = false;
                  logger.media.warn('[BackgroundEffect] VideoFrame 복제 실패', error);
                }
              }

              if (modeRef.current === 'off') {
                await writer.ready;
                await writer.write(frame);
                frame.close();
                continue;
              }

              renderFrame(frame);
              const outputCanvas = outputCanvasRef.current;
              if (!outputCanvas) {
                frame.close();
                continue;
              }

              const outputFrame = new VideoFrame(outputCanvas, {
                timestamp: frame.timestamp,
              });
              await writer.ready;
              await writer.write(outputFrame);
              outputFrame.close();
              frame.close();
            }
          })().catch((error) => {
            logger.media.error('[BackgroundEffect] 처리 루프 오류', error);
          });
        }

        return generatorRef.current;
      };

      startPromiseRef.current = doStart().finally(() => {
        startPromiseRef.current = null;
      });
      return startPromiseRef.current;
    },
    [ensureBackgroundImage, ensureWorker, ensureCanvases, renderFrame, stop],
  );

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { start, stop, supported: supportsTrackPipeline };
}
