import { BeatmapAnalysisResult, SkillAttributes } from './types';

export interface PlayerRoster {
  id: string;
  username: string;
  rank: number;
  badges: number;
  country: string;
  avatarUrl?: string;
  skills: SkillAttributes;
  consistencyScore: number; // 0 to 100
}

export interface TeamProfile {
  id: string;
  name: string;
  countryCode: string; // "BR", "US", etc.
  flag: string;        // "🇧🇷", "🇺🇸", etc.
  color: 'red' | 'blue';
  roster: PlayerRoster[];
  aggregatedSkills: SkillAttributes;
}

export interface MapConfrontation {
  mapId: string;
  modSlot: string;
  title: string;
  redWinProbability: number;  // 0% - 100%
  blueWinProbability: number; // 0% - 100%
  favoredTeam: 'red' | 'blue' | 'even';
  marginPercent: number;
  keyFactor: string;
  recommendedAction: 'ban_red' | 'ban_blue' | 'pick_red' | 'pick_blue' | 'neutral';
}

export interface MatchSimulationReport {
  teamRed: TeamProfile;
  teamBlue: TeamProfile;
  confrontations: MapConfrontation[];
  recommendedBansRed: string[];   // Slots that Red should ban against Blue
  recommendedBansBlue: string[];  // Slots that Blue should ban against Red
  recommendedPicksRed: string[];  // Strongest picks for Red
  recommendedPicksBlue: string[]; // Strongest picks for Blue
  predictedScoreBestOf: {
    format: string; // "Best of 11"
    redWins: number;
    blueWins: number;
    winner: 'red' | 'blue';
  };
}

/**
 * Computes average skills of a team roster.
 */
export function calculateTeamSkills(roster: PlayerRoster[]): SkillAttributes {
  if (roster.length === 0) {
    return { snapAim: 50, flowAim: 50, speed: 50, stamina: 50, fingerControl: 50, readingTech: 50 };
  }

  const result: SkillAttributes = {
    snapAim: 0,
    flowAim: 0,
    speed: 0,
    stamina: 0,
    fingerControl: 0,
    readingTech: 0,
  };

  for (const player of roster) {
    result.snapAim += player.skills.snapAim;
    result.flowAim += player.skills.flowAim;
    result.speed += player.skills.speed;
    result.stamina += player.skills.stamina;
    result.fingerControl += player.skills.fingerControl;
    result.readingTech += player.skills.readingTech;
  }

  const count = roster.length;
  (Object.keys(result) as Array<keyof SkillAttributes>).forEach((k) => {
    result[k] = Math.round((result[k] / count) * 10) / 10;
  });

  return result;
}

/**
 * Simulates head-to-head performance of Team Red vs Team Blue on a single beatmap.
 * Weights team skill vectors against the map's required physical strain vector.
 */
export function simulateMapConfrontation(
  map: BeatmapAnalysisResult,
  teamRed: TeamProfile,
  teamBlue: TeamProfile
): MapConfrontation {
  const mapSkills = map.skills;
  const redSkills = teamRed.aggregatedSkills;
  const blueSkills = teamBlue.aggregatedSkills;

  // Dot product of team skills weighted by map requirements
  let redPower = 0;
  let bluePower = 0;
  let totalMapWeight = 0;

  const skillKeys: Array<keyof SkillAttributes> = [
    'snapAim',
    'flowAim',
    'speed',
    'stamina',
    'fingerControl',
    'readingTech',
  ];

  let dominantAdvantageSkill: keyof SkillAttributes = 'snapAim';
  let maxSkillAdvantage = 0;
  let advantageTeam: 'red' | 'blue' = 'red';

  for (const key of skillKeys) {
    const mapWeight = Math.max(1, mapSkills[key]);
    totalMapWeight += mapWeight;

    // Team effective rating in this skill modulated by consistency
    const rScore = redSkills[key];
    const bScore = blueSkills[key];

    redPower += rScore * (mapWeight / 100);
    bluePower += bScore * (mapWeight / 100);

    const diff = (rScore - bScore) * (mapWeight / 100);
    if (Math.abs(diff) > maxSkillAdvantage) {
      maxSkillAdvantage = Math.abs(diff);
      dominantAdvantageSkill = key;
      advantageTeam = diff > 0 ? 'red' : 'blue';
    }
  }

  // Logistic win probability function
  const powerDiff = redPower - bluePower;
  // Scaled sigmoid: probability = 1 / (1 + e^(-k * diff))
  const redProbRaw = 1 / (1 + Math.exp(-0.045 * powerDiff));
  const redWinProbability = Math.round(redProbRaw * 100);
  const blueWinProbability = 100 - redWinProbability;

  const margin = Math.abs(redWinProbability - blueWinProbability);
  let favoredTeam: 'red' | 'blue' | 'even' = 'even';
  if (redWinProbability >= 54) favoredTeam = 'red';
  else if (blueWinProbability >= 54) favoredTeam = 'blue';

  const skillNameMap: Record<keyof SkillAttributes, string> = {
    snapAim: 'Snap Aim / Jumps',
    flowAim: 'Flow Aim',
    speed: 'Speed',
    stamina: 'Stamina',
    fingerControl: 'Finger Control',
    readingTech: 'Tech / Reading',
  };

  const keyFactor =
    margin >= 10
      ? `${advantageTeam === 'red' ? teamRed.name : teamBlue.name} tem vantagem decisiva no vetor de ${skillNameMap[dominantAdvantageSkill]}.`
      : 'Confronto equilibrado com margem estreita de ScoreV2.';

  let recommendedAction: MapConfrontation['recommendedAction'] = 'neutral';
  if (redWinProbability >= 66) recommendedAction = 'pick_red';
  else if (blueWinProbability >= 66) recommendedAction = 'pick_blue';
  else if (blueWinProbability >= 72) recommendedAction = 'ban_red';
  else if (redWinProbability >= 72) recommendedAction = 'ban_blue';

  return {
    mapId: map.id,
    modSlot: map.modSlot || 'NM1',
    title: map.metadata.title,
    redWinProbability,
    blueWinProbability,
    favoredTeam,
    marginPercent: margin,
    keyFactor,
    recommendedAction,
  };
}

/**
 * Runs a comprehensive tournament match simulation across the entire mappool.
 */
export function simulateFullMatch(
  maps: BeatmapAnalysisResult[],
  teamRed: TeamProfile,
  teamBlue: TeamProfile,
  bestOf: number = 11
): MatchSimulationReport {
  const confrontations: MapConfrontation[] = [];

  for (const map of maps) {
    const conf = simulateMapConfrontation(map, teamRed, teamBlue);
    confrontations.push(conf);
  }

  // Identify recommended bans:
  // Red should ban maps where Blue has the highest win probability
  const sortedByBlue = [...confrontations].sort((a, b) => b.blueWinProbability - a.blueWinProbability);
  const recommendedBansRed = sortedByBlue.slice(0, 2).map((c) => c.modSlot);

  // Blue should ban maps where Red has the highest win probability
  const sortedByRed = [...confrontations].sort((a, b) => b.redWinProbability - a.redWinProbability);
  const recommendedBansBlue = sortedByRed.slice(0, 2).map((c) => c.modSlot);

  // Recommended picks: Top maps not in opponent's auto-bans
  const recommendedPicksRed = sortedByRed
    .filter((c) => !recommendedBansBlue.includes(c.modSlot))
    .slice(0, 3)
    .map((c) => c.modSlot);

  const recommendedPicksBlue = sortedByBlue
    .filter((c) => !recommendedBansRed.includes(c.modSlot))
    .slice(0, 3)
    .map((c) => c.modSlot);

  // Best of X simulation
  const neededWins = Math.ceil(bestOf / 2);
  let redWins = 0;
  let blueWins = 0;

  for (const conf of confrontations) {
    if (conf.redWinProbability > 50) redWins++;
    else blueWins++;
    if (redWins >= neededWins || blueWins >= neededWins) break;
  }

  return {
    teamRed,
    teamBlue,
    confrontations,
    recommendedBansRed,
    recommendedBansBlue,
    recommendedPicksRed,
    recommendedPicksBlue,
    predictedScoreBestOf: {
      format: `Best of ${bestOf}`,
      redWins,
      blueWins,
      winner: redWins >= blueWins ? 'red' : 'blue',
    },
  };
}
