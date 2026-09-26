import { unzipSync } from 'fflate';
import { BeatmapAnalysisResult } from '../../engine/types';
import { db } from '../../db';

export interface AudioResolveStatus {
  state: 'idle' | 'loading' | 'ready' | 'error';
  message: string;
}

export interface AudioCacheStats {
  cachedCount: number;
  totalCount: number;
  totalBytes: number;
}

export interface SyncProgress {
  current: number;
  total: number;
  activeMapName?: string;
  totalBytes: number;
  isCompleted: boolean;
}

/**
 * Resolves the beatmapSetId for a beatmap using metadata, raw .osu text, or public mirrors.
 */
export async function resolveBeatmapSetId(map: BeatmapAnalysisResult): Promise<number | undefined> {
  // 1. Direct from metadata
  if (map.metadata.beatmapSetId && map.metadata.beatmapSetId > 0) {
    return map.metadata.beatmapSetId;
  }

  // 2. Extract from rawText if available
  if (map.rawText) {
    const setMatch = map.rawText.match(/BeatmapSetID\s*:\s*(\d+)/i);
    if (setMatch) {
      const parsed = parseInt(setMatch[1], 10);
      if (parsed > 0) {
        map.metadata.beatmapSetId = parsed;
        return parsed;
      }
    }
  }

  const beatmapId = map.metadata.beatmapId;
  if (beatmapId && beatmapId > 0) {
    // 3. Nerinyan exact beatmap ID lookup (?b=)
    try {
      const res = await fetch(`https://api.nerinyan.moe/search?b=${beatmapId}`, {
        headers: { 'User-Agent': 'osuRadar/2.0' },
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0 && json[0].id) {
          const setId = Number(json[0].id);
          map.metadata.beatmapSetId = setId;
          return setId;
        }
      }
    } catch {}

    // 4. Catboy v2 beatmap lookup
    try {
      const res = await fetch(`https://catboy.best/api/v2/b/${beatmapId}`, {
        headers: { 'User-Agent': 'osuRadar/2.0' },
      });
      if (res.ok) {
        const json = await res.json();
        const setId = json.beatmapset_id || json.set?.id;
        if (setId && Number(setId) > 0) {
          const parsed = Number(setId);
          map.metadata.beatmapSetId = parsed;
          return parsed;
        }
      }
    } catch {}

    // 5. osu.direct raw .osu fetch to read BeatmapSetID header
    try {
      const res = await fetch(`https://osu.direct/api/osu/${beatmapId}`, {
        headers: { 'User-Agent': 'osuRadar/2.0' },
      });
      if (res.ok) {
        const text = await res.text();
        const setMatch = text.match(/BeatmapSetID\s*:\s*(\d+)/i);
        if (setMatch) {
          const setId = parseInt(setMatch[1], 10);
          if (setId > 0) {
            map.metadata.beatmapSetId = setId;
            return setId;
          }
        }
      }
    } catch {}
  }

  // 6. Text query fallback by Artist and Title
  const query = `${map.metadata.artist || ''} ${map.metadata.title || ''}`.trim();
  if (query.length > 2) {
    try {
      const res = await fetch(`https://api.nerinyan.moe/search?q=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'osuRadar/2.0' },
      });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0 && list[0].id) {
          const setId = Number(list[0].id);
          map.metadata.beatmapSetId = setId;
          return setId;
        }
      }
    } catch {}
  }

  return undefined;
}

/**
 * Downloads a beatmap archive (.osz) from multi-mirror fallback and extracts the song audio file.
 */
export async function downloadBeatmapAudio(
  setId: number,
  expectedFilename?: string,
  onStatusChange?: (status: AudioResolveStatus) => void
): Promise<Blob | undefined> {
  const mirrors = [
    // Nerinyan noVideo is fastest and lightest
    { name: 'Nerinyan', url: `https://api.nerinyan.moe/d/${setId}?noVideo=true` },
    // Catboy mirror
    { name: 'Catboy', url: `https://catboy.best/d/${setId}` },
    // osu.direct fallback
    { name: 'osu.direct', url: `https://osu.direct/api/d/${setId}` },
  ];

  for (const mirror of mirrors) {
    try {
      onStatusChange?.({
        state: 'loading',
        message: `Baixando áudio (${mirror.name})...`,
      });

      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 25000);

      const res = await fetch(mirror.url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 osuRadar/2.0' },
      });
      clearTimeout(timeout);

      if (!res.ok) continue;

      onStatusChange?.({
        state: 'loading',
        message: 'Descompactando e processando música...',
      });

      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength < 5000) continue; // Invalid or corrupt

      const unzipped = unzipSync(buf, {
        filter: (f) => {
          const lower = f.name.toLowerCase();
          return (
            lower.endsWith('.mp3') ||
            lower.endsWith('.ogg') ||
            lower.endsWith('.wav')
          );
        },
      });

      const targetLower = expectedFilename ? expectedFilename.toLowerCase().trim() : '';
      let bestFile: { name: string; data: Uint8Array } | null = null;

      for (const [name, data] of Object.entries(unzipped)) {
        const lower = name.toLowerCase();
        if (targetLower && (lower === targetLower || lower.endsWith('/' + targetLower))) {
          bestFile = { name, data };
          break;
        }
        if (lower.endsWith('.mp3') || lower.endsWith('.ogg') || lower.endsWith('.wav')) {
          if (!bestFile || data.length > bestFile.data.length) {
            bestFile = { name, data };
          }
        }
      }

      if (bestFile && bestFile.data.length > 20000) {
        const lower = bestFile.name.toLowerCase();
        const mime = lower.endsWith('.ogg')
          ? 'audio/ogg'
          : lower.endsWith('.wav')
          ? 'audio/wav'
          : 'audio/mpeg';

        const blob = new Blob([bestFile.data as BlobPart], { type: mime });
        return blob;
      }
    } catch (err) {
      console.warn(`[audioResolver] Mirror ${mirror.name} failed for setId ${setId}:`, err);
    }
  }

  return undefined;
}

/**
 * Resolves or downloads the full audio track for a beatmap.
 * 1. Checks memory map.audioBlob.
 * 2. Checks IndexedDB cache (db.beatmaps).
 * 3. Resolves beatmapSetId via API mirrors.
 * 4. Downloads .osz, extracts audio.mp3, and permanently saves to IndexedDB.
 */
export async function resolveBeatmapAudio(
  map: BeatmapAnalysisResult,
  onStatusChange?: (status: AudioResolveStatus) => void
): Promise<Blob | undefined> {
  // 1. Existing in-memory audioBlob
  if (map.audioBlob && map.audioBlob instanceof Blob && map.audioBlob.size > 1000) {
    if (!map.audioUrl) {
      try {
        map.audioUrl = URL.createObjectURL(map.audioBlob);
      } catch {}
    }
    onStatusChange?.({ state: 'ready', message: 'Música carregada do cache' });
    return map.audioBlob;
  }

  // 2. Check IndexedDB persistent cache
  try {
    const cached = await db.beatmaps.get(map.id);
    if (cached?.audioBlob && cached.audioBlob instanceof Blob && cached.audioBlob.size > 1000) {
      map.audioBlob = cached.audioBlob;
      map.audioUrl = URL.createObjectURL(cached.audioBlob);
      onStatusChange?.({ state: 'ready', message: 'Música recuperada do cache local' });
      return cached.audioBlob;
    }
  } catch {}

  // 3. Existing audio URL
  if (map.audioUrl && !map.audioUrl.startsWith('blob:')) {
    try {
      const res = await fetch(map.audioUrl);
      if (res.ok) {
        const blob = await res.blob();
        map.audioBlob = blob;
        map.audioUrl = URL.createObjectURL(blob);
        try {
          await db.beatmaps.update(map.id, {
            audioBlob: blob,
            audioUrl: map.audioUrl,
          });
        } catch {}
        onStatusChange?.({ state: 'ready', message: 'Música pronta' });
        return blob;
      }
    } catch {}
  }

  // 4. Resolve BeatmapSetID
  onStatusChange?.({ state: 'loading', message: 'Identificando beatmap...' });
  const setId = await resolveBeatmapSetId(map);

  if (!setId || setId <= 0) {
    onStatusChange?.({
      state: 'error',
      message: 'Não foi possível identificar o pacote do beatmap nos servidores.',
    });
    return undefined;
  }

  // 5. Download audio from multi-mirror
  const targetAudio =
    map.metadata.audioFilename ||
    (map.rawText?.match(/AudioFilename\s*:\s*(.+)/i)?.[1]?.trim());

  const audioBlob = await downloadBeatmapAudio(setId, targetAudio, onStatusChange);

  if (audioBlob) {
    map.audioBlob = audioBlob;
    map.audioUrl = URL.createObjectURL(audioBlob);

    // Persist permanently into IndexedDB
    try {
      await db.beatmaps.update(map.id, {
        audioBlob,
        audioUrl: map.audioUrl,
        metadata: map.metadata,
      });
    } catch (e) {
      console.warn('Could not cache audioBlob in IndexedDB:', e);
    }

    onStatusChange?.({
      state: 'ready',
      message: 'Música carregada e sincronizada',
    });
    return audioBlob;
  }

  onStatusChange?.({
    state: 'error',
    message: 'Não foi possível baixar o áudio dos servidores online.',
  });
  return undefined;
}

/**
 * Calculates current audio cache statistics from IndexedDB.
 */
export async function getAudioCacheStats(): Promise<AudioCacheStats> {
  try {
    const all = await db.beatmaps.toArray();
    let cachedCount = 0;
    let totalBytes = 0;
    for (const m of all) {
      if (m.audioBlob && m.audioBlob instanceof Blob) {
        cachedCount++;
        totalBytes += m.audioBlob.size;
      }
    }
    return {
      cachedCount,
      totalCount: all.length,
      totalBytes,
    };
  } catch {
    return { cachedCount: 0, totalCount: 0, totalBytes: 0 };
  }
}

/**
 * Clears audio files from IndexedDB to reclaim disk space without deleting map analysis.
 */
export async function clearAudioCache(): Promise<void> {
  try {
    const all = await db.beatmaps.toArray();
    for (const m of all) {
      if (m.audioBlob || m.audioUrl) {
        if (m.audioUrl?.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(m.audioUrl);
          } catch {}
        }
        await db.beatmaps.update(m.id, {
          audioBlob: undefined,
          audioUrl: undefined,
        });
        m.audioBlob = undefined;
        m.audioUrl = undefined;
      }
    }
  } catch (err) {
    console.error('Error clearing audio cache:', err);
  }
}

/**
 * Background batch pre-fetcher for all beatmaps in the pool.
 * Downloads and caches song audio files one by one with polite rate limiting.
 */
export function startBackgroundPoolAudioSync(
  maps: BeatmapAnalysisResult[],
  onProgress?: (progress: SyncProgress) => void
): () => void {
  let isCancelled = false;

  (async () => {
    const missing = maps.filter((m) => !m.audioBlob);
    let totalBytes = 0;

    // First calculate already cached bytes
    for (const m of maps) {
      if (m.audioBlob instanceof Blob) {
        totalBytes += m.audioBlob.size;
      }
    }

    onProgress?.({
      current: maps.length - missing.length,
      total: maps.length,
      totalBytes,
      isCompleted: missing.length === 0,
    });

    if (missing.length === 0) return;

    for (let i = 0; i < missing.length; i++) {
      if (isCancelled) break;
      const map = missing[i];

      onProgress?.({
        current: maps.length - missing.length + i,
        total: maps.length,
        activeMapName: `${map.modSlot || 'NM'}: ${map.metadata.title}`,
        totalBytes,
        isCompleted: false,
      });

      try {
        const blob = await resolveBeatmapAudio(map);
        if (blob) {
          totalBytes += blob.size;
        }
      } catch (e) {
        console.warn('Batch audio sync failed for map:', map.metadata.title, e);
      }

      // Small 150ms delay between songs to avoid aggressive hammering
      await new Promise((r) => setTimeout(r, 150));
    }

    if (!isCancelled) {
      const finalCached = maps.filter((m) => m.audioBlob).length;
      onProgress?.({
        current: finalCached,
        total: maps.length,
        totalBytes,
        isCompleted: true,
      });
    }
  })();

  return () => {
    isCancelled = true;
  };
}
