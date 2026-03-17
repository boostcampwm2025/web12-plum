/// <reference lib="webworker" />

// NOTE: 프로덕션에서는 unpkg 대신 self-host된 URL로 교체하는 것을 권장합니다.
// CDN 장애 시 기능이 완전히 실패할 수 있습니다.
const TASKS_VISION_VERSION = '0.10.22-rc.20250304';
const WASM_BASE_URL = `https://unpkg.com/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const TASKS_VISION_BUNDLE_URL = `https://unpkg.com/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/vision_bundle.cjs`;
const SEGMENTER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

type InitMessage = { type: 'init' };
type FrameMessage = { type: 'frame'; frame: VideoFrame; timestamp: number };
type WorkerMessage = InitMessage | FrameMessage;

type TasksVisionModule = typeof import('@mediapipe/tasks-vision');
type ImageSegmenterInstance = Awaited<
  ReturnType<TasksVisionModule['ImageSegmenter']['createFromOptions']>
>;

let segmenter: ImageSegmenterInstance | null = null;
let tasksVision: TasksVisionModule | null = null;
let processing = false;
let initPromise: Promise<void> | null = null;

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

  workerGlobal.importScripts(TASKS_VISION_BUNDLE_URL);
  tasksVision = (workerGlobal.module as { exports: Record<string, unknown> })
    .exports as TasksVisionModule;
  return tasksVision;
};

const initTasks = (): Promise<void> => {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const { FilesetResolver, ImageSegmenter } = loadTasksVision();
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
      segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: { modelAssetPath: SEGMENTER_MODEL_URL },
        runningMode: 'VIDEO',
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });
      self.postMessage({ type: 'ready' });
    } catch (error) {
      initPromise = null;
      const message = error instanceof Error ? error.message : 'MediaPipe 초기화 실패';
      self.postMessage({ type: 'error', message });
    }
  })();

  return initPromise;
};

self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const payload = event.data;

  if (payload.type === 'init') {
    await initTasks();
    return;
  }

  if (!segmenter) {
    if (payload.type === 'frame') {
      payload.frame.close();
      if (!initPromise) {
        self.postMessage({
          type: 'error',
          message: 'Segmenter가 초기화되지 않았습니다. init을 먼저 호출해주세요.',
        });
      }
    }
    return;
  }

  const { frame, timestamp } = payload;

  if (processing) {
    frame.close();
    return;
  }

  processing = true;
  try {
    const result = segmenter.segmentForVideo(frame, timestamp);
    let maskImage: ImageData | null = null;
    const categoryMask = result.categoryMask as
      | {
          width: number;
          height: number;
          getAsUint8Array?: () => Uint8Array;
        }
      | undefined;
    if (categoryMask) {
      const data = categoryMask.getAsUint8Array?.() ?? null;
      if (data) {
        const { width, height } = categoryMask;
        const imageData = new ImageData(width, height);
        const out32 = new Uint32Array(imageData.data.buffer);
        for (let i = 0; i < data.length; i += 1) {
          out32[i] = data[i] === 0 ? 0xff000000 : 0x00000000;
        }
        maskImage = imageData;
      }
    }

    if (!maskImage) {
      self.postMessage({
        type: 'error',
        message: '세그먼트 마스크가 비어있습니다.',
      });
      self.postMessage({ type: 'mask', timestamp, maskBuffer: null, maskWidth: 0, maskHeight: 0 });
      return;
    }

    const buffer = maskImage.data.buffer;
    self.postMessage(
      {
        type: 'mask',
        timestamp,
        maskBuffer: buffer,
        maskWidth: maskImage.width,
        maskHeight: maskImage.height,
      },
      [buffer],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MediaPipe 추론 실패';
    self.postMessage({ type: 'error', message });
  } finally {
    processing = false;
    frame.close();
  }
});
