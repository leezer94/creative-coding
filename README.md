# Creative Coding — React Three Fiber + p5.js

A dreamy generative artwork starter built with **Vite + React 19 + TypeScript**.  
It combines a reactive 3D scene with a soft 2D particle overlay.

## Stack

| Layer | Library | Role |
|-------|---------|------|
| 3D scene | [@react-three/fiber](https://github.com/pmndrs/react-three-fiber) + [three.js](https://threejs.org/) | Camera, lights, animated meshes |
| 3D helpers | [@react-three/drei](https://github.com/pmndrs/drei) | `MeshDistortMaterial` organic wobble |
| 2D overlay | [p5.js](https://p5js.org/) (instance mode) | Perlin-noise particles, mouse attraction |
| Build | [Vite](https://vitejs.dev/) | Dev server, HMR, production build |

---

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Project structure

```
src/
├── config.ts              # ← All tweakable constants (colors, speed, density)
├── App.tsx                # App shell – stacks the two layers
├── main.tsx               # React entry point
├── index.css              # Minimal global reset
└── components/
    ├── Scene.tsx          # React Three Fiber 3D scene
    └── Sketch.tsx         # p5.js 2D particle overlay
```

---

## Architecture

### React Three Fiber (`Scene.tsx`)
Owns the entire 3D rendering pipeline:
- **Camera rig** – smooth mouse-driven tilt via `useFrame`
- **Lighting** – ambient + directional + two coloured point lights
- **MainForm** – a floating, wobbling `TorusKnot` (via `MeshDistortMaterial`)
- **Orbiters** – six `Icosahedron` meshes in polar orbit
- **Fog** – depth fade for atmosphere

### p5.js (`Sketch.tsx`)
Owns the 2D overlay, mounted in instance mode inside a React `useRef` container:
- Perlin-noise drift per particle
- Mouse-proximity attraction
- Alpha-based trail fade
- Canvas resizes with the window
- p5 instance is cleaned up on component unmount

The two layers never share rendering state — they are visually composed by CSS stacking
(`position: absolute`, `pointer-events: none` on the p5 canvas).

---

## Customisation

All tweakable values live in **`src/config.ts`**:

```ts
// Colors
COLORS.background    // scene clear color
COLORS.meshPrimary   // main torus knot hue
COLORS.meshSecondary // orbiter accent hue
COLORS.meshAccent    // second orbiter accent

// 3D motion
SCENE.mainRotationSpeed    // radians/s for the main form
SCENE.orbitSpeed           // radians/s for satellites
SCENE.floatAmplitude       // vertical float range (world units)
SCENE.cameraMouseInfluence // mouse tilt sensitivity

// p5 particle layer
PARTICLES.count            // number of particles
PARTICLES.mouseAttract     // mouse pull strength
PARTICLES.driftSpeed       // noise drift multiplier
PARTICLES.maxAlpha         // particle opacity ceiling
```

---

## Next experiments

1. **Colour themes** – add multiple palettes to `config.ts` and cycle them with a keypress
2. **Audio reactivity** – use the Web Audio API to drive `floatAmplitude` and `distort` from microphone input
3. **p5 HUD** – draw frame-rate, pointer coordinates, or generative text in the overlay
4. **Post-processing** – add `@react-three/postprocessing` bloom/chromatic aberration on the R3F canvas
5. **GLSL shaders** – swap `meshStandardMaterial` for a custom `shaderMaterial` (via `@react-three/drei`) to explore vertex displacement
