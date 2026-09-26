import Dexie, { type EntityTable } from 'dexie';
import { BeatmapAnalysisResult, Mappool } from '../engine/types';

// Dexie database for caching beatmaps and saved mappools offline
export const db = new Dexie('osuRadarDB') as Dexie & {
  beatmaps: EntityTable<BeatmapAnalysisResult, 'id'>;
  mappools: EntityTable<Mappool, 'id'>;
};

// Schema definition
db.version(1).stores({
  beatmaps: 'id, fileName, modSlot, calculatedAt',
  mappools: 'id, name, stage, createdAt, updatedAt',
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
 * Completely clears all cached beatmaps and mappools from IndexedDB.
 */
export async function clearAllData(): Promise<void> {
  await db.beatmaps.clear();
  await db.mappools.clear();
}

