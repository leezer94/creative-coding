---
title: Library Recognition and Documentation Policy
type: reference
status: active
---

# Library Recognition and Documentation Policy

## Purpose

This document tells the agent how to behave when a task touches a known library in the stack.

## Current artwork stack (Viscous Memory)

| Concern        | Library                     | Notes                                                                                            |
| -------------- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| Build          | **Vite**                    | Dev server, HMR, `import.meta.env.BASE_URL` for public asset URLs.                               |
| UI shell       | **React** + **TypeScript**  | Functional components; camera/ML lifecycle in `useEffect` where needed.                          |
| State          | **Zustand**                 | Camera, hands, fluid params, derived reveal/blur for DOM layer.                                  |
| 2D fluid field | **p5.js**                   | Instance mode inside `Sketch.tsx`; not global mode.                                              |
| Hand tracking  | **@mediapipe/tasks-vision** | `HandLandmarker` + WASM/model from `public/mediapipe` (see `scripts/sync-mediapipe-public.mjs`). |

**React Three Fiber / Three.js / Leva** are not part of the current piece; do not add them unless the project scope explicitly expands to 3D again.

### p5.js

- Use instance mode; mount in a dedicated component.
- Include setup, resize handling, and teardown (`p.remove()`).
- Do not let p5 own the whole app shell.

### MediaPipe

- Prefer same-origin WASM + `.task` under `public/mediapipe` when CDN is blocked.
- `vite.config.ts` aliases `@mediapipe/tasks-vision` → `vision_bundle.mjs` because the package `exports` field breaks some bundlers.

## Documentation priority order

1. Official library docs
2. Project `docs/` (especially `learning/hand-fluid-mediapipe-guide.md`)
3. Existing code patterns
4. Memory

## Red flags

- Mixing MediaPipe/video logic into p5 `draw` in a messy way — keep broker vs sketch boundaries clear.
- Introducing p5 global mode.
- Adding R3F/Three for a small UI tweak on a purely 2D + DOM piece.
