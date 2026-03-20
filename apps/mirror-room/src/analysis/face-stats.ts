import type { FaceLandmarker } from '@mediapipe/tasks-vision';

export type FaceStats = {
  faceCount: number;
  /** 0–1 horizontal spread of landmark extent (averaged per face). */
  spread: number;
};

/**
 * Aggregates simple, privacy-light stats from MediaPipe face landmarks.
 */
export function statsFromLandmarks(
  result: ReturnType<FaceLandmarker['detectForVideo']>
): FaceStats {
  const faces = result.faceLandmarks ?? [];
  if (faces.length === 0) {
    return { faceCount: 0, spread: 0 };
  }
  let sumSpread = 0;
  for (const lm of faces) {
    let minX = 1;
    let maxX = 0;
    for (const p of lm) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
    }
    sumSpread += maxX - minX;
  }
  return {
    faceCount: faces.length,
    spread: sumSpread / faces.length,
  };
}

const faceLandmarkerOptions = {
  baseOptions: { modelAssetPath: '/mediapipe/face_landmarker.task' },
  runningMode: 'VIDEO' as const,
  numFaces: 4,
  outputFaceBlendshapes: false,
};

export async function createFaceLandmarker(): Promise<FaceLandmarker | null> {
  try {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const wasm = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
    return await FaceLandmarker.createFromOptions(wasm, faceLandmarkerOptions);
  } catch (e) {
    console.warn('FaceLandmarker unavailable', e);
    return null;
  }
}

/** One landmarker per video: a single graph cannot mux two `HTMLVideoElement` timelines without norm_rect packet skew. */
export async function createFaceLandmarkerPair(): Promise<{
  laneS: FaceLandmarker;
  laneA: FaceLandmarker;
} | null> {
  try {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const wasm = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
    const [laneS, laneA] = await Promise.all([
      FaceLandmarker.createFromOptions(wasm, faceLandmarkerOptions),
      FaceLandmarker.createFromOptions(wasm, faceLandmarkerOptions),
    ]);
    return { laneS, laneA };
  } catch (e) {
    console.warn('FaceLandmarker pair unavailable', e);
    return null;
  }
}
