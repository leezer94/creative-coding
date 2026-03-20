/**
 * Copies MediaPipe Vision WASM bundles from node_modules into each app's public/mediapipe
 * and downloads the .task model(s) needed per app (offline-friendly after install).
 * Run automatically on pnpm install via package.json "postinstall".
 *
 * Usage: node scripts/sync-mediapipe-public.mjs [--app-dir <path>] ...
 * Default: --app-dir apps/viscous-memory
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/** @type {Record<string, Array<{ url: string; file: string }>>} */
const APP_TASKS = {
  'apps/viscous-memory': [{ url: HAND_MODEL_URL, file: 'hand_landmarker.task' }],
  'apps/mirror-room': [{ url: FACE_MODEL_URL, file: 'face_landmarker.task' }],
};

const DEFAULT_TASKS = [{ url: HAND_MODEL_URL, file: 'hand_landmarker.task' }];

const WASM_FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_module_internal.js',
  'vision_wasm_module_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
];

function parseAppDirs(argv) {
  const dirs = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--app-dir' && argv[i + 1]) {
      dirs.push(argv[i + 1]);
      i++;
    }
  }
  if (dirs.length === 0) {
    dirs.push('apps/viscous-memory');
  }
  return dirs;
}

function resolveMediapipePackageDir() {
  const candidates = [path.join(repoRoot, 'node_modules', '@mediapipe', 'tasks-vision')];
  const appsDir = path.join(repoRoot, 'apps');
  if (fs.existsSync(appsDir)) {
    for (const name of fs.readdirSync(appsDir, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      candidates.push(
        path.join(appsDir, name.name, 'node_modules', '@mediapipe', 'tasks-vision'),
      );
    }
  }
  const packagesDir = path.join(repoRoot, 'packages');
  if (fs.existsSync(packagesDir)) {
    for (const name of fs.readdirSync(packagesDir, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      candidates.push(
        path.join(packagesDir, name.name, 'node_modules', '@mediapipe', 'tasks-vision'),
      );
    }
  }
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return fs.realpathSync(p);
    }
  }
  throw new Error(
    `@mediapipe/tasks-vision not found. Tried:\n${candidates.join('\n')}\nRun pnpm install.`,
  );
}

function copyWasmToApp(destWasmDir, pkgDir) {
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
    process.stdout.write(`Copied wasm/${name} → ${path.relative(repoRoot, to)}\n`);
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

function tasksForApp(relApp) {
  return APP_TASKS[relApp] ?? DEFAULT_TASKS;
}

const appDirs = parseAppDirs(process.argv.slice(2));
let pkgDir;
try {
  pkgDir = resolveMediapipePackageDir();
} catch (e) {
  console.error(e);
  process.exit(1);
}

for (const relApp of appDirs) {
  const destDir = path.join(repoRoot, relApp, 'public', 'mediapipe');
  const destWasmDir = path.join(destDir, 'wasm');
  try {
    copyWasmToApp(destWasmDir, pkgDir);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

  const tasks = tasksForApp(relApp);
  for (const task of tasks) {
    const modelPath = path.join(destDir, task.file);
    try {
      await downloadIfNeeded(task.url, modelPath);
    } catch (e) {
      console.warn(
        `Could not download ${task.file} (network may be restricted).`,
        e instanceof Error ? e.message : e,
      );
      console.warn(`Copy ${task.file} into ${relApp}/public/mediapipe/ manually, then restart the dev server.`);
    }
  }
  process.stdout.write(`MediaPipe public assets ready for ${relApp}.\n`);
}
