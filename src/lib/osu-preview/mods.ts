import { OsuMod, PreviewBeatmap } from './types';
import { clamp } from './functions';

/**
 * Computes beatmap circle size (radius) and approach rate (preempt, fadein)
 * dynamically based on active mods, matching `computeMapProperties` from `osu_preview_extension`.
 */
export function computeMapProperties(
  beatmap: PreviewBeatmap,
  activeMods: Set<OsuMod>
): void {
  // 1. Circle Size & Radius (https://osu.ppy.sh/wiki/en/Beatmap/Circle_size)
  const isEZ = activeMods.has('ez');
  const isHR = activeMods.has('hr');
  const csMultiplier = isEZ ? 0.5 : isHR ? 1.3 : 1.0;
  const effectiveCS = clamp(0, beatmap.Difficulty.CircleSize * csMultiplier, 10);
  beatmap.radius = 54.4 - 4.48 * effectiveCS;

  // 2. Approach Rate (Preempt & FadeIn) (https://osu.ppy.sh/wiki/en/Beatmap/Approach_rate)
  const arMultiplier = isEZ ? 0.5 : isHR ? 1.4 : 1.0;
  const effectiveAR = clamp(0, beatmap.Difficulty.ApproachRate * arMultiplier, 10);
  if (effectiveAR < 5) {
    beatmap.preempt = 1200 + (600 * (5 - effectiveAR)) / 5;
    beatmap.fadein = 800 + (400 * (5 - effectiveAR)) / 5;
  } else if (effectiveAR === 5) {
    beatmap.preempt = 1200;
    beatmap.fadein = 800;
  } else {
    beatmap.preempt = 1200 - (750 * (effectiveAR - 5)) / 5;
    beatmap.fadein = 800 - (500 * (effectiveAR - 5)) / 5;
  }

  beatmap.fadeout = 233; // fadeout is constant
}

/**
 * Derives the effective playback speed multiplier according to active mods.
 * DT = 1.5x, HT = 0.75x, otherwise 1.0x.
 */
export function getPlaySpeed(activeMods: Set<OsuMod>): number {
  if (activeMods.has('dt')) return 1.5;
  if (activeMods.has('ht')) return 0.75;
  return 1.0;
}

/**
 * Toggles a mod on or off in activeMods with strict mutual exclusivity rules:
 * - EZ and HR are mutually exclusive
 * - DT and HT are mutually exclusive
 * Returns true if the mod was toggled ON, false if toggled OFF.
 */
export function toggleMod(activeMods: Set<OsuMod>, mod: OsuMod): boolean {
  let toggledOn: boolean;

  if (activeMods.has(mod)) {
    activeMods.delete(mod);
    toggledOn = false;
  } else {
    activeMods.add(mod);
    toggledOn = true;
  }

  switch (mod) {
    case 'ez':
      if (activeMods.has('hr')) activeMods.delete('hr');
      break;
    case 'hr':
      if (activeMods.has('ez')) activeMods.delete('ez');
      break;
    case 'ht':
      if (activeMods.has('dt')) activeMods.delete('dt');
      break;
    case 'dt':
      if (activeMods.has('ht')) activeMods.delete('ht');
      break;
  }

  return toggledOn;
}

/**
 * Sets a mod explicitly enabled or disabled in activeMods with mutual exclusivity.
 */
export function setMod(activeMods: Set<OsuMod>, mod: OsuMod, enabled: boolean): void {
  if (enabled) {
    switch (mod) {
      case 'ez':
        activeMods.delete('hr');
        break;
      case 'hr':
        activeMods.delete('ez');
        break;
      case 'ht':
        activeMods.delete('dt');
        break;
      case 'dt':
        activeMods.delete('ht');
        break;
    }
    activeMods.add(mod);
  } else {
    activeMods.delete(mod);
  }
}

/**
 * Derives default OsuMod from tournament slot name (e.g., "HR1" -> 'hr', "DT3" -> 'dt').
 */
export function getModFromSlot(modSlot?: string): OsuMod | null {
  if (!modSlot) return null;
  const upper = modSlot.toUpperCase().trim();
  if (upper.startsWith('HD')) return 'hd';
  if (upper.startsWith('HR')) return 'hr';
  if (upper.startsWith('DT') || upper.startsWith('NC')) return 'dt';
  if (upper.startsWith('EZ')) return 'ez';
  if (upper.startsWith('HT')) return 'ht';
  if (upper.startsWith('FL')) return 'fl';
  return null;
}

/**
 * Hard Rock flips the playfield vertically (Y axis from 0..384).
 */
export function transformOsuCoordY(y: number, isHardRock: boolean): number {
  return isHardRock ? 384 - y : y;
}
