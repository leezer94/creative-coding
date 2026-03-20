/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SIGNAL_URL: string | undefined;
  /**
   * When you open the host UI via http://localhost:5173, QR / guest links still need a LAN URL.
   * Set to e.g. http://192.168.0.42:5173 (no trailing slash). Signal host defaults to the same IP.
   */
  readonly VITE_PUBLIC_ORIGIN: string | undefined;
  /** JSON array: RTCIceServer[] */
  readonly VITE_ICE_SERVERS: string | undefined;
  /** When `true`, use LiveKit instead of legacy WebSocket signaling. */
  readonly VITE_USE_SFU: string | undefined;
  readonly VITE_LIVEKIT_URL: string | undefined;
  /** HTTPS POST that returns `{ token: string }` — must not embed API secrets in the client. */
  readonly VITE_LIVEKIT_TOKEN_URL: string | undefined;
  /** When `true`, request microphone alongside video (Phase 3). */
  readonly VITE_STAGE_AUDIO: string | undefined;
  /** Lower motion sample size + face detect rate for weak devices. */
  readonly VITE_LOW_POWER_ANALYSIS: string | undefined;
  /** Override motion grid edge length (32–256). */
  readonly VITE_ANALYSIS_MOTION_SAMPLE_SIZE: string | undefined;
  /** Override face landmarker approximate Hz per lane (1–30). */
  readonly VITE_ANALYSIS_FACE_DETECT_HZ: string | undefined;
  /** Skip MediaPipe face landmarker; motion-only compositor. */
  readonly VITE_SKIP_FACE_LANDMARKER: string | undefined;
  /** Guest stage: when `true`, use adaptive stream (smaller tiles); default off for reliable full-stage video. */
  readonly VITE_LIVEKIT_GUEST_ADAPTIVE_STREAM: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
