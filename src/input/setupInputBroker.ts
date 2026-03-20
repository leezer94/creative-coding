import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { useParamsStore, type SingleHandState } from '@/store';
import { HAND_TRACKING } from '@/config';

/**
 * Absolute URLs for WASM and model files served from /public/mediapipe (synced on pnpm install).
 * Using same-origin assets avoids CDN blocks in restricted networks.
 */
function resolvePublicUrl(relativePath: string): string {
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  return new URL(relativePath.replace(/^\//, ''), baseUrl).href;
}

export interface InputBrokerHandles {
  video: HTMLVideoElement | null;
  teardown: () => void;
}

function updateCameraState(
  permission: 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported' | 'error',
  message: string,
  ready: boolean
): void {
  useParamsStore.setState({ camera: { permission, message, ready } });
}

function lerpToward(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

/** MediaPipe category strings are typically "Left" / "Right" (camera view; we mirror x separately). */
function slotFromCategory(categoryName: string | undefined): 'left' | 'right' | null {
  if (!categoryName) return null;
  const c = categoryName.toLowerCase();
  if (c.includes('left')) return 'left';
  if (c.includes('right')) return 'right';
  return null;
}

function decayHand(prev: SingleHandState): SingleHandState {
  return {
    ...prev,
    detected: false,
    confidence: 0,
    velocityX: lerpToward(prev.velocityX, 0, 0.25),
    velocityY: lerpToward(prev.velocityY, 0, 0.25),
    speed: lerpToward(prev.speed, 0, 0.25),
  };
}

interface SmoothBuffer {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function updateHandFromLandmarks(
  landmarks: Array<{ x: number; y: number }>,
  confidence: number,
  buf: SmoothBuffer
): SingleHandState {
  const fingertip = landmarks[8];
  const targetX = 1 - fingertip.x;
  const targetY = fingertip.y;
  const prevX = buf.x;
  const prevY = buf.y;
  buf.x = lerpToward(buf.x, targetX, HAND_TRACKING.smoothingPosition);
  buf.y = lerpToward(buf.y, targetY, HAND_TRACKING.smoothingPosition);
  const rawVx = buf.x - prevX;
  const rawVy = buf.y - prevY;
  buf.vx = lerpToward(buf.vx, rawVx, HAND_TRACKING.smoothingVelocity);
  buf.vy = lerpToward(buf.vy, rawVy, HAND_TRACKING.smoothingVelocity);
  const speed = Math.hypot(buf.vx, buf.vy);
  return {
    detected:
      speed >= HAND_TRACKING.minimumMotion || confidence >= HAND_TRACKING.minConfidence,
    confidence,
    x: buf.x,
    y: buf.y,
    velocityX: buf.vx,
    velocityY: buf.vy,
    speed,
  };
}

export function setupInputBroker(): InputBrokerHandles {
  let active = true;
  let rafId = 0;
  let videoEl: HTMLVideoElement | null = null;
  let stream: MediaStream | null = null;
  let handLandmarker: HandLandmarker | null = null;

  // Separate smoothing memory per hand label so left/right do not cross-talk.
  const leftBuf: SmoothBuffer = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
  const rightBuf: SmoothBuffer = { x: 0.5, y: 0.5, vx: 0, vy: 0 };

  const teardown = () => {
    active = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoEl) {
      videoEl.pause();
      videoEl.srcObject = null;
    }
    handLandmarker?.close();
  };

  const tick = () => {
    if (!active || !videoEl || !handLandmarker) return;
    if (videoEl.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    const prev = useParamsStore.getState().hands;
    let nextLeft = decayHand(prev.left);
    let nextRight = decayHand(prev.right);

    const results = handLandmarker.detectForVideo(videoEl, performance.now());
    const n = results.landmarks.length;

    for (let i = 0; i < n; i += 1) {
      const landmarks = results.landmarks[i];
      const meta = results.handednesses?.[i]?.[0];
      const confidence = meta?.score ?? 0;
      if (!landmarks || confidence < HAND_TRACKING.minConfidence) continue;

      const slot = slotFromCategory(meta?.categoryName);
      if (slot === 'left') {
        nextLeft = updateHandFromLandmarks(landmarks, confidence, leftBuf);
      } else if (slot === 'right') {
        nextRight = updateHandFromLandmarks(landmarks, confidence, rightBuf);
      }
    }

    useParamsStore.setState({
      hands: { left: nextLeft, right: nextRight },
    });

    rafId = requestAnimationFrame(tick);
  };

  const initialize = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      updateCameraState(
        'unsupported',
        'Camera API is not supported in this browser.',
        false
      );
      return;
    }

    try {
      updateCameraState('requesting', 'Requesting camera access...', false);
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 540 } },
        audio: false,
      });

      videoEl = document.createElement('video');
      videoEl.setAttribute('playsinline', 'true');
      videoEl.autoplay = true;
      videoEl.muted = true;
      videoEl.srcObject = stream;
      await videoEl.play();

      const wasmBase = resolvePublicUrl('mediapipe/wasm/');
      const modelUrl = resolvePublicUrl('mediapipe/hand_landmarker.task');

      const vision = await FilesetResolver.forVisionTasks(wasmBase);
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelUrl,
        },
        runningMode: 'VIDEO',
        numHands: HAND_TRACKING.maxHands,
      });

      updateCameraState(
        'granted',
        'Camera connected. Move your hands through the field.',
        true
      );
      tick();
    } catch (error) {
      const isDenied = error instanceof DOMException && error.name === 'NotAllowedError';
      if (isDenied) {
        updateCameraState(
          'denied',
          'Camera access denied. Allow permission and reload.',
          false
        );
      } else if (error instanceof Error) {
        updateCameraState(
          'error',
          `Unable to initialize camera hand tracking. ${error.message}`,
          false
        );
      } else {
        updateCameraState('error', 'Unable to initialize camera hand tracking.', false);
      }
    }
  };

  void initialize();

  return { video: videoEl, teardown };
}
