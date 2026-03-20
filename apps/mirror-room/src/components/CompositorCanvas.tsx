import { useEffect, useRef } from 'react';
import type { CompositorMode } from '@/config';
import { ANALYSIS, DEBUG, DEBUG_PERF } from '@/config';
import { createFaceLandmarker, statsFromLandmarks } from '@/analysis/faceStats';
import { createMotionSampler } from '@/analysis/motionSampler';
import { createCompositorScratch, renderMirrorFrame } from '@/compositor/renderFrame';
import type { FrameFeatures } from '@/compositor/types';
import { getSignalUrl } from '@/webrtc/ice';

type Props = {
  videoS: React.RefObject<HTMLVideoElement | null>;
  videoA: React.RefObject<HTMLVideoElement | null>;
  guestConnected: boolean;
  mode: CompositorMode;
  debug: boolean;
};

/**
 * Single canvas render loop: motion + optional face stats drive abstract compositing (no raw face projection).
 */
export default function CompositorCanvas({
  videoS,
  videoA,
  guestConnected,
  mode,
  debug,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const feedbackRef = useRef<HTMLCanvasElement | null>(null);
  const scratchRef = useRef(createCompositorScratch());
  const motionSRef = useRef(
    createMotionSampler(
      ANALYSIS.motionSampleSize,
      Math.round((ANALYSIS.motionSampleSize * 9) / 16)
    )
  );
  const motionARef = useRef(
    createMotionSampler(
      ANALYSIS.motionSampleSize,
      Math.round((ANALYSIS.motionSampleSize * 9) / 16)
    )
  );
  const faceLandmarkerRef =
    useRef<Awaited<ReturnType<typeof createFaceLandmarker>>>(null);
  const lastFaceMsRef = useRef(0);
  const faceStatsRef = useRef({
    s: { faceCount: 0, spread: 0 },
    a: { faceCount: 0, spread: 0 },
  });

  const modeRef = useRef(mode);
  const guestRef = useRef(guestConnected);
  const debugRef = useRef(debug);
  modeRef.current = mode;
  guestRef.current = guestConnected;
  debugRef.current = debug;

  useEffect(() => {
    let raf = 0;
    let landmarkerReady = false;

    createFaceLandmarker().then((lm) => {
      faceLandmarkerRef.current = lm;
      landmarkerReady = !!lm;
      if (!lm && DEBUG) {
        console.info(
          'Face landmarker skipped (missing model or load error). Motion-only compositor.'
        );
      }
    });

    const feedback = document.createElement('canvas');
    feedbackRef.current = feedback;
    let frames = 0;
    let lastPerf = performance.now();

    const loop = (t: number) => {
      const canvas = canvasRef.current;
      const vS = videoS.current;
      const vA = videoA.current;
      const guestOn = guestRef.current;
      const modeCur = modeRef.current;
      const debugOn = debugRef.current;

      if (canvas && vS) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = Math.floor(canvas.clientWidth * dpr);
        const h = Math.floor(canvas.clientHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          feedback.width = w;
          feedback.height = h;
        }

        const vSReady = vS.videoWidth > 0 && vS.videoHeight > 0;
        const vAReady =
          !!vA &&
          vA.videoWidth > 0 &&
          vA.videoHeight > 0 &&
          vA.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;

        const motionS = vSReady ? motionSRef.current(vS) : 0;
        const motionA = guestOn && vAReady ? motionARef.current(vA!) : 0;

        const lm = faceLandmarkerRef.current;
        if (lm && vSReady && t - lastFaceMsRef.current > 1000 / ANALYSIS.faceDetectHz) {
          lastFaceMsRef.current = t;
          try {
            const rS = lm.detectForVideo(vS, t);
            faceStatsRef.current.s = statsFromLandmarks(rS);
            if (guestOn && vAReady && vA) {
              const rA = lm.detectForVideo(vA, t);
              faceStatsRef.current.a = statsFromLandmarks(rA);
            } else {
              faceStatsRef.current.a = { faceCount: 0, spread: 0 };
            }
          } catch {
            /* MediaPipe rejects 0×0 or transient frames; skip this tick */
          }
        }

        const fs = faceStatsRef.current;
        const f: FrameFeatures = {
          motionS,
          motionA,
          faceCountS: fs.s.faceCount,
          faceCountA: fs.a.faceCount,
          spreadS: fs.s.spread,
          spreadA: fs.a.spread,
          strobe: 0,
          guestConnected: guestOn,
          timeMs: t,
        };

        const ctx = canvas.getContext('2d');
        const fb = feedbackRef.current;
        const fbCtx = fb?.getContext('2d');
        if (ctx && fb && fbCtx && fb.width === w && fb.height === h) {
          const prevFrame: CanvasImageSource = fb;
          renderMirrorFrame(ctx, w, h, f, modeCur, prevFrame, scratchRef.current);
          fbCtx.clearRect(0, 0, w, h);
          fbCtx.drawImage(canvas, 0, 0);
        } else if (ctx) {
          renderMirrorFrame(ctx, w, h, f, modeCur, null, scratchRef.current);
        }

        if (DEBUG_PERF) {
          frames++;
          if (t - lastPerf > 1000) {
            console.info(
              '[mirror-room] fps ~',
              frames / ((t - lastPerf) / 1000),
              'landmarker:',
              landmarkerReady
            );
            frames = 0;
            lastPerf = t;
          }
        }

        if (debugOn && canvas) {
          const hud = canvas.getContext('2d');
          if (hud) {
            hud.save();
            hud.fillStyle = 'rgba(0,0,0,0.45)';
            hud.fillRect(8, 8, 240, 104);
            hud.fillStyle = '#cfe';
            hud.font = '12px system-ui';
            hud.fillText(
              `Lane S motion ${motionS.toFixed(2)} faces ${fs.s.faceCount}`,
              16,
              28
            );
            hud.fillText(
              `Lane A motion ${motionA.toFixed(2)} faces ${fs.a.faceCount}`,
              16,
              46
            );
            hud.fillText(`Guest ${guestOn ? 'on' : 'off'}  mode ${modeCur}`, 16, 64);
            hud.fillText(`Face model ${landmarkerReady ? 'ok' : 'no'}`, 16, 82);
            hud.fillText(`signal ${getSignalUrl()}`, 16, 100);
            hud.restore();
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      faceLandmarkerRef.current?.close();
      faceLandmarkerRef.current = null;
    };
  }, [videoA, videoS]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
}
