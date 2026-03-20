/**
 * The published package.json "exports" field breaks TypeScript module resolution here.
 * Minimal typings for our usage; implementation comes from node_modules at runtime.
 */

declare module '@mediapipe/tasks-vision' {
  export type WasmFileset = unknown;

  export class FilesetResolver {
    static forVisionTasks(basePath?: string, useModule?: boolean): Promise<WasmFileset>;
  }

  export class FaceLandmarker {
    static createFromOptions(
      wasmFileset: WasmFileset,
      options: {
        baseOptions: { modelAssetPath: string };
        runningMode: 'VIDEO';
        numFaces?: number;
        outputFaceBlendshapes?: boolean;
      }
    ): Promise<FaceLandmarker>;

    detectForVideo(
      video: HTMLVideoElement,
      timestamp: number
    ): {
      faceLandmarks: Array<Array<{ x: number; y: number; z?: number }>>;
    };

    close(): void;
  }
}
