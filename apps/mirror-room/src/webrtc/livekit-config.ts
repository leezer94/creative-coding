/**
 * LiveKit SFU path (optional). When `VITE_USE_SFU` is true, host/guest use
 * `use-livekit-room` instead of legacy WebSocket signaling.
 */
export function getUseSfu(): boolean {
  return import.meta.env.VITE_USE_SFU === 'true';
}

/** LiveKit server URL (e.g. `wss://your-project.livekit.cloud`). */
export function getLiveKitUrl(): string {
  return import.meta.env.VITE_LIVEKIT_URL?.trim() ?? '';
}

/** POST endpoint returning `{ token: string }` — must not embed API secrets in the client. */
export function getLiveKitTokenUrl(): string {
  return import.meta.env.VITE_LIVEKIT_TOKEN_URL?.trim() ?? '';
}

export function isLiveKitConfigured(): boolean {
  return Boolean(getLiveKitUrl() && getLiveKitTokenUrl());
}

export function isProductionLiveKitMissing(): boolean {
  return import.meta.env.PROD && getUseSfu() && !isLiveKitConfigured();
}
