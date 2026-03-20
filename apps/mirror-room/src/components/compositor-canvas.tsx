import { useEffect, useRef } from 'react';
import type { CompositorMode } from '@/config';
import { ANALYSIS, DEBUG, DEBUG_PERF } from '@/config';
import { createFaceLandmarkerPair, statsFromLandmarks } from '@/analysis/face-stats';
import { createMotionSampler } from '@/analysis/motion-sampler';
import { createCompositorScratch, renderMirrorFrame } from '@/compositor/render-frame';
import type { FrameFeatures } from '@/compositor/types';
import { getSignalUrl } from '@/webrtc/ice';

export type LaneARemotePolicy = 'spotlight' | 'max';

type Props = {
  videoS: React.RefObject<HTMLVideoElement | null>;
  videoA: React.RefObject<HTMLVideoElement | null>;
  /** Extra remote cameras (e.g. SFU multi-participant). Motion uses `max` or spotlight. */
  laneARemoteRefs?: React.RefObject<HTMLVideoElement | null>[];
  /** Which remote ref drives face stats for lane A when extras exist (default 0 = `videoA`). */
  laneASpotlightIndex?: number;
  laneARemotePolicy?: LaneARemotePolicy;
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
  laneARemoteRefs = [],
  laneASpotlightIndex = 0,
  laneARemotePolicy = 'max',
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
  const faceLandmarkersRef =
    useRef<Awaited<ReturnType<typeof createFaceLandmarkerPair>>>(null);
  const lastFaceMsRef = useRef(0);
  const faceStatsRef = useRef({
    s: { faceCount: 0, spread: 0 },
    a: { faceCount: 0, spread: 0 },
  });

  const modeRef = useRef(mode);
  const guestRef = useRef(guestConnected);
  const debugRef = useRef(debug);
  const laneAExtrasRef = useRef(laneARemoteRefs);
  const laneASpotlightRef = useRef(laneASpotlightIndex);
  const laneAPolicyRef = useRef(laneARemotePolicy);
  modeRef.current = mode;
  guestRef.current = guestConnected;
  debugRef.current = debug;
  laneAExtrasRef.current = laneARemoteRefs;
  laneASpotlightRef.current = laneASpotlightIndex;
  laneAPolicyRef.current = laneARemotePolicy;

  useEffect(() => {
    let raf = 0;
    let landmarkerReady = false;

    createFaceLandmarkerPair().then((pair) => {
      faceLandmarkersRef.current = pair;
      landmarkerReady = !!pair;
      if (!pair && DEBUG) {
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

        const laneAVideos: (HTMLVideoElement | null)[] = [vA];
        for (const r of laneAExtrasRef.current) {
          laneAVideos.push(r.current);
        }

        const isVideoReady = (el: HTMLVideoElement | null) =>
          !!el &&
          el.videoWidth > 0 &&
          el.videoHeight > 0 &&
          el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;

        const motionS = vSReady ? motionSRef.current(vS) : 0;
        let motionA = 0;
        if (guestOn) {
          const policy = laneAPolicyRef.current;
          const motions: number[] = [];
          for (const el of laneAVideos) {
            if (isVideoReady(el)) {
              motions.push(motionARef.current(el!));
            }
          }
          if (motions.length === 0) {
            motionA = 0;
          } else if (policy === 'spotlight') {
            const idx = Math.min(
              laneASpotlightRef.current,
              Math.max(0, motions.length - 1)
            );
            motionA = motions[idx] ?? 0;
          } else {
            motionA = Math.max(...motions);
          }
        }

        const spotlightIdx = Math.min(
          laneASpotlightRef.current,
          Math.max(0, laneAVideos.length - 1)
        );
        const vAFace = laneAVideos[spotlightIdx] ?? vA;
        const vAReady = isVideoReady(vAFace);

        const lms = faceLandmarkersRef.current;
        if (lms && vSReady && t - lastFaceMsRef.current > 1000 / ANALYSIS.faceDetectHz) {
          lastFaceMsRef.current = t;
          try {
            const rS = lms.laneS.detectForVideo(vS, t);
            faceStatsRef.current.s = statsFromLandmarks(rS);
            if (guestOn && vAReady && vAFace) {
              const rA = lms.laneA.detectForVideo(vAFace, t);
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
      const pair = faceLandmarkersRef.current;
      pair?.laneS.close();
      pair?.laneA.close();
      faceLandmarkersRef.current = null;
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
