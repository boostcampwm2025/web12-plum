export {};

declare global {
  interface MediaStreamTrackProcessor {
    readonly readable: ReadableStream<VideoFrame>;
  }

  interface MediaStreamTrackProcessorInit {
    track: MediaStreamTrack;
  }

  interface MediaStreamTrackProcessorConstructor {
    new (options: MediaStreamTrackProcessorInit): MediaStreamTrackProcessor;
  }

  interface MediaStreamTrackGenerator extends MediaStreamTrack {
    readonly writable: WritableStream<VideoFrame>;
  }

  interface MediaStreamTrackGeneratorConstructor {
    new (options: { kind: 'audio' | 'video' }): MediaStreamTrackGenerator;
  }

  var MediaStreamTrackProcessor: MediaStreamTrackProcessorConstructor | undefined;
  var MediaStreamTrackGenerator: MediaStreamTrackGeneratorConstructor | undefined;

  interface OffscreenCanvas {
    width: number;
    height: number;
    getContext(contextId: '2d'): OffscreenCanvasRenderingContext2D | null;
  }

  interface OffscreenCanvasRenderingContext2D
    extends
      CanvasState,
      CanvasTransform,
      CanvasCompositing,
      CanvasImageSmoothing,
      CanvasFillStrokeStyles,
      CanvasShadowStyles,
      CanvasFilters,
      CanvasRect,
      CanvasDrawImage,
      CanvasText,
      CanvasPathDrawingStyles,
      CanvasTextDrawingStyles,
      CanvasPath,
      CanvasImageData {
    filter: string;
  }

  var OffscreenCanvas: {
    new (width: number, height: number): OffscreenCanvas;
  };
}
