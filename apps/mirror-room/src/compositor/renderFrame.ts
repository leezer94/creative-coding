import { COMPOSITOR_MODE, type CompositorMode } from '@/config';
import { drawDelayedEcho } from '@/compositor/delayedEcho';
import { drawDualGridScan } from '@/compositor/dualGridScan';
import { applyStrobeVignette, computeStrobeGate } from '@/compositor/strobeGate';
import type { FrameFeatures } from '@/compositor/types';

type Scratch = {
  grid: HTMLCanvasElement;
  echo: HTMLCanvasElement;
  present: HTMLCanvasElement;
};

function ensureScratch(w: number, h: number, s: Scratch): void {
  if (s.grid.width !== w || s.grid.height !== h) {
    s.grid.width = w;
    s.grid.height = h;
    s.echo.width = w;
    s.echo.height = h;
    s.present.width = w;
    s.present.height = h;
  }
}

/**
 * Combines Dual Grid Scan with Delayed Echo; mode tilts the mix (not two unrelated engines).
 */
export function renderMirrorFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  f: FrameFeatures,
  mode: CompositorMode,
  feedback: CanvasImageSource | null,
  scratch: Scratch
) {
  ensureScratch(w, h, scratch);
  const strobeVal = computeStrobeGate(f.motionS + f.motionA * 0.6, f.timeMs);
  const gated: FrameFeatures = { ...f, strobe: strobeVal };

  const gridCtx = scratch.grid.getContext('2d')!;
  const echoCtx = scratch.echo.getContext('2d')!;
  const presentCtx = scratch.present.getContext('2d')!;

  drawDualGridScan(gridCtx, w, h, f);
  drawDelayedEcho(echoCtx, w, h, gated, feedback ?? scratch.grid);

  presentCtx.clearRect(0, 0, w, h);
  if (mode === COMPOSITOR_MODE.DelayedEcho) {
    presentCtx.globalAlpha = 0.22 + gated.motionS * 0.15;
    presentCtx.drawImage(scratch.grid, 0, 0);
    presentCtx.globalAlpha = 1;
    presentCtx.drawImage(scratch.echo, 0, 0);
  } else {
    presentCtx.drawImage(scratch.grid, 0, 0);
    presentCtx.globalAlpha = 0.48 + gated.motionA * 0.2;
    presentCtx.drawImage(scratch.echo, 0, 0);
    presentCtx.globalAlpha = 1;
  }

  ctx.drawImage(scratch.present, 0, 0);
  applyStrobeVignette(ctx, w, h, gated);
}

export function createCompositorScratch(): Scratch {
  return {
    grid: document.createElement('canvas'),
    echo: document.createElement('canvas'),
    present: document.createElement('canvas'),
  };
}
