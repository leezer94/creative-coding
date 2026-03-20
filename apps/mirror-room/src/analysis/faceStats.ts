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

export async function createFaceLandmarker(): Promise<FaceLandmarker | null> {
  try {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const wasm = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
    return await FaceLandmarker.createFromOptions(wasm, {
      baseOptions: { modelAssetPath: '/mediapipe/face_landmarker.task' },
      runningMode: 'VIDEO',
      numFaces: 4,
      outputFaceBlendshapes: false,
    });
  } catch (e) {
    console.warn('FaceLandmarker unavailable', e);
    return null;
  }
}
