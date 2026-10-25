import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// 1. Compile Electron Main + Preload
await import('./build-electron.mjs');

// 2. Start Vite Dev Server via Node API
const viteServer = await createServer({
  root: rootDir,
  server: {
    strictPort: false,
  },
});

await viteServer.listen();
const devUrl =
  viteServer.resolvedUrls?.local?.[0] ||
  `http://localhost:${viteServer.config.server.port || 3000}/`;

console.log(`[electron:dev] Vite HMR ativo em ${devUrl}`);

// 3. Resolve Electron binary & launch window pointing to Vite HMR
const electronModule = await import('electron');
const electronExe = electronModule.default;

const child = spawn(String(electronExe), [rootDir], {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_DEV_SERVER_URL: devUrl,
  },
});

child.on('exit', async (code) => {
  await viteServer.close();
  process.exit(code ?? 0);
});
