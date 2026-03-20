# Mirror Room

Techno/installation-style dual-camera piece: **Host (Mac)** runs Lane S (local webcam) and **Guest (phone)** streams Lane A over WebRTC. The projector output is **abstract** (grid + feedback) driven by motion and optional face **detection** stats — not a literal mirror by default.

## 휴대폰으로 접속하기 (한국어)

**iOS Safari는 `http://192.168.x.x` 같은 비 HTTPS 페이지에서 카메라 API를 막습니다.** 개발 서버는 `@vitejs/plugin-basic-ssl`로 **HTTPS**를 켜 두었습니다.

1. **맥에서 두 터미널**
   - 터미널 A: `pnpm dev:mirror-room-signal` (**8787** — Vite가 이 포트로 프록시함)
   - 터미널 B: `pnpm dev:mirror-room` (**5173**, HTTPS)

2. **`.env.local`의 `VITE_PUBLIC_ORIGIN`은 반드시 `https://<맥 IP>:5173`**

   ```bash
   ipconfig getifaddr en0
   ```

   예: `VITE_PUBLIC_ORIGIN=https://192.168.219.101:5173`  
   템플릿: [`.env.example`](./.env.example) → 변경 후 **Vite 재시작**.

3. **브라우저에서 자체 서명 인증서 신뢰 (최초 1회)**
   - **맥:** `https://localhost:5173` 또는 `https://<LAN IP>:5173` 열기 → “고급 / 방문”으로 진행.
   - **iPhone Safari:** 주소창에 `https://<맥과 동일한 LAN IP>:5173` 직접 입력해 연 뒤 인증서 경고를 허용(세부 정보 → 방문). **그 다음** QR로 게스트(`/g/...`)에 들어가야 카메라가 열리는 경우가 많습니다.

4. **맥** 호스트 UI: `https://localhost:5173` 권장 (또는 LAN `https://` 주소). QR·복사 URL은 `VITE_PUBLIC_ORIGIN` 기준 **https LAN** 링크.

5. **휴대폰**은 맥과 **같은 Wi‑Fi**
   - QR 스캔 또는 **Copy guest URL** → 게스트 페이지 → **Start streaming** → 카메라/마이크 권한 허용.

6. 문제 시: 맥 방화벽 **5173**·**8787**, VPN 끔, 공유기 AP 격리 확인.

## Prerequisites

- Node 20+ recommended (matches the rest of the monorepo).
- Two terminals on the host machine.

## Run (LAN / phone testing)

1. **Signal server** (binds `0.0.0.0:8787`):

   ```bash
   pnpm install   # once, copies MediaPipe wasm + downloads face_landmarker.task for this app
   pnpm dev:mirror-room-signal
   ```

2. **Vite** (HTTPS via `@vitejs/plugin-basic-ssl`, `--host` in script):

   ```bash
   pnpm dev:mirror-room
   ```

   Open `https://localhost:5173` (accept the dev certificate). WebSocket signaling uses **`wss://` on the same host** and is **proxied** to `mirror-room-signal` on port 8787 (avoids mixed-content blocking).

3. Set LAN QR / guest links for phones:

   ```bash
   # apps/mirror-room/.env.local
   VITE_PUBLIC_ORIGIN=https://192.168.0.42:5173
   ```

   Restart Vite. iOS needs **HTTPS** for `navigator.mediaDevices`; scan/open the guest URL only after trusting the cert on the phone (open the origin once in Safari).

4. Optional: override signaling (if not using the dev proxy):

   ```bash
   VITE_SIGNAL_URL=wss://192.168.0.42:8787
   ```

5. Optional TURN (production / strict NAT): set `VITE_ICE_SERVERS` to a JSON string array of `RTCIceServer` objects. Update guest privacy copy if traffic leaves the LAN.

## Scripts

| Command                           | Purpose              |
| --------------------------------- | -------------------- |
| `pnpm dev:mirror-room`            | Vite dev w/ `--host` |
| `pnpm dev:mirror-room-signal`     | WebRTC signaling     |
| `pnpm --filter mirror-room build` | Production build     |

## Defaults

- Guest video is capped (`src/config.ts`: `GUEST_VIDEO`).
- Compositor mode and strobe cap live in `src/config.ts` (`MODE`, `MAX_STROBE_HZ`).
- Face model path: `/mediapipe/face_landmarker.task` (synced by `scripts/sync-mediapipe-public.mjs`).

## Spec

See [`docs/ideation/mirror-room-build-prompt.md`](../../docs/ideation/mirror-room-build-prompt.md).
