declare module '@mediapipe/tasks-vision' {
  export interface BaseOptions {
    modelAssetPath?: string;
  }

  export interface GestureRecognizerOptions {
    baseOptions?: BaseOptions;
    runningMode?: 'IMAGE' | 'VIDEO';
  }

  export interface PoseLandmarkerOptions {
    baseOptions?: BaseOptions;
    runningMode?: 'IMAGE' | 'VIDEO';
    numPoses?: number;
  }

  export interface ImageSegmenterOptions {
    baseOptions?: BaseOptions;
    runningMode?: 'IMAGE' | 'VIDEO';
    outputCategoryMask?: boolean;
    outputConfidenceMasks?: boolean;
    outputType?: 'CATEGORY_MASK' | 'CONFIDENCE_MASK';
  }

  export interface Landmark {
    x: number;
    y: number;
    z?: number;
    visibility?: number;
  }

  export interface Category {
    score: number;
    index: number;
    categoryName: string;
    displayName?: string;
  }

  export interface GestureRecognitionResult {
    gestures?: Category[][];
    landmarks?: Landmark[][];
    worldLandmarks?: Landmark[][];
    handedness?: Category[][];
  }

  export interface PoseLandmarkingResult {
    landmarks?: Landmark[][];
    worldLandmarks?: Landmark[][];
    segmentationMasks?: ImageData[];
  }

  export interface ImageSegmenterResult {
    categoryMask?: {
      width: number;
      height: number;
      getAsUint8Array?: () => Uint8Array;
    };
  }

  export interface GestureRecognizer {
    recognizeForVideo(frame: VideoFrame, timestampMs: number): GestureRecognitionResult;
    close(): void;
  }

  export interface PoseLandmarker {
    detectForVideo(frame: VideoFrame, timestampMs: number): PoseLandmarkingResult;
    close(): void;
  }

  export interface ImageSegmenter {
    segmentForVideo(frame: VideoFrame, timestampMs: number): ImageSegmenterResult;
    close(): void;
  }

  export const FilesetResolver: {
    forVisionTasks(wasmLoaderPath: string): Promise<unknown>;
  };

  export const GestureRecognizer: {
    createFromOptions(
      vision: unknown,
      options: GestureRecognizerOptions,
    ): Promise<GestureRecognizer>;
  };

  export const PoseLandmarker: {
    createFromOptions(vision: unknown, options: PoseLandmarkerOptions): Promise<PoseLandmarker>;
  };

  export const ImageSegmenter: {
    createFromOptions(vision: unknown, options: ImageSegmenterOptions): Promise<ImageSegmenter>;
  };
}
