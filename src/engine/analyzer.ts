import { BeatmapAnalysisResult, BeatmapStats, SkillAttributes } from './types';
import { parseOsuBeatmap } from './parser';
import { analyzeTemporalChannel } from './channels/temporal';
import { analyzeSpatialChannel } from './channels/spatial';
import { analyzeAngularChannel } from './channels/angular';
import { analyzeTechChannel } from './channels/tech';
import { calculateRollingStrains } from './strains';
import { detectBeatmapPatterns } from './patterns';
import { calculateStarRating } from './starRating';

/**
 * Calculates a fast 32-bit hash from string content for unique beatmap identification.
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Analyzes an .osu beatmap text and produces a comprehensive BeatmapAnalysisResult.
 * Can be run in both Main Thread and Web Worker contexts.
 */
export async function analyzeBeatmap(
  rawText: string,
  fileName: string = 'beatmap.osu',
  _fileBytes?: Uint8Array,
  officialStarRating?: number
): Promise<BeatmapAnalysisResult> {
  const parsed = parseOsuBeatmap(rawText);
  const { metadata, difficulty, timingPoints, hitObjects } = parsed;

  // 1. Calculate BPM statistics
  const uninheritedTps = timingPoints.filter((tp) => tp.uninherited && tp.beatLength > 0);
  const bpms = uninheritedTps.map((tp) => 60000 / tp.beatLength);
  const bpmMin = bpms.length > 0 ? Math.round(Math.min(...bpms)) : 120;
  const bpmMax = bpms.length > 0 ? Math.round(Math.max(...bpms)) : 120;
  const bpmMode = bpms.length > 0 ? Math.round(bpms[0]) : 120;

  // 2. Object Counts
  const circleCount = hitObjects.filter((o) => o.type === 'circle').length;
  const sliderCount = hitObjects.filter((o) => o.type === 'slider').length;
  const spinnerCount = hitObjects.filter((o) => o.type === 'spinner').length;
  const totalObjects = hitObjects.length;

  const firstTime = hitObjects.length > 0 ? hitObjects[0].time : 0;
  const lastTime = hitObjects.length > 0 ? hitObjects[hitObjects.length - 1].time : 0;
  const durationMs = Math.max(0, lastTime - firstTime);
  const drainTimeMs = durationMs; // Approximate drain time

  // 3. Estimate Max Combo (Circles + Sliders * (1 + repeats) + Spinners)
  let maxCombo = circleCount + spinnerCount;
  for (const obj of hitObjects) {
    if (obj.type === 'slider') {
      const repeats = obj.repeats || 1;
      maxCombo += 1 + repeats; // slider head, repeats, end
    }
  }

  // 4. Calculate canonical Star Rating
  // Priority: 1. Official tournament sheet SR if provided -> 2. Native TypeScript algorithm
  let calculatedStarRating = 0;
  if (officialStarRating && officialStarRating > 0) {
    calculatedStarRating = Math.round(officialStarRating * 100) / 100;
  } else {
    const srResult = calculateStarRating(hitObjects, difficulty, timingPoints);
    calculatedStarRating = srResult.starRating;
  }

  const stats: BeatmapStats = {
    bpmMin,
    bpmMax,
    bpmMode,
    durationMs,
    drainTimeMs,
    circleCount,
    sliderCount,
    spinnerCount,
    totalObjects,
    maxCombo,
    starRating: calculatedStarRating,
  };

  // 5. Run 4-Channel Kinematic & Strain Calculations
  analyzeTemporalChannel(hitObjects, timingPoints);
  analyzeSpatialChannel(hitObjects);
  analyzeAngularChannel(hitObjects);
  analyzeTechChannel(hitObjects, timingPoints, difficulty.ar);

  const { timeline, skills } = calculateRollingStrains(hitObjects, timingPoints, difficulty.ar);
  const patterns = detectBeatmapPatterns(hitObjects, timingPoints);

  // 6. Identify Top Skills (the 2 highest scoring attributes)
  const skillEntries = Object.entries(skills) as Array<[keyof SkillAttributes, number]>;
  skillEntries.sort((a, b) => b[1] - a[1]);
  const topSkills = [skillEntries[0][0], skillEntries[1][0]];

  // 7. Auto-detect Mod Slot from title/filename or tags (e.g. "NM1", "HD2", "TB")
  let modSlot: string | undefined;
  const matchSlot = (str: string): string | undefined => {
    const match = str.match(/\b(NM[1-9]|HD[1-9]|HR[1-9]|DT[1-9]|FM[1-9]|TB[1-9]?)\b/i);
    return match ? match[1].toUpperCase() : undefined;
  };

  modSlot = matchSlot(fileName) || matchSlot(metadata.version) || matchSlot(metadata.title);

  const id = metadata.beatmapId ? metadata.beatmapId.toString() : simpleHash(rawText);

  return {
    id,
    fileName,
    metadata,
    difficulty,
    stats,
    skills,
    timeline,
    patterns,
    hitObjects,
    topSkills,
    modSlot,
    calculatedAt: Date.now(),
  };
}
