function isLoopbackHost(): boolean {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

/**
 * Page origin for shareable links (QR, copy URL).
 * Uses `VITE_PUBLIC_ORIGIN` when set on localhost (LAN HTTPS for phones) or in production
 * (canonical URL for QR when set at build time).
 */
export function getPublicOrigin(): string {
  const configured = import.meta.env.VITE_PUBLIC_ORIGIN?.trim().replace(/\/$/, '');
  if (configured && (isLoopbackHost() || import.meta.env.PROD)) {
    return configured;
  }
  return window.location.origin;
}

/**
 * Dev HTTPS + this path → Vite proxies to `mirror-room-signal` on :8787 (avoids mixed-content blocking).
 * Keep in sync with `SIGNAL_PROXY_PATH` in `vite.config.ts`.
 */
export const DEV_SIGNAL_WSS_PATH = '/__mirror_room_signal';

/**
 * Dev HTTPS + `wss://<same-host>:8787` is a common mistake: `mirror-room-signal` listens for **plain ws** on 8787,
 * not TLS. The browser should use the **Vite WSS proxy** on the app origin (`/__mirror_room_signal` → 127.0.0.1:8787).
 */
function shouldUseViteDevSignalProxy(
  pageHostname: string,
  explicit: string | undefined
): boolean {
  if (!explicit?.trim()) {
    return true;
  }
  try {
    const u = new URL(explicit.trim());
    if (u.port !== '8787') {
      return false;
    }
    return u.hostname === pageHostname;
  } catch {
    return false;
  }
}

/**
 * WebSocket URL for `mirror-room-signal`.
 *
 * - **Production (`vite build`):** must set `VITE_SIGNAL_URL` (e.g. `wss://signal.example.com`).
 *   Static hosts (Netlify, Vercel, etc.) do not run the Vite dev proxy — same-origin `/__mirror_room_signal` is not available.
 * - **Development:** HTTPS → same-origin Vite WSS proxy (`/__mirror_room_signal`). If `.env` has
 *   `VITE_SIGNAL_URL=wss://<same-host-as-page>:8787`, that value is **ignored** in dev: signal on 8787 is
 *   usually plain `ws`, not `wss`. HTTP → `ws://<public-origin-host>:8787` when `VITE_SIGNAL_URL` unset.
 */
export function getSignalUrl(): string {
  const explicit = import.meta.env.VITE_SIGNAL_URL?.trim();

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    if (window.location.protocol === 'https:') {
      const host = window.location.hostname;
      if (shouldUseViteDevSignalProxy(host, explicit)) {
        return `wss://${window.location.host}${DEV_SIGNAL_WSS_PATH}`;
      }
    } else if (!explicit) {
      try {
        const u = new URL(getPublicOrigin());
        return `ws://${u.hostname}:8787`;
      } catch {
        return `ws://${window.location.hostname}:8787`;
      }
    }
  }

  if (explicit) {
    return explicit;
  }

  return '';
}

/** True when a production bundle was built without `VITE_SIGNAL_URL` (WebRTC signaling cannot work). */
export function isProductionSignalMissing(): boolean {
  return import.meta.env.PROD && getSignalUrl() === '';
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
