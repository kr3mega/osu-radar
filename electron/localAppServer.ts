import fs from 'fs';
import http from 'http';
import path from 'path';
import type { AddressInfo } from 'net';
import type { DesktopLogger } from './logger';
import { createLocalSongsMiddleware } from '../src/server/localSongsPlugin';
import { createLocalSkinsMiddleware } from '../src/server/localSkinsPlugin';

export const DEFAULT_DESKTOP_PORT = 45721;

const STATIC_MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.osu': 'text/plain; charset=utf-8',
  '.ini': 'text/plain; charset=utf-8',
};

function isInsideRoot(targetPath: string, rootDir: string): boolean {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(targetPath);
  const isWin = process.platform === 'win32';
  const normRoot = isWin ? resolvedRoot.toLowerCase() : resolvedRoot;
  const normTarget = isWin ? resolvedTarget.toLowerCase() : resolvedTarget;
  if (normTarget === normRoot) return true;
  const prefix = normRoot.endsWith(path.sep) ? normRoot : normRoot + path.sep;
  return normTarget.startsWith(prefix);
}

function streamStaticFile(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  filePath: string,
  stat: fs.Stats
) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = STATIC_MIME_TYPES[ext] || 'application/octet-stream';
  const totalSize = stat.size;
  const rangeHeader = req.headers.range;

  res.setHeader('Content-Type', mime);
  res.setHeader('Accept-Ranges', 'bytes');
  if (ext === '.html') {
    res.setHeader('Cache-Control', 'no-cache');
  } else {
    res.setHeader('Cache-Control', 'private, max-age=3600');
  }

  (res as any).__meta = {
    mime,
    range: rangeHeader,
    bytes: totalSize,
  };

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (match) {
      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? Math.min(totalSize - 1, parseInt(match[2], 10)) : totalSize - 1;
      if (start >= totalSize || start > end) {
        res.statusCode = 416;
        res.setHeader('Content-Range', `bytes */${totalSize}`);
        res.end();
        return;
      }
      res.statusCode = 206;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
      res.setHeader('Content-Length', String(end - start + 1));
      (res as any).__meta.range = `${start}-${end}/${totalSize}`;
      (res as any).__meta.bytes = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });
      stream.on('error', () => res.end());
      stream.pipe(res);
      return;
    }
  }

  res.statusCode = 200;
  res.setHeader('Content-Length', String(totalSize));
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => res.end());
  stream.pipe(res);
}

export interface RunningLocalAppServer {
  url: string;
  port: number;
  server: http.Server;
  close: () => Promise<void>;
}

/**
 * Starts an embedded loopback-only (`127.0.0.1`) HTTP server inside Electron's Main process.
 * Serves:
 * - `/api/local-songs/*` (native osu! Songs folder scanner, batch reader & audio/bg streamer)
 * - `/api/local-skins/*` (native osu! Skins folder scanner, manifest & sprite/hitsound streamer)
 * - Static production assets from `dist/` (including WASM, fonts, default skin, SPA fallback)
 *
 * Uses a deterministic loopback port (`45721`) by default so Chromium's IndexedDB/localStorage
 * origin stays permanent across sessions without needing any external browser or Vite server.
 */
export async function startLocalAppServer(options: {
  distDir: string;
  preferredPort?: number;
  logger?: DesktopLogger;
}): Promise<RunningLocalAppServer> {
  const resolvedDist = path.resolve(options.distDir);
  const songsMiddleware = createLocalSongsMiddleware();
  const skinsMiddleware = createLocalSkinsMiddleware();

  const server = http.createServer((req, res) => {
    const startMs = Date.now();
    const reqMethod = req.method || 'GET';
    const reqUrl = req.url || '/';

    let logged = false;
    const logRequestCompletion = () => {
      if (logged) return;
      logged = true;
      if (options.logger) {
        const duration = Date.now() - startMs;
        const meta = (res as any).__meta;
        const clientIp = req.socket.remoteAddress;
        options.logger.http(reqMethod, reqUrl, res.statusCode, duration, {
          mime: meta?.mime || (res.getHeader('content-type') as string | undefined),
          range: meta?.range,
          bytes: meta?.bytes,
          clientIp,
        });
      }
    };

    res.once('finish', logRequestCompletion);
    res.once('close', () => {
      if (!res.writableEnded) {
        logRequestCompletion();
      }
    });

    songsMiddleware(req, res, () => {
      skinsMiddleware(req, res, async () => {
        try {
          const parsed = new URL(req.url || '/', 'http://127.0.0.1');
          let relPathname = '/';
          try {
            relPathname = decodeURIComponent(parsed.pathname);
          } catch {
            relPathname = parsed.pathname;
          }

          const relativeCandidate = relPathname.replace(/^\/+/, '') || 'index.html';
          const candidatePath = path.resolve(resolvedDist, relativeCandidate);

          if (!isInsideRoot(candidatePath, resolvedDist)) {
            res.statusCode = 403;
            res.end('Forbidden');
            return;
          }

          try {
            const st = await fs.promises.stat(candidatePath);
            if (st.isFile()) {
              streamStaticFile(req, res, candidatePath, st);
              return;
            }
          } catch {
            // File not found — check if SPA route fallback applies
          }

          // SPA fallback for routes without file extensions
          if (!path.extname(relativeCandidate)) {
            const indexHtml = path.join(resolvedDist, 'index.html');
            const indexStat = await fs.promises.stat(indexHtml);
            streamStaticFile(req, res, indexHtml, indexStat);
            return;
          }

          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('Not found');
        } catch (err) {
          options.logger?.error('Server', `Erro ao processar requisição ${reqMethod} ${reqUrl}:`, err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(err instanceof Error ? err.message : 'Internal server error');
        }
      });
    });
  });

  const preferred = options.preferredPort ?? DEFAULT_DESKTOP_PORT;

  const listenOnPort = (portToTry: number): Promise<number> =>
    new Promise((resolve, reject) => {
      const onError = (err: NodeJS.ErrnoException) => {
        server.removeListener('listening', onListening);
        reject(err);
      };
      const onListening = () => {
        server.removeListener('error', onError);
        const addr = server.address() as AddressInfo;
        resolve(addr.port);
      };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(portToTry, '127.0.0.1');
    });

  let boundPort: number;
  try {
    boundPort = await listenOnPort(preferred);
  } catch (err: any) {
    if (err && err.code === 'EADDRINUSE' && preferred !== 0) {
      options.logger?.warn('Server', `Porta padrão ${preferred} ocupada. Alocando porta dinâmica livre...`);
      boundPort = await listenOnPort(0);
    } else {
      options.logger?.error('Server', `Falha ao iniciar servidor HTTP na porta ${preferred}:`, err);
      throw err;
    }
  }

  options.logger?.info('Server', `Servidor local loopback ativo em http://127.0.0.1:${boundPort}`);

  return {
    url: `http://127.0.0.1:${boundPort}`,
    port: boundPort,
    server,
    close: () =>
      new Promise<void>((resolve) => {
        options.logger?.info('Server', 'Encerrando servidor local loopback...');
        server.close(() => {
          options.logger?.info('Server', 'Servidor local encerrado com sucesso.');
          resolve();
        });
      }),
  };
}
