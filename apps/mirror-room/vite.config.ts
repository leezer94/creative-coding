import path from 'node:path';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Must match `DEV_SIGNAL_WSS_PATH` in `src/webrtc/ice.ts`. */
const SIGNAL_PROXY_PATH = '/__mirror_room_signal';

export default defineConfig(({ command }) => {
  const signalOk = Boolean(process.env.VITE_SIGNAL_URL?.trim());
  const sfuOk =
    process.env.VITE_USE_SFU === 'true' &&
    Boolean(process.env.VITE_LIVEKIT_URL?.trim()) &&
    Boolean(process.env.VITE_LIVEKIT_TOKEN_URL?.trim());
  if (command === 'build' && !signalOk && !sfuOk) {
    throw new Error(
      'mirror-room production build requires VITE_SIGNAL_URL (legacy P2P), or VITE_USE_SFU=true with VITE_LIVEKIT_URL + VITE_LIVEKIT_TOKEN_URL. See docs/architecture/mirror-room-public-deploy.md and docs/architecture/mirror-room-livekit.md'
    );
  }

  return {
    plugins: [react(), basicSsl()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@mediapipe/tasks-vision': path.resolve(
          __dirname,
          'node_modules/@mediapipe/tasks-vision/vision_bundle.mjs'
        ),
      },
    },
    server: {
      host: true,
      proxy: {
        [SIGNAL_PROXY_PATH]: {
          target: 'http://127.0.0.1:8787',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
