/**
 * Copies MediaPipe Vision WASM bundles from node_modules into public/mediapipe
 * and downloads the hand landmarker .task file once (offline-friendly after install).
 * Run automatically on pnpm install via package.json "postinstall".
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const destDir = path.join(root, 'public', 'mediapipe');
const destWasmDir = path.join(destDir, 'wasm');

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const WASM_FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_module_internal.js',
  'vision_wasm_module_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
];

function copyWasmFromPackage() {
  const symlink = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision');
  if (!fs.existsSync(symlink)) {
    throw new Error(`@mediapipe/tasks-vision not found at ${symlink}. Run pnpm install.`);
  }
  const pkgDir = fs.realpathSync(symlink);
  const srcWasm = path.join(pkgDir, 'wasm');
  if (!fs.existsSync(srcWasm)) {
    throw new Error(`Missing wasm directory: ${srcWasm}`);
  }
  fs.mkdirSync(destWasmDir, { recursive: true });
  for (const name of WASM_FILES) {
    const from = path.join(srcWasm, name);
    const to = path.join(destWasmDir, name);
    if (!fs.existsSync(from)) {
      throw new Error(`Missing MediaPipe file: ${from}`);
    }
    fs.copyFileSync(from, to);
    process.stdout.write(`Copied wasm/${name}\n`);
  }
}

function downloadIfNeeded(url, destPath) {
  if (fs.existsSync(destPath)) {
    const st = fs.statSync(destPath);
    if (st.size > 1_000_000) {
      process.stdout.write(`Model already present: ${destPath}\n`);
      return Promise.resolve();
    }
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location;
          file.close();
          fs.unlinkSync(destPath);
          if (!loc) {
            reject(new Error('Redirect without location'));
            return;
          }
          downloadIfNeeded(loc, destPath).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destPath);
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve());
        });
      })
      .on('error', (err) => {
        file.close();
        try {
          fs.unlinkSync(destPath);
        } catch {
          /* empty */
        }
        reject(err);
      });
  });
}

try {
  copyWasmFromPackage();
} catch (e) {
  console.error(e);
  process.exit(1);
}

try {
  const modelPath = path.join(destDir, 'hand_landmarker.task');
  await downloadIfNeeded(MODEL_URL, modelPath);
  process.stdout.write('MediaPipe public assets ready.\n');
} catch (e) {
  console.warn(
    'Could not download hand_landmarker.task (network may be restricted).',
    e instanceof Error ? e.message : e,
  );
  console.warn('Copy hand_landmarker.task into public/mediapipe/ manually, then restart the dev server.');
  process.exit(0);
}
