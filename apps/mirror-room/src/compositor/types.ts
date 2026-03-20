import type { CompositorMode } from '@/config';

export type FrameFeatures = {
  motionS: number;
  motionA: number;
  faceCountS: number;
  faceCountA: number;
  spreadS: number;
  spreadA: number;
  strobe: number;
  guestConnected: boolean;
  timeMs: number;
};

export type CompositorRenderer = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  f: FrameFeatures,
  mode: CompositorMode,
  feedback: CanvasImageSource | null
) => void;
