import { analyzeBeatmap } from '../engine/analyzer';
import { extractOsuModeQuick } from '../engine/parser';
import { BeatmapAnalysisResult } from '../engine/types';
import { cacheBeatmapTexts, CachedBeatmapText } from '../db';
import type {
  WorkerAnalyzeFileInput,
  WorkerAnalyzePayload,
  WorkerMessage,
} from '../workers/analyzer.worker';

export interface LocalBridgeDetection {
  available: boolean;
  detectedPath: string;
  exists: boolean;
  folderCount: number;
}

export interface LocalLazerDetection {
  available: boolean;
  detectedPath: string;
  exists: boolean;
  beatmapCount: number;
  filesCount: number;
  hasRealm: boolean;
}

export interface DualLocalBridgeDetection extends LocalBridgeDetection {
  stable: LocalBridgeDetection;
  lazer: LocalLazerDetection;
}

export interface LocalLibrarySyncProgress {
  phase: 'scanning' | 'indexing' | 'completed' | 'cancelled';
  processed: number;
  totalToAnalyze: number;
  totalDiscovered: number;
  indexedStandard: number;
  skippedCached: number;
  skippedNonStandard: number;
  currentFileName: string;
}

interface ScannedEntry {
  osuPath: string;
  folderPath: string;
  folderName: string;
  fileName: string;
  mtimeMs: number;
  size: number;
  localAudioPath?: string;
  localBgPath?: string;
}

/**
 * Checks if the local Vite osu!lazer disk bridge is reachable and returns auto-detected path info.
 */
export async function detectLocalOsuLazerFolder(): Promise<LocalLazerDetection> {
  try {
    const res = await fetch('/api/lazer/detect');
    if (!res.ok) {
      return { available: false, detectedPath: '', exists: false, beatmapCount: 0, filesCount: 0, hasRealm: false };
    }
    const data = await res.json();
    return {
      available: Boolean(data.available),
      detectedPath: data.detectedPath || '',
      exists: Boolean(data.exists),
      beatmapCount: Number(data.beatmapCount) || 0,
      filesCount: Number(data.filesCount) || 0,
      hasRealm: Boolean(data.hasRealm),
    };
  } catch {
    return { available: false, detectedPath: '', exists: false, beatmapCount: 0, filesCount: 0, hasRealm: false };
  }
}

/**
 * Checks if the local Vite osu! Songs disk bridge is reachable and returns auto-detected path info
 * for both osu!stable and osu!lazer.
 */
export async function detectLocalOsuSongsFolder(): Promise<DualLocalBridgeDetection> {
  try {
    const res = await fetch('/api/local-songs/detect');
    if (!res.ok) {
      const emptyBase = { available: false, detectedPath: '', exists: false, folderCount: 0 };
      const emptyLazer = { available: false, detectedPath: '', exists: false, beatmapCount: 0, filesCount: 0, hasRealm: false };
      return { ...emptyBase, stable: emptyBase, lazer: emptyLazer };
    }
    const data = await res.json();
    const stableInfo: LocalBridgeDetection = {
      available: Boolean(data.available),
      detectedPath: data.stable?.detectedPath || data.detectedPath || '',
      exists: Boolean(data.stable?.exists ?? data.exists),
      folderCount: Number(data.stable?.folderCount ?? data.folderCount) || 0,
    };
    const lazerInfo: LocalLazerDetection = {
      available: Boolean(data.lazer?.available ?? data.available),
      detectedPath: data.lazer?.detectedPath || '',
      exists: Boolean(data.lazer?.exists),
      beatmapCount: Number(data.lazer?.beatmapCount) || 0,
      filesCount: Number(data.lazer?.filesCount) || 0,
      hasRealm: Boolean(data.lazer?.hasRealm),
    };
    return {
      available: Boolean(data.available),
      detectedPath: stableInfo.detectedPath || lazerInfo.detectedPath,
      exists: stableInfo.exists || lazerInfo.exists,
      folderCount: stableInfo.folderCount,
      stable: stableInfo,
      lazer: lazerInfo,
    };
  } catch {
    const emptyBase = { available: false, detectedPath: '', exists: false, folderCount: 0 };
    const emptyLazer = { available: false, detectedPath: '', exists: false, beatmapCount: 0, filesCount: 0, hasRealm: false };
    return { ...emptyBase, stable: emptyBase, lazer: emptyLazer };
  }
}

async function runAnalyzeBatchOnWorkerOrMain(
  worker: Worker | null,
  files: WorkerAnalyzeFileInput[]
): Promise<{ results: BeatmapAnalysisResult[]; skippedNonStandard: number }> {
  if (files.length === 0) {
    return { results: [], skippedNonStandard: 0 };
  }

  if (worker) {
    return new Promise((resolve, reject) => {
      const handleMessage = (ev: MessageEvent<WorkerMessage>) => {
        const msg = ev.data;
        if (msg.type === 'SUCCESS') {
          cleanup();
          resolve({
            results: msg.results,
            skippedNonStandard: msg.skippedNonStandard || 0,
          });
        } else if (msg.type === 'ERROR') {
          cleanup();
          reject(new Error(msg.message));
        }
      };

      const handleError = (err: ErrorEvent) => {
        cleanup();
        reject(new Error(err.message || 'Erro no Web Worker de análise'));
      };

      const cleanup = () => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
      const payload: WorkerAnalyzePayload = {
        type: 'ANALYZE_BATCH',
        files,
      };
      worker.postMessage(payload);
    });
  }

  // Main-thread fallback (e.g. non-worker environments)
  const results: BeatmapAnalysisResult[] = [];
  let skippedNonStandard = 0;

  for (const file of files) {
    if (file.skipNonStandard && extractOsuModeQuick(file.text) !== 0) {
      skippedNonStandard++;
      continue;
    }
    const res = await analyzeBeatmap(
      file.text,
      file.fileName,
      file.bytes,
      undefined,
      undefined,
      {
        folderName: file.folderName,
        lightweight: file.lightweight,
        origin: file.origin,
        localOsuPath: file.localOsuPath,
        localAudioPath: file.localAudioPath,
        localBgPath: file.localBgPath,
        fileMtimeMs: file.fileMtimeMs,
      }
    );
    if (file.skipNonStandard && (res.metadata.mode ?? 0) !== 0) {
      skippedNonStandard++;
      continue;
    }
    results.push(res);
  }

  return { results, skippedNonStandard };
}

function createWorkerPool(): Worker[] {
  if (typeof Worker === 'undefined') return [];
  const count = Math.min(4, Math.max(1, (navigator.hardwareConcurrency || 4) - 1));
  const pool: Worker[] = [];
  for (let i = 0; i < count; i++) {
    try {
      pool.push(
        new Worker(new URL('../workers/analyzer.worker.ts', import.meta.url), {
          type: 'module',
        })
      );
    } catch {
      break;
    }
  }
  return pool;
}

/**
 * Syncs and indexes all osu!standard beatmaps directly from the local osu!stable Songs folder
 * via the local server bridge, using incremental mtime caching + multi-core Web Workers.
 */
export async function syncFromLocalServerBridge(options: {
  songsDir?: string;
  client?: 'stable' | 'lazer';
  existingMaps: BeatmapAnalysisResult[];
  forceReindex?: boolean;
  signal?: AbortSignal;
  onProgress?: (progress: LocalLibrarySyncProgress) => void;
  onCommitBatch: (maps: BeatmapAnalysisResult[], removedIds?: string[]) => Promise<void>;
}): Promise<{
  songsDir: string;
  client: 'stable' | 'lazer';
  indexedStandard: number;
  skippedCached: number;
  skippedNonStandard: number;
  totalDiscovered: number;
  cancelled: boolean;
}> {
  const { songsDir, client = 'stable', existingMaps, forceReindex = false, signal, onProgress, onCommitBatch } = options;

  const isLazer = client === 'lazer';
  const scanEndpoint = isLazer ? '/api/lazer/scan' : '/api/local-songs/scan';
  const readBatchEndpoint = isLazer ? '/api/lazer/read-batch' : '/api/local-songs/read-batch';

  onProgress?.({
    phase: 'scanning',
    processed: 0,
    totalToAnalyze: 0,
    totalDiscovered: 0,
    indexedStandard: 0,
    skippedCached: 0,
    skippedNonStandard: 0,
    currentFileName: isLazer ? 'Escaneando armazenamento do osu!lazer...' : 'Escaneando pasta Songs do osu!...',
  });

  const scanRes = await fetch(scanEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(isLazer ? { lazerDir: songsDir } : { songsDir }),
    signal,
  });

  const scanJson = await scanRes.json();
  if (!scanRes.ok) {
    throw new Error(scanJson?.error || (isLazer ? 'Falha ao escanear a pasta do osu!lazer.' : 'Falha ao escanear a pasta Songs.'));
  }

  const entries: ScannedEntry[] = Array.isArray(scanJson.entries) ? scanJson.entries : [];
  const resolvedSongsDir: string = scanJson.lazerDir || scanJson.songsDir || songsDir || '';

  const existingLocalMapByPath = new Map<string, BeatmapAnalysisResult>();
  for (const m of existingMaps) {
    const isThisClient = isLazer
      ? m.origin === 'lazer' || m.localClient === 'lazer'
      : (m.origin === 'local_songs' && m.localClient !== 'lazer');
    if (isThisClient && m.localOsuPath) {
      existingLocalMapByPath.set(m.localOsuPath.toLowerCase(), m);
    }
  }

  const scannedPathSet = new Set(entries.map((e) => e.osuPath.toLowerCase()));
  const removedIds: string[] = [];
  for (const [pathLower, map] of existingLocalMapByPath.entries()) {
    if (!scannedPathSet.has(pathLower)) {
      removedIds.push(map.id);
    }
  }

  let skippedCached = 0;
  const toAnalyze: ScannedEntry[] = [];

  for (const entry of entries) {
    if (!forceReindex) {
      const existing = existingLocalMapByPath.get(entry.osuPath.toLowerCase());
      if (existing && existing.fileMtimeMs === entry.mtimeMs) {
        // If it's a lazer map and was previously saved without audio or without bg,
        // but now we have discovered localAudioPath or localBgPath, re-index to repair!
        const needsRepair =
          isLazer &&
          ((!existing.localAudioPath && Boolean(entry.localAudioPath)) ||
            (!existing.localBgPath && Boolean(entry.localBgPath)));
        if (!needsRepair) {
          skippedCached++;
          continue;
        }
      }
    }
    toAnalyze.push(entry);
  }

  if (removedIds.length > 0 && toAnalyze.length === 0) {
    await onCommitBatch([], removedIds);
  }

  if (toAnalyze.length === 0) {
    onProgress?.({
      phase: 'completed',
      processed: 0,
      totalToAnalyze: 0,
      totalDiscovered: entries.length,
      indexedStandard: 0,
      skippedCached,
      skippedNonStandard: 0,
      currentFileName: isLazer ? 'Biblioteca do osu!lazer já está 100% sincronizada!' : 'Biblioteca local já está 100% sincronizada!',
    });
    return {
      songsDir: resolvedSongsDir,
      client,
      indexedStandard: 0,
      skippedCached,
      skippedNonStandard: 0,
      totalDiscovered: entries.length,
      cancelled: false,
    };
  }

  const workers = createWorkerPool();
  const CHUNK_SIZE = 80;
  const COMMIT_THRESHOLD = 160;
  let pendingCommit: BeatmapAnalysisResult[] = [];
  let pendingRemovedIds = removedIds;
  let processed = 0;
  let indexedStandard = 0;
  let skippedNonStandard = 0;
  let cancelled = false;

  try {
    for (let offset = 0; offset < toAnalyze.length; offset += CHUNK_SIZE) {
      if (signal?.aborted) {
        cancelled = true;
        break;
      }

      const chunk = toAnalyze.slice(offset, offset + CHUNK_SIZE);
      onProgress?.({
        phase: 'indexing',
        processed,
        totalToAnalyze: toAnalyze.length,
        totalDiscovered: entries.length,
        indexedStandard,
        skippedCached,
        skippedNonStandard,
        currentFileName: chunk[0]?.folderName || chunk[0]?.fileName || 'Processando...',
      });

      const readRes = await fetch(readBatchEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: chunk.map((c) => ({ osuPath: c.osuPath, folderPath: c.folderPath })),
          lazerDir: isLazer ? resolvedSongsDir : undefined,
        }),
        signal,
      });

      if (!readRes.ok) {
        processed += chunk.length;
        continue;
      }

      const readJson = await readRes.json();
      const loadedFiles: Array<{
        osuPath: string;
        text: string;
        localAudioPath?: string;
        localBgPath?: string;
      }> = Array.isArray(readJson.files) ? readJson.files : [];

      const entryByPath = new Map(chunk.map((c) => [c.osuPath, c]));
      const workerInputs: WorkerAnalyzeFileInput[] = loadedFiles.map((lf) => {
        const meta = entryByPath.get(lf.osuPath);
        return {
          fileName: meta?.fileName || 'beatmap.osu',
          text: lf.text,
          folderName: meta?.folderName,
          lightweight: true,
          origin: isLazer ? 'lazer' : 'local_songs',
          localClient: isLazer ? 'lazer' : 'stable',
          localOsuPath: lf.osuPath,
          localAudioPath: lf.localAudioPath || meta?.localAudioPath,
          localBgPath: lf.localBgPath || meta?.localBgPath,
          fileMtimeMs: meta?.mtimeMs,
          skipNonStandard: true,
        };
      });

      if (workers.length > 0) {
        const perWorker = Math.ceil(workerInputs.length / workers.length);
        const tasks = workers.map((w, idx) => {
          const slice = workerInputs.slice(idx * perWorker, (idx + 1) * perWorker);
          return runAnalyzeBatchOnWorkerOrMain(w, slice);
        });
        const settled = await Promise.all(tasks);
        for (const s of settled) {
          pendingCommit.push(...s.results);
          indexedStandard += s.results.length;
          skippedNonStandard += s.skippedNonStandard;
        }
      } else {
        const single = await runAnalyzeBatchOnWorkerOrMain(null, workerInputs);
        pendingCommit.push(...single.results);
        indexedStandard += single.results.length;
        skippedNonStandard += single.skippedNonStandard;
      }

      processed += chunk.length;

      if (pendingCommit.length >= COMMIT_THRESHOLD) {
        const batchToSave = pendingCommit;
        const removals = pendingRemovedIds;
        pendingCommit = [];
        pendingRemovedIds = [];
        await onCommitBatch(batchToSave, removals.length > 0 ? removals : undefined);
      }

      onProgress?.({
        phase: 'indexing',
        processed,
        totalToAnalyze: toAnalyze.length,
        totalDiscovered: entries.length,
        indexedStandard,
        skippedCached,
        skippedNonStandard,
        currentFileName: chunk[chunk.length - 1]?.fileName || '',
      });
    }

    if (pendingCommit.length > 0 || pendingRemovedIds.length > 0) {
      await onCommitBatch(
        pendingCommit,
        pendingRemovedIds.length > 0 ? pendingRemovedIds : undefined
      );
    }

    onProgress?.({
      phase: cancelled ? 'cancelled' : 'completed',
      processed,
      totalToAnalyze: toAnalyze.length,
      totalDiscovered: entries.length,
      indexedStandard,
      skippedCached,
      skippedNonStandard,
      currentFileName: cancelled ? 'Sincronização pausada.' : 'Sincronização concluída!',
    });

    return {
      songsDir: resolvedSongsDir,
      client,
      indexedStandard,
      skippedCached,
      skippedNonStandard,
      totalDiscovered: entries.length,
      cancelled,
    };
  } finally {
    for (const w of workers) {
      try {
        w.terminate();
      } catch {}
    }
  }
}

/**
 * Memory-safe Browser Folder Picker fallback (`<input webkitdirectory>`) for static deployments.
 * Processes selected Songs/ directory files in rolling chunks of 50 so memory stays flat.
 */
export async function syncFromBrowserDirectoryFiles(options: {
  files: FileList | File[];
  signal?: AbortSignal;
  onProgress?: (progress: LocalLibrarySyncProgress) => void;
  onCommitBatch: (maps: BeatmapAnalysisResult[]) => Promise<void>;
}): Promise<{
  indexedStandard: number;
  skippedNonStandard: number;
  totalDiscovered: number;
  cancelled: boolean;
}> {
  const { files, signal, onProgress, onCommitBatch } = options;
  const allFiles = Array.from(files);
  const osuFiles = allFiles.filter((f) => f.name.toLowerCase().endsWith('.osu'));

  if (osuFiles.length === 0) {
    throw new Error('Nenhum arquivo .osu encontrado na pasta selecionada.');
  }

  const workers = createWorkerPool();
  const CHUNK_SIZE = 50;
  const COMMIT_THRESHOLD = 150;
  let pendingCommit: BeatmapAnalysisResult[] = [];
  let pendingTexts: CachedBeatmapText[] = [];
  let processed = 0;
  let indexedStandard = 0;
  let skippedNonStandard = 0;
  let cancelled = false;

  try {
    for (let offset = 0; offset < osuFiles.length; offset += CHUNK_SIZE) {
      if (signal?.aborted) {
        cancelled = true;
        break;
      }

      const slice = osuFiles.slice(offset, offset + CHUNK_SIZE);
      const workerInputs: WorkerAnalyzeFileInput[] = [];
      const rawTextByVirtualKey = new Map<string, string>();

      for (const file of slice) {
        const text = await file.text();
        const relPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
        const segments = relPath.replace(/\\/g, '/').split('/').filter(Boolean);
        const folderName = segments.length >= 2 ? segments[segments.length - 2] : undefined;
        rawTextByVirtualKey.set(`${folderName || ''}/${file.name}`, text);

        workerInputs.push({
          fileName: file.name,
          text,
          folderName,
          lightweight: true,
          origin: 'local_songs',
          fileMtimeMs: file.lastModified,
          skipNonStandard: true,
        });
      }

      if (workers.length > 0) {
        const perWorker = Math.ceil(workerInputs.length / workers.length);
        const settled = await Promise.all(
          workers.map((w, idx) =>
            runAnalyzeBatchOnWorkerOrMain(
              w,
              workerInputs.slice(idx * perWorker, (idx + 1) * perWorker)
            )
          )
        );
        for (const s of settled) {
          for (const r of s.results) {
            pendingCommit.push(r);
            // Match raw text for out-of-band IndexedDB visualizer cache
            for (const [k, txt] of rawTextByVirtualKey.entries()) {
              if (k.endsWith(`/${r.fileName}`)) {
                pendingTexts.push({ id: r.id, rawText: txt });
                break;
              }
            }
          }
          indexedStandard += s.results.length;
          skippedNonStandard += s.skippedNonStandard;
        }
      } else {
        const single = await runAnalyzeBatchOnWorkerOrMain(null, workerInputs);
        for (const r of single.results) {
          pendingCommit.push(r);
          for (const [k, txt] of rawTextByVirtualKey.entries()) {
            if (k.endsWith(`/${r.fileName}`)) {
              pendingTexts.push({ id: r.id, rawText: txt });
              break;
            }
          }
        }
        indexedStandard += single.results.length;
        skippedNonStandard += single.skippedNonStandard;
      }

      processed += slice.length;

      if (pendingCommit.length >= COMMIT_THRESHOLD) {
        const batch = pendingCommit;
        const texts = pendingTexts;
        pendingCommit = [];
        pendingTexts = [];
        try {
          await cacheBeatmapTexts(texts);
        } catch {}
        await onCommitBatch(batch);
      }

      onProgress?.({
        phase: 'indexing',
        processed,
        totalToAnalyze: osuFiles.length,
        totalDiscovered: osuFiles.length,
        indexedStandard,
        skippedCached: 0,
        skippedNonStandard,
        currentFileName: slice[slice.length - 1]?.name || '',
      });
    }

    if (pendingCommit.length > 0) {
      try {
        await cacheBeatmapTexts(pendingTexts);
      } catch {}
      await onCommitBatch(pendingCommit);
    }

    onProgress?.({
      phase: cancelled ? 'cancelled' : 'completed',
      processed,
      totalToAnalyze: osuFiles.length,
      totalDiscovered: osuFiles.length,
      indexedStandard,
      skippedCached: 0,
      skippedNonStandard,
      currentFileName: cancelled ? 'Importação pausada.' : 'Importação concluída!',
    });

    return {
      indexedStandard,
      skippedNonStandard,
      totalDiscovered: osuFiles.length,
      cancelled,
    };
  } finally {
    for (const w of workers) {
      try {
        w.terminate();
      } catch {}
    }
  }
}
