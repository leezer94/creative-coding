# Build Prompt: “Mirror Room” — Dual-camera techno/visual installation

**Target codebase:** new Vite + React + TypeScript app under `apps/` in the `creative-coding` monorepo (pnpm workspace + `catalog:` dependencies, Turborepo scripts). **Primary dev machine:** MacBook with built-in webcam. **Secondary input:** smartphone browser acting as a mobile camera peer.

**Codename / suggested package name:** `mirror-room` (adjust if renamed; keep consistent in `package.json` `name` field and Turbo filter commands).

---

## 0. One-line concept

Build a **two-role WebRTC experience** for a club/installation “background engine”: **MacBook = backstage / wide-stage camera**, **phone = audience-side / intimate gaze**. Both streams feed a single **abstract compositor** (no raw recognizable faces on the main output unless explicitly toggled for debug). The piece should read as **a mirror that only reflects motion, density, and rhythm**—not identity.

---

## 1. Creative intent (non-negotiable mood)

- **Genre:** techno-club visual layer; minimal UI chrome; high contrast; strobe-adjacent but configurable (no seizure-unfriendly defaults; provide intensity caps).
- **Metaphor:** _Mirror Room_ — the audience sees themselves only as **structure**: grids, silhouettes, scanlines, delayed echoes, interference between the two lenses.
- **Narrative loop:**
  1. Backstage camera establishes **space** (wide field, crowd distribution).
  2. Phone camera introduces **proximity** (close faces, hand-held drift, parallax).
  3. The compositor **cross-modulates** the two signals (e.g., wide-frame “crowd energy” sets global hue/scale; phone stream adds high-frequency detail/glitch).

---

## 2. User roles and flows

### Role A — Host (MacBook)

1. Opens **Host** route (e.g., `/`).
2. Grants webcam permission; selects **MacBook built-in camera** as **Lane S** (“Stage / Spatial”).
3. Host creates a **session**:
   - Generate `sessionId` (short, copyable).
   - Optionally display **QR code** encoding the **Guest URL** + `sessionId`.
4. Host starts signaling connection in **offer** mode; waits for guest.
5. When guest connects, Host receives **Lane A** (“Audience / Gaze”) `MediaStream`.
6. Host UI shows:
   - Small **confidence/status** indicators (connected / reconnecting / bitrate optional).
   - **Compositor fullscreen** output (projector-friendly).
   - Developer-only **debug panel** (toggle): show bounding boxes / landmarks / split view (default OFF).

### Role B — Guest (smartphone)

1. Opens **Guest** route (e.g., `/g/:sessionId` or `/join?sessionId=…`).
2. Grants camera permission; default **front camera** (user-facing) to match “gaze” metaphor; allow flip to environment camera.
3. Guest connects as **answer** peer; uploads **Lane A** video only (audio muted by default).
4. Guest UI stays **simple**: preview thumbnail optional; big “connected” state; battery-friendly options:
   - resolution cap (720p max recommended)
   - fps cap
   - “Disconnect”

### Session rules

- **No accounts.** Session is ephemeral.
- **No persistence** of video frames to disk in production builds (unless explicit opt-in lab flag).
- Document a **privacy line** on Guest page: “Processed locally between devices; not uploaded to a server” _only if true_. If you add a relay/TURN later, update copy.

---

## 3. Technical architecture (recommended)

### 3.1 Transport

- **WebRTC** (`RTCPeerConnection`) between Host and Guest browsers on the **same LAN** for development; plan for **TURN** configuration hooks for real venues (env vars, not committed secrets).
- **Signaling:** smallest viable channel:
  - **Option 1 (dev-friendly):** lightweight WebSocket server in the same monorepo (new `packages/signal-server` or tiny Node service) _or_ external free tier broker.
  - **Option 2 (MVP hack):** manual SDP exchange UI (bad UX; avoid for installation).
- **Discovery:** Session ID typed or QR; Host is the authority.

**Signaling message schema (minimal):**

- `hello-host` / `hello-guest`
- `offer`, `answer`, `ice-candidate`
- optional: `session-ended`

### 3.2 Video processing pipeline (Host only)

Two inputs:

- **Local `MediaStream`** from `getUserMedia` (Mac webcam) → **Lane S**
- **Remote `MediaStream`** from peer → **Lane A**

Processing strategy (choose pragmatic defaults, keep modular):

1. Render each stream to **offscreen** `<video>` elements (or `createImageBitmap` path if needed).
2. Sample frames at a controlled rate (e.g., 15–30 FPS) into **analysis** and **compositor**.
3. **Face / head analysis** (recommended alignment with repo capabilities):
   - Use `@mediapipe/tasks-vision` **FaceLandmarker** or **FaceDetector** on **both** lanes _if CPU/GPU allows_; otherwise:
     - full quality on Lane S only,
     - downscaled analysis on Lane A.
4. Extract **privacy-safe features** for visuals:
   - face count, bbox centers, approx scale
   - optional: head yaw/pitch smoothed
   - optional: blink / mouth openness as **triggers** (thresholded, heavily smoothed)
5. Feed features into a **Compositor** module:
   - **2D canvas** (fast iteration) _or_ **WebGL** (if needed).
   - Avoid uploading face textures to GPU for “recognition”; prefer **procedural** reaction to feature vectors.

### 3.3 “Mirror Room” compositor directions (implement ≥2)

Implement a **mode switch** (`MODE`) in a single config file (pattern like existing `src/config.ts` apps):

- **Interference Mesh:** triangulated silhouette / landmark-derived mesh for each lane; blend with XOR-like color ops; phone lane adds jitter.
- **Delayed Echo:** Lane A delayed by N ms into a feedback buffer; Lane S sets global feedback gain (crowded → more smear).
- **Dual Grid Scan:** horizontal scanline phase tied to Lane S centroid spread; vertical glitch static tied to Lane A motion magnitude.
- **Strobe Gate:** binary mask from combined motion energy; respects `MAX_STROBE_HZ` safety clamp.

All modes must degrade gracefully if Guest disconnects (Lane A features → zero / idle animation).

---

## 4. UX / routing

Suggest routes:

- `/` Host
- `/g/:sessionId` Guest

Mobile layout: Guest uses `100dvh`, safe-area padding, large touch targets.

Host layout: compositor full bleed; controls in a dismissible drawer.

---

## 5. Engineering standards (match monorepo)

- **TypeScript** strict where feasible; ESLint passes.
- Use workspace **`catalog:`** versions for `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript`, `@mediapipe/tasks-vision` if face tasks are included.
- Add script to root docs only if needed; keep README minimal.
- Turbo: `dev` task must run with Vite HMR.

---

## 6. Performance budgets

- Host analysis: target **≤ 12–20ms** average per combined frame on M-series Mac at 720p analysis resolution; downscale aggressively.
- Cap remote inbound resolution on Guest publish side (`applyConstraints`).
- Avoid duplicate MediaPipe graphs if possible; sequential processing acceptable for MVP with clear frame budget logging behind `DEBUG_PERF`.

---

## 7. Safety and venue constraints

- **No biometric identity claims** in UI; avoid “face recognition” wording—use **face detection / landmarks** language.
- **Strobe/intensity** defaults conservative; expose numeric caps in config.
- **Consent:** Guest must explicitly start camera; show connection peer info minimally.

---

## 8. Milestones (deliver in order)

1. **M1:** Monorepo app scaffold + Host local camera preview + basic full-screen shader/canvas.
2. **M2:** Guest page + signaling + working WebRTC video on Host.
3. **M3:** Feature extraction (face counts / motion) driving one compositor mode.
4. **M4:** Second compositor mode + graceful disconnect + QR session join.
5. **M5:** Polish: performance toggles, debug overlay, documentation (`apps/<name>/README.md`).

---

## 9. Acceptance criteria (definition of done)

- Host can run on MacBook webcam alone with a **degraded but stable** visual.
- Phone can join on same network within **30–60 seconds** without manual SDP copy/paste.
- Main output stays **abstract** under default settings (no unobscured video mirror of faces projected by default).
- Reconnect path does not require Host refresh (nice-to-have; acceptable MVP: refresh Host if complex).
- `pnpm --filter <app-name> dev` works; `pnpm --filter <app-name> build` succeeds.

---

## 10. Out of scope (unless explicitly added later)

- Audio-reactive beat detection from DJ mixer (can be a future module).
- Multi-guest fan-in (more than one phone).
- Cloud recording / analytics.
- Native mobile apps (web-only).

---

## 11. Optional branding strings (UI copy)

- Host title: **Mirror Room — Host**
- Guest title: **Mirror Room — Gaze**
- Status: **Lane S: spatial · Lane A: gaze**
- Privacy footnote: **Ephemeral session. Visuals are driven by motion summaries.**

---

_End of prompt._
