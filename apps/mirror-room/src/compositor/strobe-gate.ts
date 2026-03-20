import { MAX_STROBE_HZ } from '@/config';
import type { FrameFeatures } from '@/compositor/types';

let lastFlip = 0;
let gate = 0;

/**
 * Binary gate from combined motion with MAX_STROBE_HZ cap (edge-trigger friendly).
 */
export function computeStrobeGate(motionSum: number, timeMs: number): number {
  const hz = Math.min(MAX_STROBE_HZ, 2 + motionSum * 10);
  const period = 1000 / hz;
  if (timeMs - lastFlip > period) {
    lastFlip = timeMs;
    gate = gate === 1 ? 0 : 1;
  }
  return gate;
}

/** Resets strobe timing when tab hides or session resets (called from compositor on demand). */
export function resetStrobeClock(): void {
  lastFlip = 0;
  gate = 0;
}

export function applyStrobeVignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  f: FrameFeatures
) {
  if (f.strobe < 0.5) {
    return;
  }
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.1, w / 2, h / 2, h * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
