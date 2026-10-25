import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Plugin } from 'vite';

export interface ScannedOsuEntry {
  osuPath: string;
  folderPath: string;
  folderName: string;
  fileName: string;
  mtimeMs: number;
  size: number;
}

export interface LocalBatchReadItem {
  osuPath: string;
  text: string;
  localAudioPath?: string;
  localBgPath?: string;
}

const ALLOWED_STREAM_EXTENSIONS = new Set([
  '.osu',
  '.mp3',
  '.ogg',
  '.wav',
  '.flac',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.bmp',
]);

const MIME_TYPES: Record<string, string> = {
  '.osu': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
};

/**
 * Checks whether targetPath resides strictly inside one of the authorized Songs root directories.
 */
export function isPathInsideAuthorizedRoots(
  targetPath: string,
  authorizedRoots: Set<string>
): boolean {
  if (!targetPath || authorizedRoots.size === 0) return false;
  const resolvedTarget = path.resolve(targetPath);
  const isWin = process.platform === 'win32';
  const normTarget = isWin ? resolvedTarget.toLowerCase() : resolvedTarget;

  for (const root of authorizedRoots) {
    const resolvedRoot = path.resolve(root);
    const normRoot = isWin ? resolvedRoot.toLowerCase() : resolvedRoot;
    const prefix = normRoot.endsWith(path.sep) ? normRoot : normRoot + path.sep;
    if (normTarget.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

/**
 * Auto-detects the default osu!stable Songs folder on Windows / Linux / macOS.
 */
export async function detectDefaultOsuSongsDir(): Promise<{
  detectedPath: string;
  exists: boolean;
  folderCount: number;
}> {
  const candidates: string[] = [];

  if (process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, 'osu!', 'Songs'));
  }
  if (process.env.USERPROFILE) {
    candidates.push(path.join(process.env.USERPROFILE, 'AppData', 'Local', 'osu!', 'Songs'));
  }
  candidates.push(
    'C:\\osu!\\Songs',
    'D:\\osu!\\Songs',
    'E:\\osu!\\Songs'
  );
  if (process.env.PROGRAMFILES) {
    candidates.push(path.join(process.env.PROGRAMFILES, 'osu!', 'Songs'));
  }
  if (process.env['PROGRAMFILES(X86)']) {
    candidates.push(path.join(process.env['PROGRAMFILES(X86)'], 'osu!', 'Songs'));
  }
  if (process.env.HOME) {
    candidates.push(path.join(process.env.HOME, '.local', 'share', 'osu-wine', 'osu!', 'Songs'));
  }

  const defaultFallback =
    candidates[0] || 'C:\\Users\\Usuário\\AppData\\Local\\osu!\\Songs';

  for (const candidate of candidates) {
    try {
      const stat = await fs.promises.stat(candidate);
      if (stat.isDirectory()) {
        const dirents = await fs.promises.readdir(candidate, { withFileTypes: true });
        const folderCount = dirents.filter((d) => d.isDirectory()).length;
        return {
          detectedPath: path.resolve(candidate),
          exists: true,
          folderCount,
        };
      }
    } catch {
      // Try next candidate
    }
  }

  return {
    detectedPath: defaultFallback,
    exists: false,
    folderCount: 0,
  };
}

/**
 * Scans an osu!stable Songs directory (1 level of beatmapset subfolders + root .osu files)
 * with bounded concurrency for fast indexing of 10,000–30,000+ beatmaps.
 */
export async function scanOsuSongsDirectory(songsDir: string): Promise<{
  songsDir: string;
  folderCount: number;
  entries: ScannedOsuEntry[];
}> {
  const resolvedRoot = path.resolve(songsDir);
  const rootStat = await fs.promises.stat(resolvedRoot);
  if (!rootStat.isDirectory()) {
    throw new Error(`O caminho informado não é uma pasta válida: ${resolvedRoot}`);
  }

  const dirents = await fs.promises.readdir(resolvedRoot, { withFileTypes: true });
  const subdirs = dirents.filter((d) => d.isDirectory() && !d.name.startsWith('.'));
  const looseOsuFiles = dirents.filter(
    (d) => d.isFile() && d.name.toLowerCase().endsWith('.osu')
  );

  const entries: ScannedOsuEntry[] = [];

  for (const file of looseOsuFiles) {
    try {
      const osuPath = path.join(resolvedRoot, file.name);
      const st = await fs.promises.stat(osuPath);
      entries.push({
        osuPath,
        folderPath: resolvedRoot,
        folderName: path.basename(resolvedRoot),
        fileName: file.name,
        mtimeMs: Math.round(st.mtimeMs),
        size: st.size,
      });
    } catch {
      // Ignore unreadable file
    }
  }

  const CONCURRENCY = 32;
  let cursor = 0;

  async function worker() {
    while (cursor < subdirs.length) {
      const idx = cursor++;
      const dir = subdirs[idx];
      const folderPath = path.join(resolvedRoot, dir.name);
      try {
        const childDirents = await fs.promises.readdir(folderPath, { withFileTypes: true });
        for (const child of childDirents) {
          if (child.isFile() && child.name.toLowerCase().endsWith('.osu')) {
            const osuPath = path.join(folderPath, child.name);
            try {
              const st = await fs.promises.stat(osuPath);
              entries.push({
                osuPath,
                folderPath,
                folderName: dir.name,
                fileName: child.name,
                mtimeMs: Math.round(st.mtimeMs),
                size: st.size,
              });
            } catch {
              // Skip unreadable .osu
            }
          }
        }
      } catch {
        // Skip unreadable subfolder
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(CONCURRENCY, Math.max(1, subdirs.length)) },
    () => worker()
  );
  await Promise.all(workers);

  return {
    songsDir: resolvedRoot,
    folderCount: subdirs.length,
    entries,
  };
}

function extractHeaderAssetNames(osuText: string): {
  audioFilename?: string;
  bgFilename?: string;
} {
  const headerSlice = osuText.slice(0, 8192);
  let audioFilename: string | undefined;
  let bgFilename: string | undefined;

  const audioMatch = headerSlice.match(/^\s*AudioFilename\s*:\s*(.+)$/im);
  if (audioMatch) {
    audioFilename = audioMatch[1].trim().replace(/^"|"$/g, '');
  }

  const eventsIdx = headerSlice.indexOf('[Events]');
  if (eventsIdx !== -1) {
    const eventsPart = headerSlice.slice(eventsIdx, eventsIdx + 3000);
    const lines = eventsPart.split(/\r?\n/);
    for (let i = 1; i < lines.length; i++) {
      const l = lines[i].trim();
      if (l.startsWith('[')) break;
      if (l.startsWith('0,') || l.startsWith('Background,')) {
        const parts = l.split(',');
        if (parts.length >= 3) {
          const cand = parts[2].trim().replace(/^"|"$/g, '');
          if (cand && /\.(jpe?g|png|webp|bmp)$/i.test(cand)) {
            bgFilename = cand;
            break;
          }
        }
      }
    }
  }

  return { audioFilename, bgFilename };
}

/**
 * Reads a batch of .osu files from authorized folders and pairs each with its local audio & background image path.
 */
export async function readLocalOsuBatch(
  items: Array<{ osuPath: string; folderPath: string }>,
  authorizedRoots: Set<string>
): Promise<LocalBatchReadItem[]> {
  const folderFilesCache = new Map<string, string[]>();

  async function getFolderFiles(folderPath: string): Promise<string[]> {
    const cached = folderFilesCache.get(folderPath);
    if (cached) return cached;
    try {
      const list = await fs.promises.readdir(folderPath);
      folderFilesCache.set(folderPath, list);
      return list;
    } catch {
      folderFilesCache.set(folderPath, []);
      return [];
    }
  }

  const results: LocalBatchReadItem[] = [];

  await Promise.all(
    items.slice(0, 150).map(async (item) => {
      if (
        !item.osuPath ||
        !item.osuPath.toLowerCase().endsWith('.osu') ||
        !isPathInsideAuthorizedRoots(item.osuPath, authorizedRoots)
      ) {
        return;
      }

      try {
        let text = await fs.promises.readFile(item.osuPath, 'utf8');
        if (text.charCodeAt(0) === 0xfeff) {
          text = text.slice(1);
        }

        const folderPath = path.dirname(item.osuPath);
        const siblings = await getFolderFiles(folderPath);
        const { audioFilename, bgFilename } = extractHeaderAssetNames(text);

        let localAudioPath: string | undefined;
        if (audioFilename) {
          const targetLower = audioFilename.replace(/\\/g, '/').split('/').pop()?.toLowerCase();
          const matchedAudio = siblings.find((f) => f.toLowerCase() === targetLower);
          if (matchedAudio) {
            localAudioPath = path.join(folderPath, matchedAudio);
          }
        }
        if (!localAudioPath) {
          const fallbackAudio = siblings.find((f) => /\.(mp3|ogg|wav)$/i.test(f));
          if (fallbackAudio) {
            localAudioPath = path.join(folderPath, fallbackAudio);
          }
        }

        let localBgPath: string | undefined;
        if (bgFilename) {
          const targetBgLower = bgFilename.replace(/\\/g, '/').split('/').pop()?.toLowerCase();
          const matchedBg = siblings.find((f) => f.toLowerCase() === targetBgLower);
          if (matchedBg) {
            localBgPath = path.join(folderPath, matchedBg);
          }
        }
        if (!localBgPath) {
          const fallbackBg = siblings.find((f) => /\.(jpe?g|png|webp)$/i.test(f));
          if (fallbackBg) {
            localBgPath = path.join(folderPath, fallbackBg);
          }
        }

        results.push({
          osuPath: item.osuPath,
          text,
          localAudioPath,
          localBgPath,
        });
      } catch {
        // Skip unreadable file
      }
    })
  );

  return results;
}

function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function createLocalSongsMiddleware() {
  const authorizedRoots = new Set<string>();

  // Pre-authorize default osu! Songs directory on startup if it exists
  detectDefaultOsuSongsDir()
    .then((res) => {
      if (res.exists && res.detectedPath) {
        authorizedRoots.add(path.resolve(res.detectedPath));
      }
    })
    .catch(() => {});

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url || !req.url.startsWith('/api/local-songs')) {
      return next();
    }

    const parsedUrl = new URL(req.url, 'http://localhost');
    const pathname = parsedUrl.pathname;

    try {
      if (req.method === 'GET' && pathname === '/api/local-songs/detect') {
        const info = await detectDefaultOsuSongsDir();
        if (info.exists && info.detectedPath) {
          authorizedRoots.add(path.resolve(info.detectedPath));
        }
        return sendJson(res, 200, {
          available: true,
          ...info,
        });
      }

      if (req.method === 'POST' && pathname === '/api/local-songs/scan') {
        const body = await readJsonBody(req);
        let targetDir = typeof body?.songsDir === 'string' ? body.songsDir.trim() : '';
        if (!targetDir) {
          const detected = await detectDefaultOsuSongsDir();
          targetDir = detected.detectedPath;
        }
        const resolvedDir = path.resolve(targetDir);
        const scanResult = await scanOsuSongsDirectory(resolvedDir);
        authorizedRoots.add(scanResult.songsDir);
        return sendJson(res, 200, scanResult);
      }

      if (req.method === 'POST' && pathname === '/api/local-songs/read-batch') {
        const body = await readJsonBody(req);
        const items = Array.isArray(body?.items) ? body.items : [];
        const files = await readLocalOsuBatch(items, authorizedRoots);
        return sendJson(res, 200, { files });
      }

      if (req.method === 'GET' && pathname === '/api/local-songs/file') {
        const requestedPath = parsedUrl.searchParams.get('path') || '';
        if (!requestedPath) {
          return sendJson(res, 400, { error: 'Parâmetro path ausente.' });
        }

        const resolvedPath = path.resolve(requestedPath);
        const ext = path.extname(resolvedPath).toLowerCase();

        if (
          !ALLOWED_STREAM_EXTENSIONS.has(ext) ||
          !isPathInsideAuthorizedRoots(resolvedPath, authorizedRoots)
        ) {
          return sendJson(res, 403, { error: 'Acesso negado fora da pasta Songs autorizada.' });
        }

        const stat = await fs.promises.stat(resolvedPath);
        if (!stat.isFile()) {
          return sendJson(res, 404, { error: 'Arquivo não encontrado.' });
        }

        const mime = MIME_TYPES[ext] || 'application/octet-stream';
        const totalSize = stat.size;
        const rangeHeader = req.headers.range;

        res.setHeader('Content-Type', mime);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'private, max-age=3600');

        if (rangeHeader) {
          const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
          if (match) {
            const start = match[1] ? parseInt(match[1], 10) : 0;
            const end = match[2] ? Math.min(totalSize - 1, parseInt(match[2], 10)) : totalSize - 1;

            if (start >= totalSize || start > end) {
              res.statusCode = 416;
              res.setHeader('Content-Range', `bytes */${totalSize}`);
              return res.end();
            }

            res.statusCode = 206;
            res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
            res.setHeader('Content-Length', String(end - start + 1));
            const stream = fs.createReadStream(resolvedPath, { start, end });
            stream.on('error', () => res.end());
            return stream.pipe(res);
          }
        }

        res.statusCode = 200;
        res.setHeader('Content-Length', String(totalSize));
        const stream = fs.createReadStream(resolvedPath);
        stream.on('error', () => res.end());
        return stream.pipe(res);
      }

      return sendJson(res, 404, { error: 'Endpoint não encontrado.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return sendJson(res, 500, { error: msg });
    }
  };
}

export function localSongsPlugin(): Plugin {
  const middleware = createLocalSongsMiddleware();
  return {
    name: 'osu-skills-local-songs-bridge',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
