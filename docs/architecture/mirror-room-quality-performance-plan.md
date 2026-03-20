---
title: Mirror Room — 코드 품질·성능 최적화 플랜
type: plan
status: active
---

# Mirror Room — 코드 품질·성능 최적화 플랜

**범위:** [`apps/mirror-room`](../../apps/mirror-room) (Vite + React, WebRTC/LiveKit, MediaPipe Face Landmarker, Canvas 합성 루프)

**목표:** 유지보수·안전성을 높이는 **코드 품질** 개선과, 전시·모바일에서 체감되는 **지연·CPU·메모리**를 줄이는 **성능** 개선을 **우선순위와 단계**로 정리한다. 구현은 이 문서를 체크리스트로 삼아 순차 적용하면 된다.

---

## 1. 현재 구조와 병목 요약

| 영역       | 역할                                                                                                                                             | 품질/성능 포인트                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| **라우팅** | `/` 호스트, `/g/:sessionId` 게스트 ([`src/app.tsx`](../../apps/mirror-room/src/app.tsx))                                                         | 초기 번들에 양쪽 페이지·의존성이 함께 실릴 수 있음 → **지연 로딩** 후보   |
| **합성**   | `requestAnimationFrame` 루프 + Canvas ([`compositor-canvas.tsx`](../../apps/mirror-room/src/components/compositor-canvas.tsx))                   | 매 프레임 `getContext('2d')`, 모션·얼굴 추론 빈도가 CPU에 직결            |
| **분석**   | 모션 샘플러·Face Landmarker ([`analysis/`](../../apps/mirror-room/src/analysis), [`config.ts` `ANALYSIS`](../../apps/mirror-room/src/config.ts)) | `faceDetectHz`, `motionSampleSize` 튜닝, **랜드마커 2개** 인스턴스 메모리 |
| **미디어** | P2P vs SFU ([`webrtc/`](../../apps/mirror-room/src/webrtc), [`config.ts` `VIDEO_PUBLISH`](../../apps/mirror-room/src/config.ts))                 | 해상도·비트레이트·LiveKit adaptive 설정이 대역·CPU에 영향                 |
| **빌드**   | Vite ([`vite.config.ts`](../../apps/mirror-room/vite.config.ts))                                                                                 | `manualChunks`, 압축, 에셋( MediaPipe WASM·모델 ) 캐시 정책               |

---

## 2. 코드 품질 플랜

### 2.1 유지보수·가독성

1. **대형 페이지 분할**  
   [`host-page.tsx`](../../apps/mirror-room/src/routes/host-page.tsx)는 UI·상태·WebRTC 연결이 한 파일에 모여 있다. **레이아웃 / QR·세션 / 미리보기 독 / 경고 배너** 단위로 컴포넌트·훅을 나누면 리뷰·테스트가 쉬워진다.

2. **WebRTC·LiveKit 경로 일관성**  
   `use-host-webrtc`, `use-guest-webrtc`, `use-livekit-room`의 **연결 수명**(mount/unmount, 재시도, 토큰 만료)과 **에러 표면화**(사용자 메시지 vs 콘솔만) 패턴을 맞춘다. 중복 로직은 작은 유틸로 모은다.

3. **설정 단일 출처**  
   이미 [`config.ts`](../../apps/mirror-room/src/config.ts)에 분석·비디오·LiveKit 게스트 품질이 모여 있다. 새 상수는 여기(또는 `webrtc/` 전용 작은 모듈)에 두고, 컴포넌트 내부 매직 넘버를 줄인다.

4. **타입·주석**  
   `FrameFeatures`, `CompositorMode` 등 공개 타입은 합성·디버그 HUD와 의미가 같도록 유지한다. WebRTC 시그널 페이로드가 있으면 **discriminated union**으로 좁힌다.

### 2.2 정적 분석·스타일

| 항목            | 제안                                                                                                                                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ESLint**      | 루트 [`eslint.config.js`](../../eslint.config.js)는 이미 `typescript-eslint` recommended + react-hooks. mirror-room만 `@typescript-eslint/strict-type-checked` 등 **단계적 강화**를 검토(노이즈 대비 이득 판단). |
| **React Hooks** | `useEffect` 의존성 배열이 의도와 다르면 버그·불필요한 재실행으로 이어진다. `compositor-canvas`처럼 ref로 최신 값을 읽는 패턴은 **주석 한 줄**로 의도를 박아 두면 좋다.                                           |
| **포맷**        | 루트 Prettier + lint-staged와 동일하게 유지.                                                                                                                                                                     |

### 2.3 테스트 전략 (선택·단계)

- **순수 로직 우선:** [`statsFromLandmarks`](../../apps/mirror-room/src/analysis/face-stats.ts), [`computeStrobeGate`](../../apps/mirror-room/src/compositor/strobe-gate.ts), 모션 샘플러 출력 범위 등은 **단위 테스트** 후보.
- **통합:** 실제 카메라·MediaPipe 없이 Canvas/비디오를 모킹하기 어렵다면, **수동 시나리오 체크리스트**(호스트 단독 / 게스트 연결 / SFU / 네트워크 끊김)를 문서에 유지한다.

---

## 3. 성능 플랜

### 3.1 런타임(브라우저) — 우선순위 높음

1. **Canvas 컨텍스트 캐시**  
   [`compositor-canvas.tsx`](../../apps/mirror-room/src/components/compositor-canvas.tsx) 루프에서 매 프레임 `canvas.getContext('2d')`를 호출한다. 스펙상 캐시되지만, **한 번 얻어 `useRef`에 보관**하면 불필요한 조회와 분기 비용을 줄일 수 있다. 디버그 HUD도 동일 컨텍스트 재사용을 검토한다.

2. **분석 빈도·해상도**  
   [`ANALYSIS.motionSampleSize`](../../apps/mirror-room/src/config.ts)(기본 96), `faceDetectHz`(기본 12Hz)는 저사양 기기에서 낮추는 것이 첫 레버다. 전시 모드용 **`VITE_*` 또는 런타임 “저전력” 토글**을 두면 환경별 튜닝이 쉬워진다.

3. **MediaPipe**  
   얼굴이 필요 없는 설치에서는 랜드마커 생성 자체를 스킵하는 옵션, 또는 **단일 랜드마커**로 순차 처리(지연 vs 메모리 트레이드오프)를 설계 문서에 명시하고 측정 후 결정한다.

4. **합성 경로**  
   [`render-frame.ts`](../../apps/mirror-room/src/compositor/render-frame.ts)는 스크래치 캔버스 3장 + 피드백 복사로 구성된다. 프로파일에서 `drawImage`/`getImageData` 비중이 크면 **모드별로 경량 패스**(예: 게스트 미연결 시 에코 생략)를 조건부로 태운다.

### 3.2 네트워크·미디어

1. **비디오 인코딩**  
   [`VIDEO_PUBLISH`](../../apps/mirror-room/src/config.ts)와 `getVideoPublishMaxBitrate()`는 이미 상한을 둔다. 현장 네트워크에 맞춰 **해상도·fps 상한**을 한 단계 내리는 프리셋을 문서화한다.

2. **LiveKit**  
   [`getLiveKitGuestAdaptiveStream()`](../../apps/mirror-room/src/config.ts)는 DPR 반영 vs 풀 품질 트레이드오프가 있다. “화질 우선”과 “데이터 절약” 프리셋을 배포 환경 변수와 함께 표로 정리한다. 상세는 [mirror-room-livekit.md](./mirror-room-livekit.md).

3. **ICE·시그널**  
   [mirror-room-public-deploy.md](./mirror-room-public-deploy.md)의 STUN/TURN·`wss` 요구사항을 만족하지 않으면 재연결·타임아웃이 늘어 체감 성능이 나빠진다. **연결 상태 UI**로 사용자에게 원인을 보여 주는 것도 “체감 품질”에 포함한다.

### 3.3 빌드·배포

1. **코드 분할**  
   `React.lazy` + `Suspense`로 `HostPage` / `GuestPage`를 분리하면 초기 JS 파싱·실행을 줄일 수 있다. LiveKit·QR 등 무거운 의존성은 **해당 라우트 또는 SFU 경로에서만** 동적 import하는 방안을 검토한다.

2. **Vite**  
   `build.rollupOptions.output.manualChunks`로 `react`, `livekit-client`, `@mediapipe/tasks-vision` 등을 분리하면 캐시 효율이 좋아질 수 있다(실제 gzip 크기 측정 후 적용).

3. **정적 에셋**  
   MediaPipe WASM·`.task` 모델은 용량이 크다. **HTTP 캐시 헤더**(CDN/Netlify 설정)와 파일명 버전 정책을 배포 문서와 맞춘다.

4. **Source map**  
   프로덕션에서 소스맵 공개 정책은 보안·디버깅 트레이드오프; 필요 시 Netlify/Vercel에서만 비공개 업로드 등을 선택한다.

---

## 4. 측정·검증

| 목적                        | 방법                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **합성 FPS**                | [`DEBUG_PERF`](../../apps/mirror-room/src/config.ts)를 잠시 켜고 콘솔에 찍히는 대략 FPS 확인                             |
| **메인 스레드 장시간 작업** | Chrome Performance: Long task, `requestAnimationFrame` 간격                                                              |
| **번들 크기**               | `pnpm --filter mirror-room build` 후 `dist/assets` 용량, `vite-plugin-visualizer` 등(도입 시 루트 의존성 정책에 맞출 것) |
| **로딩**                    | Lighthouse(로컬 preview 또는 스테이징): FCP/LCP, TBT                                                                     |
| **실제 네트워크**           | throttle + 실제 모바일 기기에서 게스트 경로                                                                              |

---

## 5. 실행 로드맵(권장 순서)

| 단계          | 코드 품질                                        | 성능                                                                |
| ------------- | ------------------------------------------------ | ------------------------------------------------------------------- |
| **P0 (즉시)** | 호스트 페이지 모듈 경계만 나누기(읽기 쉬운 단위) | `ANALYSIS`·비디오 상한을 현장에 맞게 조정; Canvas `getContext` 캐시 |
| **P1 (단기)** | WebRTC 에러·재연결 메시지 통일                   | 라우트 단위 `lazy` + 필요 시 `manualChunks`                         |
| **P2 (중기)** | 순수 함수 단위 테스트 도입                       | MediaPipe/합성 경로 프로파일 후 조건부 경량 패스·워커 검토          |

### P0 / P1 구현 상태 (반영됨)

| 단계   | 내용                           | 주요 위치                                                                                                                                                                                                                                                                                                                      |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **P0** | 호스트 UI 분할                 | [`host-utils.ts`](../../apps/mirror-room/src/routes/host-utils.ts), [`host-preview-panel.tsx`](../../apps/mirror-room/src/components/host-preview-panel.tsx), [`host-settings-drawer.tsx`](../../apps/mirror-room/src/components/host-settings-drawer.tsx), [`host-page.tsx`](../../apps/mirror-room/src/routes/host-page.tsx) |
| **P0** | 합성 분석 `VITE_*` + 얼굴 스킵 | [`config.ts`](../../apps/mirror-room/src/config.ts) `getAnalysisConfig`, `getSkipFaceLandmarker` · [`compositor-canvas.tsx`](../../apps/mirror-room/src/components/compositor-canvas.tsx)                                                                                                                                      |
| **P0** | Canvas `getContext` 캐시       | [`compositor-canvas.tsx`](../../apps/mirror-room/src/components/compositor-canvas.tsx)                                                                                                                                                                                                                                         |
| **P1** | 라우트 `lazy`                  | [`app.tsx`](../../apps/mirror-room/src/app.tsx)                                                                                                                                                                                                                                                                                |
| **P1** | `manualChunks`                 | [`vite.config.ts`](../../apps/mirror-room/vite.config.ts)                                                                                                                                                                                                                                                                      |
| **P1** | 연결 상태 문구 통일            | [`connection-messages.ts`](../../apps/mirror-room/src/webrtc/connection-messages.ts) · 호스트 [`HostSettingsDrawer`](../../apps/mirror-room/src/components/host-settings-drawer.tsx) · 게스트 [`guest-page.tsx`](../../apps/mirror-room/src/routes/guest-page.tsx)                                                             |

합성·분석 관련 빌드 타임 변수는 [`apps/mirror-room/.env.example`](../../apps/mirror-room/.env.example)와 동일한 이름으로 맞춘다 (`VITE_LOW_POWER_ANALYSIS`, `VITE_ANALYSIS_*`, `VITE_SKIP_FACE_LANDMARKER`).

---

## 6. 관련 문서

- [mirror-room-public-deploy.md](./mirror-room-public-deploy.md) — 정적 배포·시그널·환경 변수
- [mirror-room-livekit.md](./mirror-room-livekit.md) — SFU·토큰·게스트 품질
- [mirror-room-sfu-migration.md](./mirror-room-sfu-migration.md) — SFU 마이그레이션 맥락

이 플랜은 구현 우선순위가 바뀌면 **본문과 표를 업데이트**하고, `status`를 `superseded`로 두고 대체 문서를 링크하는 방식을 권장한다.
