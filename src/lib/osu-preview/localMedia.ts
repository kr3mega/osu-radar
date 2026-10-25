import { BeatmapAnalysisResult } from '../../engine/types';
import { db, getCachedBeatmapText } from '../../db';
import { getOrReconstructBeatmapText } from './beatmap';

/**
 * Encodes a local disk path into a safe /api/local-songs/file URL,
 * escaping parentheses and quotes so it is 100% safe inside CSS url("...").
 */
export function getLocalSongFileUrl(filePath?: string): string | null {
  if (!filePath || !filePath.trim()) return null;
  const encoded = encodeURIComponent(filePath)
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/'/g, '%27');
  return `/api/local-songs/file?path=${encoded}`;
}

/**
 * Builds the CSS background image value (`--bg` / `--bg-2x`) for osu-web beatmap covers,
 * prioritizing instant local Songs background images with automatic fallback to ppy.sh CDN.
 */
export function buildBeatmapCoverCss(
  map: BeatmapAnalysisResult | null | undefined,
  variant: 'list' | 'list@2x' | 'card' | 'card@2x' | 'cover'
): string | undefined {
  if (!map) return undefined;
  const localUrl = getLocalSongFileUrl(map.localBgPath);
  const setId = map.metadata?.beatmapSetId;
  const officialUrl =
    setId && setId > 0
      ? `https://assets.ppy.sh/beatmaps/${setId}/covers/${variant}.jpg`
      : null;

  if (localUrl && officialUrl) {
    return `url("${localUrl}"), url("${officialUrl}")`;
  }
  if (localUrl) {
    return `url("${localUrl}")`;
  }
  if (officialUrl) {
    return `url("${officialUrl}")`;
  }
  return undefined;
}

/**
 * Lazily hydrates full .osu text on demand for lightweight indexed beatmaps
 * (either from the local Vite Songs disk bridge or out-of-band IndexedDB storage).
 */
export async function hydrateBeatmapRawText(map: BeatmapAnalysisResult): Promise<string> {
  if (map.rawText && typeof map.rawText === 'string' && map.rawText.length > 50) {
    return map.rawText;
  }

  if (map.localOsuPath) {
    const localUrl = getLocalSongFileUrl(map.localOsuPath);
    if (localUrl) {
      try {
        const res = await fetch(localUrl);
        if (res.ok) {
          const text = await res.text();
          if (text && text.length > 50) {
            return text;
          }
        }
      } catch {
        // Fallback to IndexedDB / reconstruction if local bridge is offline
      }
    }
  }

  try {
    const outOfBandText = await getCachedBeatmapText(map.id);
    if (outOfBandText && outOfBandText.length > 50) {
      return outOfBandText;
    }
  } catch {}

  try {
    const cached = await db.beatmaps.get(map.id);
    if (cached?.rawText && cached.rawText.length > 50) {
      return cached.rawText;
    }
  } catch {}

  return getOrReconstructBeatmapText(map);
}
