export const ATMOSPHERE = {
  backgroundTop: '#07080d',
  backgroundBottom: '#0d1118',
} as const;

export const HAND_TRACKING = {
  /** MediaPipe can track up to this many hands; each is mapped to left/right via handedness. */
  maxHands: 2,
  /** Higher = fingertip follows raw landmarks faster (more sensitive, slightly noisier). */
  smoothingPosition: 0.42,
  smoothingVelocity: 0.45,
  /** Lower = accept slightly weaker per-frame handedness scores. */
  minConfidence: 0.28,
  /** Lower = register smaller movements as “active”. */
  minimumMotion: 0.0007,
} as const;

/**
 * Fingertip glyphs drawn after the blurred fluid pass so they stay sharp on screen.
 * Left = cool tone, right = warm tone — readable separation without toy-like cursors.
 */
export const HAND_VISUAL = {
  outerRadiusPx: 88,
  midRadiusPx: 40,
  coreRadiusPx: 9,
  outerAlpha: 0.2,
  midAlpha: 0.38,
  coreAlpha: 0.82,
  /** Crisp ring at mid radius for legibility. */
  ringAlpha: 0.92,
  ringWeightPx: 1.35,
  leftRgb: [148, 178, 212] as const,
  rightRgb: [212, 178, 158] as const,
} as const;

export const FLUID = {
  fieldScale: 0.22,
  advectionDrag: 0.93,
  diffusion: 0.18,
  decay: 0.968,
  depositRadius: 0.075,
  depositStrength: 1.28,
  velocityInfluence: 1.05,
  blurPx: 16,
  glowAlpha: 0.42,
  revealGain: 1.25,
  settleLerp: 0.08,
} as const;

export const CONTENT = {
  title: 'Viscous Memory',
  lead: 'Move one or both hands through the dark field. Disturbance reveals language, then lets it sink again.',
  links: ['Edition One', 'Chamber', 'Archive'],
} as const;
