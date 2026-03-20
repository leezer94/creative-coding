function isLoopbackHost(): boolean {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

/**
 * Page origin for shareable links (QR, copy URL). On localhost, uses `VITE_PUBLIC_ORIGIN` when set.
 */
export function getPublicOrigin(): string {
  const configured = import.meta.env.VITE_PUBLIC_ORIGIN?.trim().replace(/\/$/, '');
  if (isLoopbackHost() && configured) {
    return configured;
  }
  return window.location.origin;
}

/**
 * Dev HTTPS + this path → Vite proxies to `mirror-room-signal` on :8787 (avoids mixed-content blocking).
 * Keep in sync with `SIGNAL_PROXY_PATH` in `vite.config.ts`.
 */
export const DEV_SIGNAL_WSS_PATH = '/__mirror_room_signal';

export function getSignalUrl(): string {
  const explicit = import.meta.env.VITE_SIGNAL_URL?.trim();
  if (explicit) {
    return explicit;
  }
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return `wss://${window.location.host}${DEV_SIGNAL_WSS_PATH}`;
  }
  try {
    const u = new URL(getPublicOrigin());
    return `ws://${u.hostname}:8787`;
  } catch {
    return `ws://${window.location.hostname}:8787`;
  }
}

export function getIceServers(): RTCIceServer[] {
  const raw = import.meta.env.VITE_ICE_SERVERS;
  if (!raw) {
    return [{ urls: 'stun:stun.l.google.com:19302' }];
  }
  try {
    return JSON.parse(raw) as RTCIceServer[];
  } catch {
    return [{ urls: 'stun:stun.l.google.com:19302' }];
  }
}
