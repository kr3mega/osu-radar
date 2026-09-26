import { SkillAttributes } from './types';

export type TournamentTier = '6digit' | '5digit' | '4digit' | 'open_rank';

export interface TierConfig {
  id: TournamentTier;
  label: string;
  rankRange: string;
  referenceMax: {
    snapAim: number;
    flowAim: number;
    speed: number;
    stamina: number;
    fingerControl: number;
    readingTech: number;
  };
  expectedBpmRange: [number, number];
  expectedStarRatingRange: [number, number];
}

export const TOURNAMENT_TIERS: Record<TournamentTier, TierConfig> = {
  '6digit': {
    id: '6digit',
    label: '6-Digit Cup',
    rankRange: '#100.000 — #999.000',
    referenceMax: {
      snapAim: 160,
      flowAim: 130,
      speed: 120,
      stamina: 140,
      fingerControl: 90,
      readingTech: 100,
    },
    expectedBpmRange: [160, 200],
    expectedStarRatingRange: [4.2, 5.3],
  },
  '5digit': {
    id: '5digit',
    label: '5-Digit Championship',
    rankRange: '#10.000 — #99.999',
    referenceMax: {
      snapAim: 220,
      flowAim: 180,
      speed: 170,
      stamina: 200,
      fingerControl: 130,
      readingTech: 150,
    },
    expectedBpmRange: [180, 230],
    expectedStarRatingRange: [5.2, 6.4],
  },
  '4digit': {
    id: '4digit',
    label: '4-Digit Masters',
    rankRange: '#1.000 — #9.999',
    referenceMax: {
      snapAim: 280,
      flowAim: 230,
      speed: 220,
      stamina: 250,
      fingerControl: 170,
      readingTech: 190,
    },
    expectedBpmRange: [200, 260],
    expectedStarRatingRange: [6.2, 7.3],
  },
  'open_rank': {
    id: 'open_rank',
    label: 'Open Rank / World Cup (OWC)',
    rankRange: '#1 — #999',
    referenceMax: {
      snapAim: 350,
      flowAim: 290,
      speed: 280,
      stamina: 320,
      fingerControl: 220,
      readingTech: 240,
    },
    expectedBpmRange: [220, 300],
    expectedStarRatingRange: [6.8, 8.5],
  },
};

/**
 * Calculates Badge-Weighted Seeding (BWS):
 * BWS = rank^(0.9937^(badges^2))
 */
export function calculateBWS(rank: number, badges: number): number {
  if (rank <= 0) return 1;
  if (badges <= 0) return rank;
  const exponent = Math.pow(0.9937, badges * badges);
  const bws = Math.pow(rank, exponent);
  return Math.max(1, Math.round(bws));
}

/**
 * Recalibrates a skill attribute vector based on the target tournament rank tier.
 * This scales the 0-100 radar so that tournament organizers see relative difficulty for their specific tier!
 */
export function calibrateSkillsForTier(
  rawSkills: SkillAttributes,
  sourceTier: TournamentTier = 'open_rank',
  targetTier: TournamentTier = 'open_rank'
): SkillAttributes {
  if (sourceTier === targetTier) return rawSkills;

  const srcConfig = TOURNAMENT_TIERS[sourceTier].referenceMax;
  const tgtConfig = TOURNAMENT_TIERS[targetTier].referenceMax;

  const result: SkillAttributes = { ...rawSkills };
  const keys: Array<keyof SkillAttributes> = [
    'snapAim',
    'flowAim',
    'speed',
    'stamina',
    'fingerControl',
    'readingTech',
  ];

  for (const k of keys) {
    // Reverse normalized score back to raw, then apply target tier reference
    const scaleRatio = srcConfig[k] / tgtConfig[k];
    const rescaled = rawSkills[k] * scaleRatio;
    result[k] = Math.min(100, Math.max(0, Math.round(rescaled * 10) / 10));
  }

  return result;
}

/**
 * Screening heuristic to detect potential derankers or suspicious accounts.
 */
export function evaluateAccountDeranking(
  rank: number,
  badges: number,
  tournamentTier: TournamentTier
): { isSuspicious: boolean; reason?: string; bws: number } {
  const bws = calculateBWS(rank, badges);
  const tierConfig = TOURNAMENT_TIERS[tournamentTier];

  if (tournamentTier === '6digit' && bws < 80000) {
    return {
      isSuspicious: true,
      reason: `Seed BWS (#${bws.toLocaleString()}) ultrapassa o limite superior de ${tierConfig.label} devido a ${badges} badge(s) de torneio.`,
      bws,
    };
  }

  if (tournamentTier === '5digit' && bws < 8000) {
    return {
      isSuspicious: true,
      reason: `Seed BWS (#${bws.toLocaleString()}) ultrapassa o teto de ${tierConfig.label} devido a ${badges} badge(s) competitiva(s).`,
      bws,
    };
  }

  return { isSuspicious: false, bws };
}
