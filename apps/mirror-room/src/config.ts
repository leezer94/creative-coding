export const COMPOSITOR_MODE = {
  DualGridScan: 'dual-grid-scan',
  DelayedEcho: 'delayed-echo',
} as const;

export type CompositorMode = (typeof COMPOSITOR_MODE)[keyof typeof COMPOSITOR_MODE];

/** Active visual mode driven by `CompositorCanvas`. */
export const MODE: CompositorMode = COMPOSITOR_MODE.DualGridScan;

/** Upper bound for strobe-style cutouts (Hz); conservative default. */
export const MAX_STROBE_HZ = 4;

export const ANALYSIS = {
  /** Longer edge for motion sampling (keeps CPU low). */
  motionSampleSize: 96,
  /** How often to run face landmarker per second (per lane, approximate). */
  faceDetectHz: 12,
} as const;

export const DEBUG = false;
export const DEBUG_PERF = false;

/** Guest publish cap (ideal max). */
export const GUEST_VIDEO = {
  maxWidth: 1280,
  maxHeight: 720,
  maxFrameRate: 30,
} as const;
