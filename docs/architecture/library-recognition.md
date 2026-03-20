---
title: Library Recognition and Documentation Policy
type: reference
status: active
---

# Library Recognition and Documentation Policy

## Purpose

This document tells the agent how to behave when a task touches a known library in the stack.

## Current artwork stack (Viscous Memory)

| Concern        | Library                     | Notes                                                                                                        |
| -------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Monorepo tasks | **Turborepo** (`turbo`)     | 루트에서 `pnpm dev` / `build` / `lint` / `preview` → 워크스페이스 앱의 동일 스크립트를 캐시·병렬 실행.       |
| Build          | **Vite**                    | Dev server, HMR, `import.meta.env.BASE_URL` for public asset URLs.                                           |
| UI shell       | **React** + **TypeScript**  | Functional components; camera/ML lifecycle in `useEffect` where needed.                                      |
| State          | **Zustand**                 | Camera, hands, fluid params, derived reveal/blur for DOM layer.                                              |
| 2D fluid field | **p5.js**                   | Instance mode inside `sketch.tsx`; not global mode.                                                          |
| Hand tracking  | **@mediapipe/tasks-vision** | `HandLandmarker` + WASM/model under each app’s `public/mediapipe` (see `scripts/sync-mediapipe-public.mjs`). |

**React Three Fiber / Three.js / Leva** are not part of the current piece; do not add them unless the project scope explicitly expands to 3D again.

### p5.js

- Use instance mode; mount in a dedicated component.
- Include setup, resize handling, and teardown (`p.remove()`).
- Do not let p5 own the whole app shell.

### MediaPipe

- Prefer same-origin WASM + `.task` under each app’s `public/mediapipe` when CDN is blocked.
- `vite.config.ts` aliases `@mediapipe/tasks-vision` → `vision_bundle.mjs` because the package `exports` field breaks some bundlers.

### Repo layout (pnpm + Turbo)

- 공통 라이브러리 버전은 [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml)의 `catalog`에 한 번만 적고, 각 앱 `package.json`에서는 `catalog:` 로 참조합니다.
- 새 Vite 앱은 `apps/<name>`에 두고 `package.json`에 `dev` / `build` / `lint`(선택) / `preview` 스크립트를 정의하면 Turbo 파이프라인에 자동 포함됩니다.

## Documentation priority order

1. Official library docs
2. Project `docs/` (especially `learning/hand-fluid-mediapipe-guide.md`)
3. Existing code patterns
4. Memory

## Red flags

- Mixing MediaPipe/video logic into p5 `draw` in a messy way — keep broker vs sketch boundaries clear.
- Introducing p5 global mode.
- Adding R3F/Three for a small UI tweak on a purely 2D + DOM piece.
