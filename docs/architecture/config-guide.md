---
title: Config and constants guide (Viscous Memory)
type: reference
status: active
---

# Config and constants guide

모든 조절 가능한 값은 **`src/config.ts`** 에만 둡니다. 컴포넌트 안에 매직 넘버를 흩뿌리지 마세요.

## ATMOSPHERE

| Key                                  | 역할                                      |
| ------------------------------------ | ----------------------------------------- |
| `backgroundTop` / `backgroundBottom` | `App` 그라데이션 배경 (`linear-gradient`) |

## HAND_TRACKING

| Key                                       | 역할                                          |
| ----------------------------------------- | --------------------------------------------- |
| `maxHands`                                | MediaPipe가 동시에 볼 수 있는 손 수(보통 `2`) |
| `smoothingPosition` / `smoothingVelocity` | EMA에 가까운 스무딩(작을수록 끈적)            |
| `minConfidence`                           | handedness 신뢰도 임계값                      |
| `minimumMotion`                           | “움직임으로 인정” 최소 속도                   |

## HAND_VISUAL

검지 끝 **선명한 글리프**(방사형 그라데이션 + 링). 유체 레이어 블러 뒤에 그려짐. `leftRgb` / `rightRgb`로 양손 구분.

## FLUID

| Key                                                       | 역할                               |
| --------------------------------------------------------- | ---------------------------------- |
| `fieldScale`                                              | 유체 그리드 해상도(화면 대비 비율) |
| `advectionDrag` / `diffusion` / `decay`                   | 번짐·잔향·소멸                     |
| `depositRadius` / `depositStrength` / `velocityInfluence` | 손끝이 필드에 남기는 압력          |
| `blurPx` / `glowAlpha`                                    | 시각적 부드러움                    |
| `revealGain` / `settleLerp`                               | DOM 리빌 요약값 반응               |

## CONTENT

타이틀, 리드 카피, 네비 라벨(장식용 텍스트).

## 참고 코드

- 유체 디포짓: `src/components/Sketch.tsx`
- 손 → 스토어: `src/input/setupInputBroker.ts`
