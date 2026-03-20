import type { FrameFeatures } from '@/compositor/types';

/**
 * Horizontal scan phase follows spatial spread; vertical noise tied to gaze-lane motion.
 */
export function drawDualGridScan(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  f: FrameFeatures
) {
  const t = f.timeMs;
  ctx.fillStyle = '#06060a';
  ctx.fillRect(0, 0, w, h);

  const spread = 0.15 + f.spreadS * 0.85;
  const gazeMotion = f.guestConnected ? f.motionA : 0;
  const phase = t * 0.0015 * (0.5 + spread);

  ctx.strokeStyle = `rgba(180, 90, 255, ${0.12 + f.motionS * 0.25})`;
  ctx.lineWidth = 1;
  const step = 14;
  for (let y = 0; y < h; y += step) {
    const off = Math.sin(y * 0.02 + phase) * spread * 40;
    ctx.beginPath();
    ctx.moveTo(0, y + off);
    ctx.lineTo(w, y + off * 0.3);
    ctx.stroke();
  }

  ctx.strokeStyle = `rgba(60, 255, 200, ${0.08 + gazeMotion * 0.35})`;
  for (let x = 0; x < w; x += 24) {
    const jitter = Math.sin(x * 0.11 + t * 0.002 + gazeMotion * 3) * gazeMotion * 22;
    ctx.beginPath();
    ctx.moveTo(x + jitter, 0);
    ctx.lineTo(x - jitter * 0.5, h);
    ctx.stroke();
  }
}
