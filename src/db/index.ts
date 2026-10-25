import Dexie, { type EntityTable } from 'dexie';
import { BeatmapAnalysisResult, Mappool } from '../engine/types';

export interface CachedBeatmapText {
  id: string;
  rawText: string;
}

// Dexie database for caching beatmaps and saved mappools offline
export const db = new Dexie('osuRadarDB') as Dexie & {
  beatmaps: EntityTable<BeatmapAnalysisResult, 'id'>;
  mappools: EntityTable<Mappool, 'id'>;
  beatmapTexts: EntityTable<CachedBeatmapText, 'id'>;
};

// Schema definition
db.version(1).stores({
  beatmaps: 'id, fileName, modSlot, calculatedAt',
  mappools: 'id, name, stage, createdAt, updatedAt',
});

db.version(2).stores({
  beatmaps: 'id, fileName, modSlot, origin, localOsuPath, calculatedAt',
  mappools: 'id, name, stage, createdAt, updatedAt',
  beatmapTexts: 'id',
});

/**
 * Cache an analyzed beatmap into IndexedDB.
 */
export async function cacheBeatmap(result: BeatmapAnalysisResult): Promise<void> {
  await db.beatmaps.put(result);
}

/**
 * Bulk cache analyzed beatmaps.
 */
export async function cacheBeatmaps(results: BeatmapAnalysisResult[]): Promise<void> {
  await db.beatmaps.bulkPut(results);
}

/**
 * Retrieve a cached beatmap by id.
 */
export async function getCachedBeatmap(id: string): Promise<BeatmapAnalysisResult | undefined> {
  return await db.beatmaps.get(id);
}

/**
 * Save a full mappool to IndexedDB.
 */
export async function saveMappool(pool: Mappool): Promise<void> {
  await db.mappools.put(pool);
}

/**
 * Load all saved mappools.
 */
export async function loadAllMappools(): Promise<Mappool[]> {
  return await db.mappools.toArray();
}

/**
 * Save out-of-band .osu texts (used for Browser Folder Picker local library mode so main RAM stays light).
 */
export async function cacheBeatmapTexts(entries: CachedBeatmapText[]): Promise<void> {
  if (entries.length === 0) return;
  await db.beatmapTexts.bulkPut(entries);
}

/**
 * Retrieve cached .osu text by beatmap id.
 */
export async function getCachedBeatmapText(id: string): Promise<string | undefined> {
  const row = await db.beatmapTexts.get(id);
  return row?.rawText;
}

/**
 * Removes only local_songs beatmaps from IndexedDB while keeping tournament mappools intact.
 */
export async function clearLocalSongsFromDb(): Promise<void> {
  const localIds = await db.beatmaps.where('origin').equals('local_songs').primaryKeys();
  if (localIds.length > 0) {
    await db.beatmaps.bulkDelete(localIds);
    await db.beatmapTexts.bulkDelete(localIds);
  }
}

/**
 * Completely clears all cached beatmaps and mappools from IndexedDB.
 */
export async function clearAllData(): Promise<void> {
  await db.beatmaps.clear();
  await db.mappools.clear();
  await db.beatmapTexts.clear();
}

