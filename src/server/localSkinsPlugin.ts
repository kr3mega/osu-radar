import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Plugin } from 'vite';
import { isPathInsideAuthorizedRoots } from './localSongsPlugin';

export interface LocalSkinDirectoryEntry {
  name: string;
  folderPath: string;
  hasSkinIni: boolean;
}

export interface LocalSkinManifest {
  skinName: string;
  skinDir: string;
  iniText: string;
  /** Maps normalized lowercase relative path (e.g. "assets/default/default-0@2x.png") -> absolute file path */
  files: Record<string, string>;
}

const ALLOWED_SKIN_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.bmp',
  '.wav',
  '.ogg',
  '.mp3',
  '.flac',
  '.ini',
]);

const SKIN_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.flac': 'audio/flac',
  '.ini': 'text/plain; charset=utf-8',
};

function decodeSkinIniBuffer(buf: Buffer): string {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.subarray(2).toString('utf16le');
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    // UTF-16BE swap
    const swapped = Buffer.allocUnsafe(buf.length - 2);
    for (let i = 2; i + 1 < buf.length; i += 2) {
      swapped[i - 2] = buf[i + 1];
      swapped[i - 1] = buf[i];
    }
    return swapped.toString('utf16le');
  }
  let text = buf.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  return text;
}

/**
 * Auto-detects the default osu!stable Skins folder on Windows / Linux / macOS.
 */
export async function detectDefaultOsuSkinsDir(): Promise<{
  detectedPath: string;
  exists: boolean;
  skins: LocalSkinDirectoryEntry[];
}> {
  const candidates: string[] = [];

  if (process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, 'osu!', 'Skins'));
  }
  if (process.env.USERPROFILE) {
    candidates.push(path.join(process.env.USERPROFILE, 'AppData', 'Local', 'osu!', 'Skins'));
  }
  candidates.push('C:\\osu!\\Skins', 'D:\\osu!\\Skins', 'E:\\osu!\\Skins');
  if (process.env.PROGRAMFILES) {
    candidates.push(path.join(process.env.PROGRAMFILES, 'osu!', 'Skins'));
  }
  if (process.env['PROGRAMFILES(X86)']) {
    candidates.push(path.join(process.env['PROGRAMFILES(X86)'], 'osu!', 'Skins'));
  }
  if (process.env.HOME) {
    candidates.push(path.join(process.env.HOME, '.local', 'share', 'osu-wine', 'osu!', 'Skins'));
  }

  const defaultFallback =
    candidates[0] || 'C:\\Users\\Usuário\\AppData\\Local\\osu!\\Skins';

  for (const candidate of candidates) {
    try {
      const stat = await fs.promises.stat(candidate);
      if (stat.isDirectory()) {
        const scanned = await scanOsuSkinsDirectory(candidate);
        return {
          detectedPath: scanned.skinsDir,
          exists: true,
          skins: scanned.skins,
        };
      }
    } catch {
      // Try next candidate
    }
  }

  return {
    detectedPath: defaultFallback,
    exists: false,
    skins: [],
  };
}

/**
 * Lists all skin folders inside an osu! Skins root directory (or recognizes a single skin folder).
 */
export async function scanOsuSkinsDirectory(skinsDir: string): Promise<{
  skinsDir: string;
  skins: LocalSkinDirectoryEntry[];
}> {
  const resolvedRoot = path.resolve(skinsDir);
  const rootStat = await fs.promises.stat(resolvedRoot);
  if (!rootStat.isDirectory()) {
    throw new Error(`O caminho informado não é uma pasta válida: ${resolvedRoot}`);
  }

  const dirents = await fs.promises.readdir(resolvedRoot, { withFileTypes: true });
  const rootHasSkinIni = dirents.some(
    (d) => d.isFile() && d.name.toLowerCase() === 'skin.ini'
  );

  // If the user pointed directly to a single skin folder (e.g. "...\Skins\WhiteCat"), register its parent or itself cleanly
  if (rootHasSkinIni) {
    return {
      skinsDir: resolvedRoot,
      skins: [
        {
          name: path.basename(resolvedRoot),
          folderPath: resolvedRoot,
          hasSkinIni: true,
        },
      ],
    };
  }

  const subdirs = dirents.filter((d) => d.isDirectory() && !d.name.startsWith('.'));
  const skins: LocalSkinDirectoryEntry[] = [];

  await Promise.all(
    subdirs.map(async (dir) => {
      const folderPath = path.join(resolvedRoot, dir.name);
      try {
        const children = await fs.promises.readdir(folderPath);
        const hasIni = children.some((c) => c.toLowerCase() === 'skin.ini');
        const hasAssets =
          hasIni ||
          children.some((c) => /\.(png|wav|ogg|mp3)$/i.test(c));
        if (hasAssets) {
          skins.push({
            name: dir.name,
            folderPath,
            hasSkinIni: hasIni,
          });
        }
      } catch {
        // Ignore unreadable folder
      }
    })
  );

  skins.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return {
    skinsDir: resolvedRoot,
    skins,
  };
}

/**
 * Builds a complete file manifest + skin.ini text for a single osu! skin folder,
 * walking nested subfolders (e.g. `Assets/default/default-0@2x.png`) up to depth 4.
 */
export async function buildLocalSkinManifest(skinDir: string): Promise<LocalSkinManifest> {
  const resolvedSkinDir = path.resolve(skinDir);
  const st = await fs.promises.stat(resolvedSkinDir);
  if (!st.isDirectory()) {
    throw new Error(`Pasta de skin não encontrada: ${resolvedSkinDir}`);
  }

  const files: Record<string, string> = {};
  let iniText = '';

  async function walk(currentDir: string, relativePrefix: string, depth: number): Promise<void> {
    if (depth > 4) return;
    let dirents: fs.Dirent[];
    try {
      dirents = await fs.promises.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const d of dirents) {
      if (d.name.startsWith('.')) continue;
      const fullPath = path.join(currentDir, d.name);
      const relPosix = relativePrefix ? `${relativePrefix}/${d.name}` : d.name;

      if (d.isDirectory()) {
        await walk(fullPath, relPosix, depth + 1);
      } else if (d.isFile()) {
        const ext = path.extname(d.name).toLowerCase();
        if (!ALLOWED_SKIN_EXTENSIONS.has(ext)) continue;

        const key = relPosix.toLowerCase();
        files[key] = fullPath;

        if (depth === 0 && d.name.toLowerCase() === 'skin.ini') {
          try {
            const rawBuf = await fs.promises.readFile(fullPath);
            iniText = decodeSkinIniBuffer(rawBuf);
          } catch {
            // Ignore unreadable skin.ini
          }
        }
      }
    }
  }

  await walk(resolvedSkinDir, '', 0);

  return {
    skinName: path.basename(resolvedSkinDir),
    skinDir: resolvedSkinDir,
    iniText,
    files,
  };
}

function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > 2 * 1024 * 1024) {
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

function isSkinDirAuthorized(targetDir: string, authorizedRoots: Set<string>): boolean {
  if (!targetDir || authorizedRoots.size === 0) return false;
  const resolvedTarget = path.resolve(targetDir);
  const isWin = process.platform === 'win32';
  const normTarget = isWin ? resolvedTarget.toLowerCase() : resolvedTarget;

  for (const root of authorizedRoots) {
    const resolvedRoot = path.resolve(root);
    const normRoot = isWin ? resolvedRoot.toLowerCase() : resolvedRoot;
    if (normTarget === normRoot) return true;
    const prefix = normRoot.endsWith(path.sep) ? normRoot : normRoot + path.sep;
    if (normTarget.startsWith(prefix)) return true;
  }
  return false;
}

function createLocalSkinsMiddleware() {
  const authorizedRoots = new Set<string>();

  detectDefaultOsuSkinsDir()
    .then((res) => {
      if (res.exists && res.detectedPath) {
        authorizedRoots.add(path.resolve(res.detectedPath));
      }
    })
    .catch(() => {});

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url || !req.url.startsWith('/api/local-skins')) {
      return next();
    }

    const parsedUrl = new URL(req.url, 'http://localhost');
    const pathname = parsedUrl.pathname;

    try {
      if (req.method === 'GET' && pathname === '/api/local-skins/detect') {
        const info = await detectDefaultOsuSkinsDir();
        if (info.exists && info.detectedPath) {
          authorizedRoots.add(path.resolve(info.detectedPath));
        }
        return sendJson(res, 200, {
          available: true,
          ...info,
        });
      }

      if (req.method === 'POST' && pathname === '/api/local-skins/scan') {
        const body = await readJsonBody(req);
        let targetDir = typeof body?.skinsDir === 'string' ? body.skinsDir.trim() : '';
        if (!targetDir) {
          const detected = await detectDefaultOsuSkinsDir();
          targetDir = detected.detectedPath;
        }
        const resolvedDir = path.resolve(targetDir);
        const scanResult = await scanOsuSkinsDirectory(resolvedDir);
        authorizedRoots.add(scanResult.skinsDir);
        return sendJson(res, 200, scanResult);
      }

      if (req.method === 'GET' && pathname === '/api/local-skins/manifest') {
        const skinDir = parsedUrl.searchParams.get('skinDir') || '';
        if (!skinDir) {
          return sendJson(res, 400, { error: 'Parâmetro skinDir ausente.' });
        }
        const resolvedSkinDir = path.resolve(skinDir);
        if (!isSkinDirAuthorized(resolvedSkinDir, authorizedRoots)) {
          return sendJson(res, 403, { error: 'Pasta de skin fora do diretório autorizado.' });
        }
        const manifest = await buildLocalSkinManifest(resolvedSkinDir);
        return sendJson(res, 200, manifest);
      }

      if (req.method === 'GET' && pathname === '/api/local-skins/file') {
        const requestedPath = parsedUrl.searchParams.get('path') || '';
        if (!requestedPath) {
          return sendJson(res, 400, { error: 'Parâmetro path ausente.' });
        }

        const resolvedPath = path.resolve(requestedPath);
        const ext = path.extname(resolvedPath).toLowerCase();

        if (
          !ALLOWED_SKIN_EXTENSIONS.has(ext) ||
          !isPathInsideAuthorizedRoots(resolvedPath, authorizedRoots)
        ) {
          return sendJson(res, 403, { error: 'Acesso negado fora da pasta Skins autorizada.' });
        }

        const stat = await fs.promises.stat(resolvedPath);
        if (!stat.isFile()) {
          return sendJson(res, 404, { error: 'Arquivo não encontrado.' });
        }

        const mime = SKIN_MIME_TYPES[ext] || 'application/octet-stream';
        res.statusCode = 200;
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Length', String(stat.size));
        res.setHeader('Cache-Control', 'private, max-age=3600');
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

export function localSkinsPlugin(): Plugin {
  const middleware = createLocalSkinsMiddleware();
  return {
    name: 'osu-radar-local-skins-bridge',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
