import type { FrameFeatures } from '@/compositor/types';

/**
 * Smears the previous composed frame; gain scales with spatial lane motion + face count.
 */
export function drawDelayedEcho(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  f: FrameFeatures,
  feedback: CanvasImageSource | null
) {
  const gain = 0.72 + f.motionS * 0.22 + Math.min(3, f.faceCountS) * 0.04;
  ctx.fillStyle = '#040408';
  ctx.fillRect(0, 0, w, h);

  if (feedback) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.92, gain * (f.guestConnected ? 0.95 : 0.88));
    ctx.drawImage(feedback, 0, 0, w, h);
    ctx.restore();
  }

  const pulse = 0.03 + f.motionA * (f.guestConnected ? 0.18 : 0.06);
  ctx.fillStyle = `rgba(255, 45, 140, ${pulse})`;
  ctx.fillRect(0, 0, w, 4);
  ctx.fillRect(0, h - 4, w, 4);
}
