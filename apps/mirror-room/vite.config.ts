import path from 'node:path';
import { fileURLToPath } from 'node:url';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Must match `DEV_SIGNAL_WSS_PATH` in `src/webrtc/ice.ts`. */
const SIGNAL_PROXY_PATH = '/__mirror_room_signal';

export default defineConfig(({ command, mode }) => {
  // Same env files as the app: .env, .env.local, .env.[mode], etc. (not only shell `process.env`).
  const env = loadEnv(mode, __dirname, '');
  const signalOk = Boolean(env.VITE_SIGNAL_URL?.trim());
  const sfuOk =
    env.VITE_USE_SFU === 'true' &&
    Boolean(env.VITE_LIVEKIT_URL?.trim()) &&
    Boolean(env.VITE_LIVEKIT_TOKEN_URL?.trim());
  if (command === 'build' && !signalOk && !sfuOk) {
    throw new Error(
      'mirror-room production build requires VITE_SIGNAL_URL (legacy P2P), or VITE_USE_SFU=true with VITE_LIVEKIT_URL + VITE_LIVEKIT_TOKEN_URL. See docs/architecture/mirror-room-public-deploy.md and docs/architecture/mirror-room-livekit.md'
    );
  }

  return {
    plugins: [react(), basicSsl()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react/')
            ) {
              return 'react-vendor';
            }
            if (id.includes('node_modules/livekit-client')) {
              return 'livekit-client';
            }
            if (id.includes('node_modules/@mediapipe/tasks-vision')) {
              return 'mediapipe-tasks-vision';
            }
            if (id.includes('node_modules/react-router')) {
              return 'react-router';
            }
          },
        },
      },
    },
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
