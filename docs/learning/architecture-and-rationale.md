---
title: Architecture and rationale (learning)
type: reference
status: archived-topic
---

# Architecture and rationale

> **이 저장소의 현재 작품은 _Viscous Memory_(카메라 + MediaPipe + p5 유체 필드 + DOM 리빌)입니다.**  
> 아래는 예전 “Memory of the Bar” 스택(R3F + p5 + 포인터)을 배우며 쓰던 설명의 자리입니다. 지금 코드베이스와는 맞지 않으니, **실전 설명은 [Hand-Fluid + MediaPipe 학습 가이드](./hand-fluid-mediapipe-guide.md)** 를 보세요.

## 현재 작품에서의 대응 관계(짧게)

| 아이디어         | 현재 구현                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| 레이어 나누기    | 배경(`App`) · p5 캔버스(`Sketch`) · 텍스트(`FluidContentLayer`) · 상태 배너(`CameraStatusOverlay`) |
| 단일 진실 공급원 | Zustand `store.ts` — 카메라, `hands.left`/`hands.right`, `fluid`, `fluidState`                     |
| 입력 브로커      | `setup-input-broker.ts` — 카메라 + `HandLandmarker` + `requestAnimationFrame` 루프                 |
| 튜닝 상수        | `config.ts` — `ATMOSPHERE`, `HAND_TRACKING`, `FLUID`, `CONTENT`                                    |

p5는 **instance mode**로 마운트하고, `setup` / `windowResized` / teardown을 유지하는 패턴은 그대로 유효합니다.
