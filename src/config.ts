// ─── Tweakable constants ──────────────────────────────────────────────────────
// Modify these to quickly change the visual character of the artwork.

// ── Color palette ─────────────────────────────────────────────────────────────
export const COLORS = {
  /** Canvas/background clear color */
  background: '#070b14',

  // 3D mesh base hue (passed as emissive + material color)
  meshPrimary: '#7c3aed',   // violet
  meshSecondary: '#0ea5e9', // sky blue
  meshAccent: '#f59e0b',    // amber

  // p5 particle stroke color (RGBA components 0–255)
  particleR: 130,
  particleG: 180,
  particleB: 255,

  /** Fog near / far distances */
  fogNear: 6,
  fogFar: 18,
} as const;

// ── 3D scene motion ───────────────────────────────────────────────────────────
export const SCENE = {
  /** Radians per second for the main form spin */
  mainRotationSpeed: 0.3,
  /** Radians per second for the orbiting rings */
  orbitSpeed: 0.18,
  /** Amplitude of the up/down float sine wave (world units) */
  floatAmplitude: 0.25,
  /** Period of the float wave in seconds */
  floatPeriod: 3.5,
  /** How strongly the camera tilts toward the pointer (0 = none, 1 = full) */
  cameraMouseInfluence: 0.08,
  /** Max camera tilt in radians */
  cameraMaxTilt: 0.35,
} as const;

// ── p5 particle layer ─────────────────────────────────────────────────────────
export const PARTICLES = {
  /** How many particles to spawn */
  count: 80,
  /** Base stroke weight of each particle */
  strokeWeight: 1.2,
  /** Maximum alpha (0–255) */
  maxAlpha: 160,
  /** How strongly particles are attracted toward the mouse */
  mouseAttract: 0.012,
  /** Perlin noise scale driving drift */
  noiseScale: 0.004,
  /** Speed multiplier for noise-driven drift */
  driftSpeed: 1.0,
  /** Minimum / maximum initial radius of each particle around center */
  spawnRadiusMin: 40,
  spawnRadiusMax: 320,
} as const;
