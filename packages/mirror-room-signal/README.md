# mirror-room-signal

Minimal WebSocket relay for **1 host + 1 guest** per `sessionId` (`offer` / `answer` / ICE). Listens on **`0.0.0.0`** (default port **8787**, override with `MIRROR_ROOM_SIGNAL_PORT`).

## Local dev

From monorepo root:

```bash
pnpm dev:mirror-room-signal
```

With `pnpm dev:mirror-room`, the Vite dev server proxies `wss://…/__mirror_room_signal` to this process.

## Docker

From the **monorepo root**:

```bash
docker build -f packages/mirror-room-signal/Dockerfile -t mirror-room-signal .
docker run --rm -p 8787:8787 -e MIRROR_ROOM_SIGNAL_PORT=8787 mirror-room-signal
```

On PaaS that inject `PORT`, set **`MIRROR_ROOM_SIGNAL_PORT`** to that value (or the platform’s HTTP listen port) so the process binds where the reverse proxy expects.

## Public `wss://` (production / QR from anywhere)

The browser **must** reach this server over **`wss://`** when the static app is served over HTTPS (mixed content). Options:

- Terminate TLS in Nginx/Caddy and upgrade WebSockets to `http://127.0.0.1:8787`
- Run behind **Cloudflare Tunnel** or **ngrok**
- Deploy the same Node entry on a PaaS with HTTPS

Clients built for production must set **`VITE_SIGNAL_URL`** to that public URL (see `docs/architecture/mirror-room-public-deploy.md`).
