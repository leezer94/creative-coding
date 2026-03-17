---
title: Config and constants guide
type: reference
status: active
---

# Config and constants guide

All tweakable constants for the artwork live in **`src/config.ts`**. No magic numbers in components; change behavior here.

## COLORS

| Key | Role | Notes |
|-----|------|--------|
| `background` | Canvas/clear color | Hex; matches `index.css` body background |
| `meshPrimary` | Main 3D form (torus knot) | Emissive + base color |
| `meshSecondary` | Half of orbiting icosahedra | Also used for a point light |
| `meshAccent` | Other half of orbiters | Also used for a point light |
| `particleR/G/B` | p5 particle stroke | 0–255; alpha is per-particle in PARTICLES |
| `fogNear` / `fogFar` | Fog start/end distance | World units; depth feel |

## SCENE (3D layer)

| Key | Role | Notes |
|-----|------|--------|
| `mainRotationSpeed` | Torus knot rotation | Radians per second |
| `orbitSpeed` | Orbiting icosahedra | Radians per second |
| `floatAmplitude` | Up/down float (sine) | World units |
| `floatPeriod` | Float cycle length | Seconds |
| `cameraMouseInfluence` | How much camera follows pointer | 0 = none, 1 = full |
| `cameraMaxTilt` | Max camera tilt | Radians |

## PARTICLES (p5 overlay)

| Key | Role | Notes |
|-----|------|--------|
| `count` | Number of particles | More = denser trails, higher cost |
| `strokeWeight` | Line thickness | Multiplied by per-particle size |
| `maxAlpha` | Max stroke opacity | 0–255 |
| `mouseAttract` | Pull toward cursor | Stronger = more reactive |
| `noiseScale` | Perlin noise input step | Drift character |
| `driftSpeed` | Noise → velocity multiplier | Higher = more movement |
| `spawnRadiusMin/Max` | Initial spawn ring | Pixels from center |

## Where to tweak what

- **Overall mood (dark/light, palette)** → `COLORS`
- **3D motion (speed, float, camera)** → `SCENE`
- **Particle density, trail length, interactivity** → `PARTICLES`

Keep new constants in the appropriate section and document with a short comment. Do not scatter magic numbers in `Scene.tsx` or `Sketch.tsx`.
