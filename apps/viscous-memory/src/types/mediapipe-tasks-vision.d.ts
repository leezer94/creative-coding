/**
 * The published package.json "exports" field breaks TypeScript module resolution here.
 * Minimal typings for our usage; implementation comes from node_modules at runtime.
 */

declare module '@mediapipe/tasks-vision' {
  export type WasmFileset = unknown;

  export class FilesetResolver {
    static forVisionTasks(basePath?: string, useModule?: boolean): Promise<WasmFileset>;
  }

  export class HandLandmarker {
    static createFromOptions(
      wasmFileset: WasmFileset,
      options: {
        baseOptions: { modelAssetPath: string };
        runningMode: 'VIDEO';
        numHands: number;
      }
    ): Promise<HandLandmarker>;

    detectForVideo(
      video: HTMLVideoElement,
      timestamp: number
    ): {
      landmarks: Array<Array<{ x: number; y: number }>>;
      handednesses?: Array<Array<{ score?: number; categoryName?: string }>>;
    };

    close(): void;
  }
}
