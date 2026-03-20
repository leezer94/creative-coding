# Viscous Memory — hand-fluid web piece

카메라로 손을 추적하고, 화면을 **액체처럼 교란**해 텍스트가 드러났다 잠기는 설치작품형 웹 페이지입니다.

**Stack:** Vite · React 19 · TypeScript · p5.js · Zustand · MediaPipe Hand Landmarker (`@mediapipe/tasks-vision`)

## Quick start

```bash
pnpm install
pnpm dev
```

브라우저에서 [http://localhost:5173](http://localhost:5173) 을 열고 카메라 권한을 허용합니다.  
`pnpm install` 시 `public/mediapipe` 에 WASM·모델이 동기화됩니다(자세한 내용은 `docs/learning/hand-fluid-mediapipe-guide.md`).

## Project structure

```
src/
├── App.tsx                      # 풀스크린 셸 + 입력 브로커 마운트
├── main.tsx
├── index.css
├── config.ts                    # 분위기·손 추적·유체·카피 상수
├── store.ts                     # 카메라 / 양손 / 유체 요약 상태
├── input/setupInputBroker.ts    # getUserMedia + HandLandmarker + rAF
├── types/mediapipe-tasks-vision.d.ts
└── components/
    ├── Sketch.tsx               # p5 유체 필드
    ├── FluidContentLayer.tsx    # 리빌되는 텍스트 레이어
    └── CameraStatusOverlay.tsx
scripts/
└── sync-mediapipe-public.mjs    # postinstall: WASM/모델 → public/mediapipe
```

## 튜닝

행동·분위기는 **`src/config.ts`** 의 `ATMOSPHERE`, `HAND_TRACKING`, `FLUID`, `CONTENT` 만 조정하면 됩니다.

## 문서

- [docs/README.md](docs/README.md) — 문서 인덱스
- [Hand-Fluid + MediaPipe 학습 가이드](docs/learning/hand-fluid-mediapipe-guide.md)
