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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
