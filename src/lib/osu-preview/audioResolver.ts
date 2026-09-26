import { unzipSync } from 'fflate';
import { BeatmapAnalysisResult } from '../../engine/types';
import { db } from '../../db';

export interface AudioResolveStatus {
  state: 'idle' | 'loading' | 'ready' | 'error';
  message: string;
}

/**
 * Resolves or downloads the full audio track for a beatmap.
 * 1. Uses existing memory/cached audioBlob or audioUrl.
 * 2. If missing, resolves beatmapSetId and downloads .osz from CORS mirror (Nerinyan).
 * 3. Extracts audio.mp3 / audio.ogg and caches it into IndexedDB.
 */
export async function resolveBeatmapAudio(
  map: BeatmapAnalysisResult,
  onStatusChange?: (status: AudioResolveStatus) => void
): Promise<Blob | undefined> {
  // 1. Existing audio blob
  if (map.audioBlob) {
    onStatusChange?.({ state: 'ready', message: 'Áudio carregado da memória' });
    return map.audioBlob;
  }

  // 2. Existing audio URL
  if (map.audioUrl) {
    try {
      const res = await fetch(map.audioUrl);
      if (res.ok) {
        const blob = await res.blob();
        map.audioBlob = blob;
        onStatusChange?.({ state: 'ready', message: 'Áudio pronto' });
        return blob;
      }
    } catch {}
  }

  // 3. Resolve beatmapSetId
  let setId = map.metadata.beatmapSetId;
  if (!setId || setId <= 0) {
    if (map.metadata.beatmapId && map.metadata.beatmapId > 0) {
      try {
        onStatusChange?.({ state: 'loading', message: 'Identificando beatmap...' });
        const searchRes = await fetch(
          `https://api.nerinyan.moe/search?q=${map.metadata.beatmapId}`
        );
        if (searchRes.ok) {
          const list = await searchRes.json();
          if (Array.isArray(list) && list.length > 0 && list[0].id) {
            setId = list[0].id;
          }
        }
      } catch (e) {
        console.warn('Could not resolve beatmapSetId from ID:', e);
      }
    }
  }

  // 4. Download .osz from mirror and extract audio
  if (setId && setId > 0) {
    try {
      onStatusChange?.({ state: 'loading', message: 'Baixando música do beatmap...' });
      const oszUrl = `https://api.nerinyan.moe/d/${setId}?noVideo=true`;
      const res = await fetch(oszUrl);
      if (res.ok) {
        onStatusChange?.({ state: 'loading', message: 'Processando áudio...' });
        const buf = new Uint8Array(await res.arrayBuffer());

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

        // Determine expected audio filename from beatmap text if present
        let targetAudioName = '';
        if (map.rawText) {
          const match = map.rawText.match(/AudioFilename\s*:\s*(.+)/i);
          if (match) targetAudioName = match[1].trim().toLowerCase();
        }

        // Find best audio match (prioritize targetAudioName, or largest mp3/ogg)
        let bestFile: { name: string; data: Uint8Array } | null = null;
        for (const [name, data] of Object.entries(unzipped)) {
          const lower = name.toLowerCase();
          if (targetAudioName && lower === targetAudioName) {
            bestFile = { name, data };
            break;
          }
          if (lower.endsWith('.mp3') || lower.endsWith('.ogg')) {
            if (!bestFile || data.length > bestFile.data.length) {
              bestFile = { name, data };
            }
          }
        }

        if (bestFile) {
          const lower = bestFile.name.toLowerCase();
          const mime = lower.endsWith('.ogg')
            ? 'audio/ogg'
            : lower.endsWith('.wav')
            ? 'audio/wav'
            : 'audio/mpeg';
          const blob = new Blob([bestFile.data as BlobPart], { type: mime });

          // Cache in map and IndexedDB
          map.audioBlob = blob;
          map.audioUrl = URL.createObjectURL(blob);
          try {
            await db.beatmaps.update(map.id, {
              audioBlob: blob,
              audioUrl: map.audioUrl,
            });
          } catch {}

          onStatusChange?.({ state: 'ready', message: 'Música carregada com sucesso' });
          return blob;
        }
      }
    } catch (err) {
      console.warn('Could not download audio from mirror:', err);
    }
  }

  onStatusChange?.({
    state: 'error',
    message: 'Áudio não encontrado no servidor. Você pode selecionar o arquivo .mp3 manualmente.',
  });
  return undefined;
}
