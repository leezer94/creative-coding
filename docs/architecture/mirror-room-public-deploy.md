---
title: Mirror Room — 공개 배포 (정적 프론트 + 공개 WSS 시그널)
type: reference
status: active
---

# Mirror Room — 공개 배포 (정적 프론트 + 공개 `wss://` 시그널)

**목표:** 프론트엔드를 **공개 HTTPS URL**에 올리고, QR·링크로 **어디서든** 스마트폰이 접속해 WebRTC가 동작하게 합니다. 그러려면 **시그널 서버도 인터넷에서 `wss://`로 도달**해야 합니다. 로컬 `192.168.x.x:8787`만 켜 둔 채로 정적 사이트만 배포하면 **원격 LTE 사용자**는 시그널에 붙을 수 없습니다.

---

## 1. 구성 요약

| 구성 요소                                   | 역할                 | 배포/실행                             |
| ------------------------------------------- | -------------------- | ------------------------------------- |
| **정적 프론트** (`mirror-room` 빌드 산출물) | 호스트·게스트 UI, QR | Netlify / Vercel / S3+CloudFront 등   |
| **시그널** (`mirror-room-signal`)           | SDP/ICE 메시지 중계  | 공인 `wss://` (직접 TLS 또는 터널 뒤) |
| **미디어**                                  | SRTP P2P             | STUN + (필요 시) **TURN** — 별도 구성 |
| **환경 변수**                               | 빌드 시 주입         | 아래 `VITE_*` 참고                    |

런타임에서 브라우저는 `getSignalUrl()` (`apps/mirror-room/src/webrtc/ice.ts`)로 연결합니다.

- **프로덕션 빌드** (`pnpm --filter mirror-room build`): **`VITE_SIGNAL_URL` 필수** (공개 `wss://...`).
- **개발** (`pnpm dev:mirror-room`): 설정 없으면 Vite가 `wss://<dev-host>/__mirror_room_signal` → 로컬 `8787`로 프록시합니다.

---

## 2. 빌드 시 필수 환경 변수

프로젝트 루트 또는 `apps/mirror-room`에서 빌드할 때 CI/로컬에 설정합니다.

```bash
# 배포된 웹앱의 원점 (QR·게스트 링크에 사용). 끝 슬래시 없이.
VITE_PUBLIC_ORIGIN=https://mirror-room.yourdomain.com

# 공개 시그널 — 반드시 wss (HTTPS 페이지에서는 mixed content 방지)
VITE_SIGNAL_URL=wss://signal.yourdomain.com

# 선택: 엄격 NAT / 원격 네트워크
# VITE_ICE_SERVERS='[{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:...","username":"...","credential":"..."}]'
```

- `VITE_*`는 **빌드 타임**에 번들에 박힙니다. 값을 바꾸면 **재빌드**가 필요합니다.
- 시그널 URL만 바꿀 일이 잦다면 CI에서 환경별 빌드를 나누는 편이 안전합니다.

---

## 3. 시그널을 공개 `wss://`로 노출하는 방법

### 3.1 리버스 프록시 (권장 운영 형태)

- 서버(또는 PaaS)에서 `mirror-room-signal`을 `127.0.0.1:8787`에 바인딩한 뒤, **Nginx / Caddy / Traefik** 등 앞단에서:
  - `https://signal.yourdomain.com` → 백엔드 `http://127.0.0.1:8787`
  - **WebSocket 업그레이드** 헤더 전달 (`Upgrade`, `Connection`)

- Let’s Encrypt 등으로 **정상 인증서**를 쓰면 브라우저가 `wss://signal.yourdomain.com`으로 안정적으로 연결합니다.

#### Nginx (최소 예시)

`signal.yourdomain.com`이 TLS를 종료하고 WebSocket 업그레이드를 백엔드로 넘깁니다.

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl;
    server_name signal.yourdomain.com;
    # ssl_certificate / ssl_certificate_key ...

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Caddy (최소 예시)

```caddy
signal.yourdomain.com {
    reverse_proxy 127.0.0.1:8787
}
```

Caddy는 기본적으로 WebSocket 업그레이드를 처리합니다. 백엔드는 HTTP(`127.0.0.1:8787`)로 두고, 브라우저는 `wss://signal.yourdomain.com`으로 접속합니다.

### 3.2 터널 (빠른 시연·테스트)

로컬에서 `pnpm dev:mirror-room-signal`(또는 프로덕션 Node 실행)만 돌릴 때, 공인 URL을 임시로 받습니다.

- **[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)** (`cloudflared`): 무료 티어로 `wss` 가능.
- **[ngrok](https://ngrok.com/)**: `ngrok http 8787` 등 — 플랜에 따라 URL이 고정되지 않을 수 있음.

터널이 주는 **HTTPS 엔드포인트**를 WebSocket 클라이언트가 쓰는 URL로 맞춥니다 (보통 `wss://xxxx.trycloudflare.com` 형태). 그 URL을 **`VITE_SIGNAL_URL`**에 넣고 프론트를 다시 빌드합니다.

**주의:** 터널 프로세스가 꺼지면 URL이 무효화될 수 있어 전시 장기 운영에는 3.1이 낫습니다.

### 3.3 PaaS에 시그널만 배포

Railway / Fly.io / Render 등에서 `packages/mirror-room-signal`을 Node 프로세스로 실행하고, 플랫폼이 제공하는 **HTTPS 도메인**을 쓰는 패턴도 가능합니다. 이 경우도 앱 쪽 `VITE_SIGNAL_URL`은 해당 **`wss://`**와 일치해야 합니다.

---

## 4. 프론트 배포 체크리스트

1. `VITE_PUBLIC_ORIGIN`, `VITE_SIGNAL_URL`을 넣고 `pnpm --filter mirror-room build` (`VITE_SIGNAL_URL` 없으면 빌드가 즉시 실패합니다).
2. `dist/`를 정적 호스팅에 업로드.
3. 호스트 페이지에서 **Debug**로 시그널 URL이 기대한 `wss://`인지 확인.
4. **폰 LTE**에서 게스트 URL 열기 → 시그널 `ws-open` / `signal-open`까지 되는지 확인.
5. 영상이 안 붙으면 **TURN** 후보(`VITE_ICE_SERVERS`)를 검토.

---

## 5. 흔한 문제

| 증상                                  | 원인 후보                            |
| ------------------------------------- | ------------------------------------ |
| 프로덕션에서 Signal 빈칸 / 즉시 error | `VITE_SIGNAL_URL` 미설정 후 빌드     |
| Mixed content                         | HTTPS 페이지가 `ws://` 시그널을 호출 |
| 연결은 되는데 영상만 실패             | TURN 없음, 방화벽, 대칭 NAT          |

---

## 6. 관련 코드·문서

- 시그널 URL 결정: `apps/mirror-room/src/webrtc/ice.ts`
- 시그널 서버: `packages/mirror-room-signal/src/server.mjs` · 컨테이너: `packages/mirror-room-signal/Dockerfile`
- 정적 호스팅 예시: `apps/mirror-room/netlify.toml`, `apps/mirror-room/vercel.json`
- 앱 실행·LAN 개발: `apps/mirror-room/README.md`
- 다자·SFU로 바꿀 때: `docs/architecture/mirror-room-sfu-migration.md`
