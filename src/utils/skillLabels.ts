import { SkillAttributes } from '../engine/types';

export const ALL_SKILL_KEYS: Array<keyof SkillAttributes> = [
  'snapAim',
  'flowAim',
  'speed',
  'stamina',
  'fingerControl',
  'readingTech',
];

/**
 * Canonical UI display labels across the entire osu!radar interface.
 * Internal data key `snapAim` is globally presented as "Jump".
 */
export const SKILL_LABELS: Record<keyof SkillAttributes, string> = {
  snapAim: 'Jump',
  flowAim: 'Flow Aim',
  speed: 'Speed',
  stamina: 'Stamina',
  fingerControl: 'Finger Control',
  readingTech: 'Tech / Reading',
};

export const SKILL_SHORT_LABELS: Record<keyof SkillAttributes, string> = {
  snapAim: 'Jump',
  flowAim: 'Flow Aim',
  speed: 'Speed',
  stamina: 'Stamina',
  fingerControl: 'Finger Control',
  readingTech: 'Tech',
};

export const SKILL_ICONS: Record<keyof SkillAttributes, string> = {
  snapAim: 'fas fa-crosshairs',
  flowAim: 'fas fa-bezier-curve',
  speed: 'fas fa-bolt',
  stamina: 'fas fa-water',
  fingerControl: 'fas fa-drum',
  readingTech: 'fas fa-random',
};

export function formatSkillLabel(key: keyof SkillAttributes | string): string {
  if (key in SKILL_LABELS) {
    return SKILL_LABELS[key as keyof SkillAttributes];
  }
  return key;
}

/**
 * Checks whether a beatmap qualifies when one or more skills are prioritized.
 * Requires meaningful presence in every selected characteristic so multi-skill searches
 * (e.g. Jump + Finger Control) only surface genuine hybrid maps.
 */
export function matchesPrioritizedSkills(
  skills: SkillAttributes,
  prioritizedSkills: Array<keyof SkillAttributes>
): boolean {
  if (!prioritizedSkills || prioritizedSkills.length === 0) return true;
  const minThreshold = prioritizedSkills.length === 1 ? 12 : 10;
  for (let i = 0; i < prioritizedSkills.length; i++) {
    const val = skills[prioritizedSkills[i]] || 0;
    if (val < minThreshold) {
      return false;
    }
  }
  return true;
}

/**
 * Computes a combined synergy score (0–100) for one or multiple prioritized skills.
 * For 2+ skills, blends the geometric mean (70%, rewarding balanced co-occurrence of all
 * selected skills) with the arithmetic mean (30%, rewarding peak intensity).
 */
export function computeMultiSkillSynergy(
  skills: SkillAttributes,
  prioritizedSkills: Array<keyof SkillAttributes>
): number {
  if (!prioritizedSkills || prioritizedSkills.length === 0) return 0;
  if (prioritizedSkills.length === 1) {
    return Math.round((skills[prioritizedSkills[0]] || 0) * 10) / 10;
  }

  let product = 1;
  let sum = 0;
  const k = prioritizedSkills.length;

  for (let i = 0; i < k; i++) {
    const v = Math.max(0, skills[prioritizedSkills[i]] || 0);
    product *= v;
    sum += v;
  }

  const geoMean = product > 0 ? Math.pow(product, 1 / k) : 0;
  const arithMean = sum / k;
  const combined = 0.7 * geoMean + 0.3 * arithMean;

  return Math.round(combined * 10) / 10;
}
