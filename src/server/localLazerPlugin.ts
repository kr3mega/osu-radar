import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Plugin } from 'vite';

export interface ScannedLazerEntry {
  hash: string;
  osuPath: string;
  folderPath: string;
  folderName: string;
  fileName: string;
  mtimeMs: number;
  size: number;
  localAudioPath?: string;
  localBgPath?: string;
}

export interface LocalLazerBatchReadItem {
  osuPath: string;
  hash: string;
  text: string;
  localAudioPath?: string;
  localBgPath?: string;
}

export interface LazerDetectionInfo {
  detectedPath: string;
  exists: boolean;
  beatmapCount: number;
  filesCount: number;
  hasRealm: boolean;
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
 * Returns the candidate paths for the osu!lazer directory across Windows, macOS and Linux.
 */
export function getLazerDirectoryCandidates(): string[] {
  const candidates: string[] = [];

  if (process.env.APPDATA) {
    candidates.push(path.join(process.env.APPDATA, 'osu'));
  }
  if (process.env.USERPROFILE) {
    candidates.push(path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'osu'));
  }
  if (process.env.HOME) {
    candidates.push(
      path.join(process.env.HOME, '.local', 'share', 'osu'),
      path.join(process.env.HOME, 'Library', 'Application Support', 'osu')
    );
  }
  candidates.push('C:\\osu-lazer', 'D:\\osu-lazer', 'E:\\osu-lazer');
  return candidates;
}

/**
 * Checks whether targetPath resides strictly inside one of the authorized directories.
 */
export function isPathInsideLazerRoots(targetPath: string, authorizedRoots: Set<string>): boolean {
  if (!targetPath || authorizedRoots.size === 0) return false;
  const resolvedTarget = path.resolve(targetPath);
  const isWin = process.platform === 'win32';
  const normTarget = isWin ? resolvedTarget.toLowerCase() : resolvedTarget;

  for (const root of authorizedRoots) {
    const resolvedRoot = path.resolve(root);
    const normRoot = isWin ? resolvedRoot.toLowerCase() : resolvedRoot;
    const prefix = normRoot.endsWith(path.sep) ? normRoot : normRoot + path.sep;
    if (normTarget.startsWith(prefix) || normTarget === normRoot) {
      return true;
    }
  }
  return false;
}

/**
 * Resolves a 64-character SHA256 hex string to its content-addressed storage path inside osu!lazer files/
 * Structure: files/<first-char>/<first-two-chars>/<full-hash>
 */
export function getLazerStorageFilePath(lazerDir: string, hash: string): string {
  const cleanHash = hash.trim().toLowerCase();
  if (cleanHash.length !== 64) {
    return '';
  }
  return path.join(lazerDir, 'files', cleanHash[0], cleanHash.slice(0, 2), cleanHash);
}

export class LazerRealmFileMap extends Map<string, string> {
  public osuToFiles = new Map<string, Map<string, string>>();
  public osuToSet = new Map<
    string,
    { audioPath?: string; bgPath?: string; beatmapSetId?: number }
  >();
}

/**
 * Parses client.realm in osu!lazer and extracts file mappings: { filename.toLowerCase() -> sha256Hash },
 * as well as beatmapset pairings associating each .osu hash with its specific audio & background.
 * Uses official Realm engine when available, falling back gracefully to binary string heuristics.
 */
export function parseLazerRealmFileMap(realmPath: string): LazerRealmFileMap {
  const fileMap = new LazerRealmFileMap();
  if (!realmPath || !fs.existsSync(realmPath)) return fileMap;

  // 1. Attempt high-fidelity native Realm parsing if realm package is present
  try {
    let RealmCls: any = null;
    try {
      // CommonJS or Node dynamic require
      if (typeof require !== 'undefined') {
        RealmCls = require('realm');
      }
    } catch {}

    if (RealmCls && typeof RealmCls === 'function') {
      const realm = new RealmCls({ path: realmPath, readOnly: true });
      const sets = realm.objects('BeatmapSet');
      const lazerDir = path.dirname(realmPath);
      const filesDir = path.join(lazerDir, 'files');

      for (const s of sets) {
        const setAssets = new Map<string, string>();
        let defaultAudioHash: string | undefined;
        let defaultBgHash: string | undefined;

        if (s.Files) {
          for (const f of s.Files) {
            if (!f || !f.Filename || !f.File || !f.File.Hash) continue;
            const nameLower = f.Filename.replace(/\\/g, '/').toLowerCase();
            const hash = f.File.Hash.toLowerCase();
            setAssets.set(nameLower, hash);
            fileMap.set(nameLower, hash);
            const baseName = nameLower.split('/').pop();
            if (baseName) {
              setAssets.set(baseName, hash);
              fileMap.set(baseName, hash);
            }
            if (/\.(mp3|ogg|wav|flac)$/i.test(nameLower) && !defaultAudioHash) {
              defaultAudioHash = hash;
            }
            if (/\.(jpg|jpeg|png|webp|bmp)$/i.test(nameLower) && !defaultBgHash) {
              if (nameLower.includes('bg') || nameLower.includes('background') || !nameLower.includes('/')) {
                defaultBgHash = hash;
              }
            }
          }
        }

        if (s.Beatmaps) {
          for (const b of s.Beatmaps) {
            // Strictly enforce standard mode (ruleset osu)
            if (b.Ruleset && b.Ruleset.ShortName !== 'osu') continue;
            const osuHash = b.Hash ? b.Hash.toLowerCase() : '';
            if (!osuHash || osuHash.length !== 64) continue;

            fileMap.osuToFiles.set(osuHash, setAssets);

            let audioHash = defaultAudioHash;
            let bgHash = defaultBgHash;

            const osuFilePath = path.join(filesDir, osuHash[0], osuHash.slice(0, 2), osuHash);
            if (fs.existsSync(osuFilePath)) {
              try {
                const fd = fs.openSync(osuFilePath, 'r');
                const headBuf = Buffer.alloc(16384);
                const readBytes = fs.readSync(fd, headBuf, 0, 16384, 0);
                fs.closeSync(fd);
                const headStr = headBuf.toString('utf8', 0, readBytes);

                const { audioFilename, bgFilename } = extractLazerHeaderAssetNames(headStr);
                if (audioFilename) {
                  const cleanAudio = audioFilename.replace(/\\/g, '/').split('/').pop()?.toLowerCase();
                  const matched = (cleanAudio && setAssets.get(cleanAudio)) || setAssets.get(audioFilename.toLowerCase());
                  if (matched) audioHash = matched;
                }
                if (bgFilename) {
                  const cleanBg = bgFilename.replace(/\\/g, '/').split('/').pop()?.toLowerCase();
                  const matched = (cleanBg && setAssets.get(cleanBg)) || setAssets.get(bgFilename.toLowerCase());
                  if (matched) bgHash = matched;
                }
              } catch {}
            }

            let audioPath: string | undefined;
            if (audioHash) {
              const cand = getLazerStorageFilePath(lazerDir, audioHash);
              if (fs.existsSync(cand)) audioPath = cand;
            }

            let bgPath: string | undefined;
            if (bgHash) {
              const cand = getLazerStorageFilePath(lazerDir, bgHash);
              if (fs.existsSync(cand)) bgPath = cand;
            }

            fileMap.osuToSet.set(osuHash, {
              audioPath,
              bgPath,
              beatmapSetId: s.OnlineID || s.ID,
            });
          }
        }
      }

      realm.close();
      if (fileMap.size > 0 || fileMap.osuToSet.size > 0) {
        return fileMap;
      }
    }
  } catch {
    // If native Realm open fails (e.g. mock test file), fall back to string scanner below
  }

  // 2. Fallback heuristic binary string scanner (handles mock files and test environments)
  try {
    const fd = fs.openSync(realmPath, 'r');
    const st = fs.fstatSync(fd);
    const buf = Buffer.alloc(st.size);
    fs.readSync(fd, buf, 0, st.size, 0);
    fs.closeSync(fd);

    const str = buf.toString('latin1');
    const regex = /A([a-f0-9]{64})[\s\S]{0,100}?([^\x00-\x1f\x7f-\xff\r\n]+\.(osu|mp3|ogg|wav|flac|jpg|jpeg|png|webp|bmp))/gi;
    const matches: Array<{ pos: number; hash: string; filename: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(str)) !== null) {
      const hash = m[1].toLowerCase();
      const rawFile = m[2].trim().toLowerCase();
      const cleanFile = rawFile.replace(/^[:;,\s0-9]+/, '') || rawFile;
      fileMap.set(cleanFile, hash);
      matches.push({ pos: m.index, hash, filename: cleanFile });
    }

    // Group adjacent file usages into beatmapset clusters
    let cluster: Array<{ pos: number; hash: string; filename: string }> = [];
    const processCluster = (c: Array<{ pos: number; hash: string; filename: string }>) => {
      const osus = c.filter((x) => x.filename.endsWith('.osu'));
      const assets = new Map<string, string>();
      for (const x of c) {
        if (!x.filename.endsWith('.osu')) {
          assets.set(x.filename, x.hash);
        }
      }
      for (const o of osus) {
        fileMap.osuToFiles.set(o.hash, assets);
      }
    };

    for (let i = 0; i < matches.length; i++) {
      const item = matches[i];
      if (cluster.length === 0) {
        cluster.push(item);
      } else {
        const prev = cluster[cluster.length - 1];
        if (item.pos - prev.pos < 6000) {
          cluster.push(item);
        } else {
          processCluster(cluster);
          cluster = [item];
        }
      }
    }
    if (cluster.length > 0) {
      processCluster(cluster);
    }
  } catch {
    // If realm cannot be read, fallback to empty map
  }
  return fileMap;
}

/**
 * Auto-detects the default osu!lazer directory on Windows / Linux / macOS.
 */
export async function detectDefaultOsuLazerDir(): Promise<LazerDetectionInfo> {
  const candidates = getLazerDirectoryCandidates();
  const defaultFallback = candidates[0] || path.join(process.env.APPDATA || 'C:\\', 'osu');

  for (const candidate of candidates) {
    try {
      const stat = await fs.promises.stat(candidate);
      if (stat.isDirectory()) {
        const filesDir = path.join(candidate, 'files');
        const realmPath = path.join(candidate, 'client.realm');
        const hasRealm = fs.existsSync(realmPath);

        let filesCount = 0;
        let hasFilesDir = false;

        try {
          const filesStat = await fs.promises.stat(filesDir);
          if (filesStat.isDirectory()) {
            hasFilesDir = true;
            // Quick count of bucket folders
            const buckets = await fs.promises.readdir(filesDir);
            filesCount = buckets.length;
          }
        } catch {}

        if (hasFilesDir || hasRealm) {
          return {
            detectedPath: path.resolve(candidate),
            exists: true,
            beatmapCount: 0,
            filesCount,
            hasRealm,
          };
        }
      }
    } catch {
      // Try next candidate
    }
  }

  return {
    detectedPath: defaultFallback,
    exists: false,
    beatmapCount: 0,
    filesCount: 0,
    hasRealm: false,
  };
}

/**
 * Extracts asset names (AudioFilename and Background image) from the header slice of an .osu text.
 */
function extractLazerHeaderAssetNames(osuText: string): {
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
 * Scans osu!lazer content-addressed storage (files/) and indexes all .osu beatmaps,
 * pairing them with their local audio and background images via client.realm or folder matches.
 */
export async function scanOsuLazerDirectory(lazerDir: string): Promise<{
  lazerDir: string;
  filesDir: string;
  beatmapCount: number;
  entries: ScannedLazerEntry[];
}> {
  const resolvedRoot = path.resolve(lazerDir);
  const filesDir = path.join(resolvedRoot, 'files');
  const realmPath = path.join(resolvedRoot, 'client.realm');

  const filesStat = await fs.promises.stat(filesDir);
  if (!filesStat.isDirectory()) {
    throw new Error(`A pasta de arquivos do osu!lazer não foi encontrada em: ${filesDir}`);
  }

  // 1. High-speed native Realm database scanning (extracts all standard beatmaps with audio & BG in < 1s)
  if (fs.existsSync(realmPath)) {
    try {
      const fileMap = parseLazerRealmFileMap(realmPath);
      if (fileMap.osuToSet.size > 0) {
        const realmEntries: ScannedLazerEntry[] = [];
        for (const [osuHash, setInfo] of fileMap.osuToSet.entries()) {
          const osuPath = getLazerStorageFilePath(resolvedRoot, osuHash);
          if (!fs.existsSync(osuPath)) continue;

          let size = 0;
          let mtimeMs = Date.now();
          try {
            const st = fs.statSync(osuPath);
            size = st.size;
            mtimeMs = Math.round(st.mtimeMs);
          } catch {}

          const p2 = path.dirname(osuPath);
          const bucket = osuHash[0];
          const c2 = osuHash.slice(0, 2);

          realmEntries.push({
            hash: osuHash,
            osuPath,
            folderPath: p2,
            folderName: `lazer_${bucket}${c2}`,
            fileName: `${osuHash}.osu`,
            mtimeMs,
            size,
            localAudioPath: setInfo.audioPath,
            localBgPath: setInfo.bgPath,
          });
        }

        if (realmEntries.length > 0) {
          return {
            lazerDir: resolvedRoot,
            filesDir,
            beatmapCount: realmEntries.length,
            entries: realmEntries,
          };
        }
      }
    } catch {}
  }

  // 2. Fallback: scan files/ directory across the 16 hex buckets
  const hexBuckets = '0123456789abcdef'.split('');
  const entries: ScannedLazerEntry[] = [];

  const CONCURRENCY = 16;
  let cursor = 0;

  async function processBucketWorker() {
    while (cursor < hexBuckets.length) {
      const idx = cursor++;
      const bucket = hexBuckets[idx];
      const p1 = path.join(filesDir, bucket);
      try {
        const subdirs = await fs.promises.readdir(p1);
        for (const c2 of subdirs) {
          const p2 = path.join(p1, c2);
          try {
            const files = await fs.promises.readdir(p2);
            for (const file of files) {
              if (file.length !== 64) continue;
              const fullPath = path.join(p2, file);
              try {
                const st = await fs.promises.stat(fullPath);
                // .osu beatmaps are typically between 50 bytes and 2MB
                if (st.size < 50 || st.size > 2000000) continue;

                const fd = await fs.promises.open(fullPath, 'r');
                const buf = Buffer.alloc(1024);
                const { bytesRead } = await fd.read(buf, 0, 1024, 0);
                await fd.close();

                const headStr = buf.toString('utf8', 0, bytesRead);
                if (headStr.startsWith('osu file format v')) {
                  // Mode: 0 = osu! (standard), 1 = Taiko, 2 = Catch, 3 = Mania
                  // Strictly ignore non-standard modes so only osu!standard maps are imported
                  const modeMatch = headStr.match(/^\s*Mode\s*:\s*(\d+)/im);
                  if (modeMatch && parseInt(modeMatch[1], 10) !== 0) {
                    continue;
                  }

                  entries.push({
                    hash: file,
                    osuPath: fullPath,
                    folderPath: p2,
                    folderName: `lazer_${bucket}${c2}`,
                    fileName: `${file}.osu`,
                    mtimeMs: Math.round(st.mtimeMs),
                    size: st.size,
                  });
                }
              } catch {
                // Skip unreadable item
              }
            }
          } catch {
            // Skip unreadable subdir
          }
        }
      } catch {
        // Skip unreadable bucket
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => processBucketWorker());
  await Promise.all(workers);

  return {
    lazerDir: resolvedRoot,
    filesDir,
    beatmapCount: entries.length,
    entries,
  };
}

/**
 * Reads a batch of .osu files from osu!lazer storage and pairs each with its local audio & background image.
 */
export async function readLocalLazerBatch(
  items: Array<{ osuPath: string; hash?: string }>,
  lazerDir: string,
  authorizedRoots: Set<string>
): Promise<LocalLazerBatchReadItem[]> {
  const realmPath = path.join(lazerDir, 'client.realm');
  const fileMap = parseLazerRealmFileMap(realmPath);

  const results: LocalLazerBatchReadItem[] = [];

  await Promise.all(
    items.slice(0, 150).map(async (item) => {
      if (!item.osuPath || !isPathInsideLazerRoots(item.osuPath, authorizedRoots)) {
        return;
      }

      try {
        let text = await fs.promises.readFile(item.osuPath, 'utf8');
        if (text.charCodeAt(0) === 0xfeff) {
          text = text.slice(1);
        }

        // Strictly verify standard mode (Mode 0)
        const modeMatch = text.slice(0, 4096).match(/^\s*Mode\s*:\s*(\d+)/im);
        if (modeMatch && parseInt(modeMatch[1], 10) !== 0) {
          return;
        }

        const resolvedHash = (item.hash || path.basename(item.osuPath).replace(/\.osu$/i, '')).toLowerCase();
        const setAssets = fileMap.osuToFiles.get(resolvedHash);
        const setInfo = fileMap.osuToSet.get(resolvedHash);

        let localAudioPath: string | undefined = setInfo?.audioPath;
        let localBgPath: string | undefined = setInfo?.bgPath;

        const { audioFilename, bgFilename } = extractLazerHeaderAssetNames(text);

        if (!localAudioPath && audioFilename) {
          const cleanAudio = audioFilename.replace(/\\/g, '/').split('/').pop()?.toLowerCase();
          const audioHash = cleanAudio ? (setAssets?.get(cleanAudio) || fileMap.get(cleanAudio)) : undefined;
          if (audioHash) {
            const cand = getLazerStorageFilePath(lazerDir, audioHash);
            if (fs.existsSync(cand)) {
              localAudioPath = cand;
            }
          }
        }

        if (!localBgPath && bgFilename) {
          const cleanBg = bgFilename.replace(/\\/g, '/').split('/').pop()?.toLowerCase();
          const bgHash = cleanBg ? (setAssets?.get(cleanBg) || fileMap.get(cleanBg)) : undefined;
          if (bgHash) {
            const cand = getLazerStorageFilePath(lazerDir, bgHash);
            if (fs.existsSync(cand)) {
              localBgPath = cand;
            }
          }
        }

        results.push({
          osuPath: item.osuPath,
          hash: resolvedHash,
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

/**
 * Creates the HTTP middleware for osu!lazer detection, scanning, batch-reading and media streaming.
 */
export function createLocalLazerMiddleware(initialRoots?: Set<string> | string[]) {
  const authorizedRoots = new Set<string>();

  if (initialRoots) {
    for (const r of initialRoots) {
      authorizedRoots.add(path.resolve(r));
      authorizedRoots.add(path.resolve(path.join(r, 'files')));
    }
  }

  detectDefaultOsuLazerDir()
    .then((info) => {
      if (info.exists && info.detectedPath) {
        authorizedRoots.add(path.resolve(info.detectedPath));
        authorizedRoots.add(path.resolve(path.join(info.detectedPath, 'files')));
      }
    })
    .catch(() => {});

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (
      !req.url ||
      (!req.url.startsWith('/api/lazer') && !req.url.startsWith('/api/local-songs/file'))
    ) {
      return next();
    }

    const parsedUrl = new URL(req.url, 'http://localhost');
    const pathname = parsedUrl.pathname;

    try {
      if (req.method === 'GET' && pathname === '/api/lazer/detect') {
        const info = await detectDefaultOsuLazerDir();
        if (info.exists && info.detectedPath) {
          authorizedRoots.add(path.resolve(info.detectedPath));
          authorizedRoots.add(path.resolve(path.join(info.detectedPath, 'files')));
        }
        return sendJson(res, 200, {
          available: true,
          ...info,
        });
      }

      if (req.method === 'POST' && pathname === '/api/lazer/scan') {
        const body = await readJsonBody(req);
        let targetDir = typeof body?.lazerDir === 'string' ? body.lazerDir.trim() : '';
        if (!targetDir) {
          const detected = await detectDefaultOsuLazerDir();
          targetDir = detected.detectedPath;
        }
        const resolvedDir = path.resolve(targetDir);
        const scanResult = await scanOsuLazerDirectory(resolvedDir);
        authorizedRoots.add(scanResult.lazerDir);
        authorizedRoots.add(scanResult.filesDir);
        return sendJson(res, 200, scanResult);
      }

      if (req.method === 'POST' && pathname === '/api/lazer/read-batch') {
        const body = await readJsonBody(req);
        const items = Array.isArray(body?.items) ? body.items : [];
        let targetDir = typeof body?.lazerDir === 'string' ? body.lazerDir.trim() : '';
        if (!targetDir) {
          const detected = await detectDefaultOsuLazerDir();
          targetDir = detected.detectedPath;
        }
        const files = await readLocalLazerBatch(items, path.resolve(targetDir), authorizedRoots);
        return sendJson(res, 200, { files });
      }

      if (req.method === 'GET' && (pathname === '/api/lazer/file' || pathname === '/api/local-songs/file')) {
        const requestedPath = parsedUrl.searchParams.get('path') || '';
        const requestedHash = parsedUrl.searchParams.get('hash') || '';
        let targetFile = requestedPath ? path.resolve(requestedPath) : '';

        if (!targetFile && requestedHash) {
          const detected = await detectDefaultOsuLazerDir();
          targetFile = getLazerStorageFilePath(detected.detectedPath, requestedHash);
        }

        if (!targetFile) {
          return sendJson(res, 400, { error: 'Parâmetro path ou hash ausente.' });
        }

        if (!isPathInsideLazerRoots(targetFile, authorizedRoots)) {
          // If not authorized yet, check if it resides in detected default lazer directory
          const def = await detectDefaultOsuLazerDir();
          if (def.exists && isPathInsideLazerRoots(targetFile, new Set([path.resolve(def.detectedPath)]))) {
            authorizedRoots.add(path.resolve(def.detectedPath));
            authorizedRoots.add(path.resolve(path.join(def.detectedPath, 'files')));
          } else {
            return next();
          }
        }

        const stat = await fs.promises.stat(targetFile);
        if (!stat.isFile()) {
          return sendJson(res, 404, { error: 'Arquivo não encontrado.' });
        }

        const ext = path.extname(targetFile).toLowerCase();
        if (ext && !ALLOWED_STREAM_EXTENSIONS.has(ext)) {
          return sendJson(res, 403, { error: 'Extensão não autorizada.' });
        }
        // In lazer CAS, files often have no extension; detect or fallback to octet-stream/audio/image
        let mime = MIME_TYPES[ext] || 'application/octet-stream';
        if (ext === '') {
          // Detect by header with support for UTF-8 BOM, OGG, WAV, MP3 and images
          try {
            const fd = await fs.promises.open(targetFile, 'r');
            const headBuf = Buffer.alloc(64);
            await fd.read(headBuf, 0, 64, 0);
            await fd.close();
            const headStr = headBuf.toString('utf8').replace(/^\ufeff/, '');
            if (headStr.startsWith('osu file format')) {
              mime = 'text/plain; charset=utf-8';
            } else if (headBuf[0] === 0x89 && headBuf[1] === 0x50 && headBuf[2] === 0x4e && headBuf[3] === 0x47) {
              mime = 'image/png';
            } else if (headBuf[0] === 0xff && headBuf[1] === 0xd8) {
              mime = 'image/jpeg';
            } else if (headBuf.toString('ascii', 0, 4) === 'OggS') {
              mime = 'audio/ogg';
            } else if (headBuf.toString('ascii', 0, 4) === 'RIFF' && headBuf.toString('ascii', 8, 12) === 'WAVE') {
              mime = 'audio/wav';
            } else if (headBuf.toString('ascii', 0, 4) === 'fLaC') {
              mime = 'audio/flac';
            } else if (
              headBuf.toString('ascii', 0, 3) === 'ID3' ||
              (headBuf[0] === 0xff && (headBuf[1] & 0xe0) === 0xe0)
            ) {
              mime = 'audio/mpeg';
            }
          } catch {}
        }

        const totalSize = stat.size;
        const rangeHeader = req.headers.range;

        res.setHeader('Content-Type', mime);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'private, max-age=3600');

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
            const stream = fs.createReadStream(targetFile, { start, end });
            stream.on('error', () => res.end());
            stream.pipe(res);
            return;
          }
        }

        res.statusCode = 200;
        res.setHeader('Content-Length', String(totalSize));
        const stream = fs.createReadStream(targetFile);
        stream.on('error', () => res.end());
        stream.pipe(res);
        return;
      }

      next();
    } catch (err) {
      sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
  };
}

/**
 * Vite plugin enabling the osu!lazer local disk bridge during development.
 */
export function localLazerPlugin(): Plugin {
  return {
    name: 'vite-plugin-local-osu-lazer',
    configureServer(server) {
      server.middlewares.use(createLocalLazerMiddleware());
    },
  };
}
