---
title: Mirror Room — LiveKit SFU (Golden Path)
type: architecture
status: active
---

# Mirror Room — LiveKit SFU

레거시 1:1 WebSocket 시그널 대신 **LiveKit**을 쓰려면 빌드 시 다음을 설정한다.

## 클라이언트 (`VITE_*`)

| 변수                     | 설명                                                                      |
| ------------------------ | ------------------------------------------------------------------------- |
| `VITE_USE_SFU`           | `true` 이면 LiveKit 경로 사용                                             |
| `VITE_LIVEKIT_URL`       | 예: `wss://&lt;project&gt;.livekit.cloud`                                 |
| `VITE_LIVEKIT_TOKEN_URL` | **POST** `{ "room": string, "identity": string }` → `{ "token": string }` |

API 키·시크릿은 **프런트에 넣지 않고**, 토큰만 짧은 수명으로 발급한다.

## 토큰 발급 (Netlify Functions 예)

[`apps/mirror-room/netlify/functions/livekit-token.mjs`](../../apps/mirror-room/netlify/functions/livekit-token.mjs)는 서버 환경 변수 `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`으로 JWT를 만든다.

배포 후 `VITE_LIVEKIT_TOKEN_URL`을 `https://&lt;site&gt;/.netlify/functions/livekit-token` 같은 **공개 HTTPS URL**로 둔다.

## 셀프호스트

LiveKit OSS를 띄운 경우 `VITE_LIVEKIT_URL`만 해당 `wss://`로 바꾸고, 토큰 발급 로직은 동일하다.

## 변경 이력

| 날짜   | 내용                                         |
| ------ | -------------------------------------------- |
| (초안) | Golden Path·환경 변수·토큰 엔드포인트 문서화 |
