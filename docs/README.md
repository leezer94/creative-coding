---
title: Docs Index
type: index
status: active
---

# Project documentation

Creative-coding piece **Viscous Memory**: camera hand tracking, p5 fluid field, minimal DOM content reveal. Constants live in `apps/viscous-memory/src/config.ts`.

**Monorepo:** pnpm workspace + [Turborepo](https://turbo.build/) — 루트에서 `pnpm dev` / `pnpm build` 등으로 `apps/*` Vite 앱을 실행합니다. 공통 의존성 버전은 `pnpm-workspace.yaml`의 `catalog`를 따릅니다.

## Doc map

| Directory                        | Purpose                                                  |
| -------------------------------- | -------------------------------------------------------- |
| [architecture/](./architecture/) | Config guide, library policy, Mirror Room 공개 배포·SFU  |
| [learning/](./learning/)         | Hand-Fluid + MediaPipe guide (Korean), short legacy note |
| [agent/](./agent/)               | Agent persona                                            |
| [workflow/](./workflow/)         | Task flow, review checklist                              |
| [ideation/](./ideation/)         | Concept / build prompts for new pieces                   |

## Quick links

- [**Mirror Room — dual-camera build prompt (EN)**](./ideation/mirror-room-build-prompt.md) — Host (Mac) + Guest (phone WebRTC), compositor spec.
- [**Mirror Room — app README**](../apps/mirror-room/README.md) — run signal + Vite, LAN env notes.
- [**Mirror Room — 공개 배포 (정적 프론트 + 공개 WSS)**](./architecture/mirror-room-public-deploy.md) — `VITE_SIGNAL_URL`, 터널/프록시, 체크리스트.
- [**Mirror Room — SFU 마이그레이션**](./architecture/mirror-room-sfu-migration.md) — 10인 다자 카메라, SFU·SDK, 단계별 계획.
- [**Hand-Fluid + MediaPipe 학습 가이드**](./learning/hand-fluid-mediapipe-guide.md) — Main technical walkthrough (Korean).
- [Config guide](./architecture/config-guide.md) — `ATMOSPHERE`, `HAND_TRACKING`, `FLUID`, `CONTENT`.
- [Library recognition](./architecture/library-recognition.md) — Stack boundaries for agents.
- [Architecture note (legacy slot)](./learning/architecture-and-rationale.md) — Pointer to current guide; old bar/R3F narrative retired.
- [Persona](./agent/persona.md) · [Workflow](./workflow/workflow.md)

## Doc priority (for agents)

Official library docs → `docs/` → existing code → memory.
