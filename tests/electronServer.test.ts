import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  RunningLocalAppServer,
  startLocalAppServer,
} from '../electron/localAppServer';

describe('Servidor Local Embutido do Electron (Standalone sem Navegador/Vite)', () => {
  let running: RunningLocalAppServer | null = null;
  let tmpDist: string | null = null;

  afterEach(async () => {
    if (running) {
      await running.close();
      running = null;
    }
    if (tmpDist) {
      await fs.promises.rm(tmpDist, { recursive: true, force: true });
      tmpDist = null;
    }
  });

  it('serve dist/, WASM, Range requests de áudio e pontes nativas /api/local-songs e /api/local-skins em 127.0.0.1', async () => {
    tmpDist = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'osu-radar-electron-dist-'));
    await fs.promises.mkdir(path.join(tmpDist, 'assets'), { recursive: true });
    await fs.promises.writeFile(
      path.join(tmpDist, 'index.html'),
      '<!doctype html><html><body><div id="root">osu!radar</div></body></html>',
      'utf8'
    );
    await fs.promises.writeFile(
      path.join(tmpDist, 'assets', 'engine.wasm'),
      Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
    );
    await fs.promises.writeFile(
      path.join(tmpDist, 'assets', 'sample.ogg'),
      Buffer.from('OggS0123456789ABCDEF', 'utf8')
    );

    running = await startLocalAppServer({ distDir: tmpDist, preferredPort: 0 });
    expect(running.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

    // 1. Root index.html
    const htmlRes = await fetch(`${running.url}/`);
    expect(htmlRes.status).toBe(200);
    expect(await htmlRes.text()).toContain('osu!radar');

    // 2. WebAssembly MIME type (required by rosu-pp-js WebAssembly.instantiateStreaming)
    const wasmRes = await fetch(`${running.url}/assets/engine.wasm`);
    expect(wasmRes.status).toBe(200);
    expect(wasmRes.headers.get('content-type')).toBe('application/wasm');

    // 3. HTTP Range request for audio seeking (206 Partial Content)
    const rangeRes = await fetch(`${running.url}/assets/sample.ogg`, {
      headers: { Range: 'bytes=0-3' },
    });
    expect(rangeRes.status).toBe(206);
    expect(await rangeRes.text()).toBe('OggS');

    // 4. Native osu! Songs & Skins API bridges available without Vite
    const songsRes = await fetch(`${running.url}/api/local-songs/detect`);
    expect(songsRes.status).toBe(200);
    const songsJson = await songsRes.json();
    expect(songsJson.available).toBe(true);

    const skinsRes = await fetch(`${running.url}/api/local-skins/detect`);
    expect(skinsRes.status).toBe(200);
    const skinsJson = await skinsRes.json();
    expect(skinsJson.available).toBe(true);
  });

  it('permite recarregamento dinâmico da interface via endpoint /api/dev/reload disparando callback', async () => {
    tmpDist = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'osu-radar-reload-test-'));
    let reloadTriggered = false;

    running = await startLocalAppServer({
      distDir: tmpDist,
      preferredPort: 0,
      onReloadRequested: () => {
        reloadTriggered = true;
      },
    });

    const res = await fetch(`${running.url}/api/dev/reload`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reloaded).toBe(true);
    expect(reloadTriggered).toBe(true);
  });
});
