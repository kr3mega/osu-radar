import { execFileSync } from 'child_process';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const tscCli = path.join(rootDir, 'node_modules', 'typescript', 'bin', 'tsc');

execFileSync(process.execPath, [tscCli, '-p', path.join(rootDir, 'tsconfig.electron.json')], {
  cwd: rootDir,
  stdio: 'inherit',
});

const outDir = path.join(rootDir, 'dist-electron');
const electronOutDir = path.join(outDir, 'electron');
fs.mkdirSync(electronOutDir, { recursive: true });

// Mark dist-electron as CommonJS so Electron loads compiled main.js cleanly inside an ESM repo
fs.writeFileSync(
  path.join(outDir, 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 2),
  'utf8'
);

// Copy CommonJS preload bridge alongside main.js
fs.copyFileSync(
  path.join(rootDir, 'electron', 'preload.cjs'),
  path.join(electronOutDir, 'preload.cjs')
);

console.log('[electron] Main e Preload compilados em dist-electron/');

// Notifica cliente Electron ativo para recarregar a interface automaticamente
async function notifyRunningElectron() {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 45721,
        path: '/api/dev/reload',
        method: 'GET',
        timeout: 800,
      },
      (res) => {
        if (res.statusCode === 200) {
          console.log('[electron] Notificação enviada: Cliente osu!radar recarregado com sucesso!');
        }
        resolve();
      }
    );
    req.on('error', () => {
      resolve();
    });
    req.on('timeout', () => {
      req.destroy();
      resolve();
    });
    req.end();
  });
}

await notifyRunningElectron();

