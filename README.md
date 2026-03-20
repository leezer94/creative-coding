# Viscous Memory — hand-fluid web piece

카메라로 손을 추적하고, 화면을 **액체처럼 교란**해 텍스트가 드러났다 잠기는 설치작품형 웹 페이지입니다.

**Stack:** Vite · React 19 · TypeScript · p5.js · Zustand · MediaPipe Hand Landmarker (`@mediapipe/tasks-vision`)

## Quick start

```bash
pnpm install
pnpm dev
```

브라우저에서 [http://localhost:5173](http://localhost:5173) 을 열고 카메라 권한을 허용합니다.  
`pnpm install` 시 `postinstall`로 `apps/viscous-memory/public/mediapipe` 에 WASM·모델이 동기화됩니다(자세한 내용은 `docs/learning/hand-fluid-mediapipe-guide.md`).

## 루트 스크립트 (`package.json`)

| 스크립트                  | 설명                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `pnpm dev`                | `turbo run dev` — 워크스페이스 앱의 개발 서버를 모두 실행(앱이 여러 개일 때).                                |
| `pnpm dev:viscous-memory` | `viscous-memory` 앱만 개발 서버 실행. 새 앱 추가 시 `dev:<패키지명>` 스크립트를 같은 방식으로 늘리면 됩니다. |
| `pnpm build`              | `turbo run build` — 앱별 프로덕션 빌드.                                                                      |
| `pnpm preview`            | `turbo run preview` — 빌드 결과 미리보기(`vite preview` 등).                                                 |
| `pnpm lint`               | `turbo run lint` — 앱에 정의된 ESLint 태스크 실행.                                                           |
| `pnpm format`             | Prettier로 저장소 전체 포맷.                                                                                 |
| `pnpm format:check`       | Prettier 검사만 수행(CI용).                                                                                  |
| `postinstall`             | `sync-mediapipe-public.mjs`로 MediaPipe WASM·모델 동기화(직접 실행은 `pnpm run postinstall`).                |
| `prepare`                 | `husky` — Git hooks 설치(클론 후 `pnpm install` 시 한 번 실행).                                              |

동일하게 필터만 쓰려면: `pnpm --filter viscous-memory dev` (스크립트와 동작 동일).

## Project structure

```
apps/viscous-memory/
├── src/
│   ├── app.tsx                      # 풀스크린 셸 + 입력 브로커 마운트
│   ├── main.tsx
│   ├── index.css
│   ├── config.ts                    # 분위기·손 추적·유체·카피 상수
│   ├── store.ts                     # 카메라 / 양손 / 유체 요약 상태
│   ├── input/setup-input-broker.ts  # getUserMedia + HandLandmarker + rAF
│   ├── types/mediapipe-tasks-vision.d.ts
│   └── components/
│       ├── sketch.tsx               # p5 유체 필드
│       ├── fluid-content-layer.tsx  # 리빌되는 텍스트 레이어
│       └── camera-status-overlay.tsx
├── vite.config.ts
└── index.html
scripts/
└── sync-mediapipe-public.mjs    # postinstall: WASM/모델 → 앱 public/mediapipe
pnpm-workspace.yaml              # 워크스페이스 + pnpm catalog
turbo.json                       # Turborepo 태스크 (build / lint / dev / preview)
```

## 튜닝

행동·분위기는 **`apps/viscous-memory/src/config.ts`** 의 `ATMOSPHERE`, `HAND_TRACKING`, `FLUID`, `CONTENT` 만 조정하면 됩니다.

## 문서

- [docs/README.md](docs/README.md) — 문서 인덱스
- [Hand-Fluid + MediaPipe 학습 가이드](docs/learning/hand-fluid-mediapipe-guide.md)
