import { Mappool, BeatmapAnalysisResult } from './types';
import { MatchSimulationReport } from './scouting';
import { TournamentTier, TOURNAMENT_TIERS } from './bws';
import { formatTimestamp } from './strains';

/**
 * Generates an analytical briefing for tournament casters and stream commentators.
 */
export function generateCasterBriefing(map: BeatmapAnalysisResult): {
  headline: string;
  keyStrains: string;
  dangerTimestamp: string;
  casterAdvice: string;
} {
  const topSkill = map.topSkills[0];
  const secondarySkill = map.topSkills[1];

  const skillTitles: Record<string, string> = {
    snapAim: 'Mira de Precisão (Snap Jumps)',
    flowAim: 'Flow Aim e Curvatura',
    speed: 'Velocidade Pura (High BPM)',
    stamina: 'Resistência Física (Deathstreams)',
    fingerControl: 'Controle Rítmico e Alternância',
    readingTech: 'Leitura Complexa e Slider Velocity',
  };

  const highestPattern = map.patterns && map.patterns.length > 0 ? map.patterns[0] : null;

  return {
    headline: `Slot ${map.modSlot || 'Custom'} — Foco em ${skillTitles[topSkill] || topSkill} e ${skillTitles[secondarySkill] || secondarySkill}`,
    keyStrains: `Star Rating: ★${map.stats.starRating.toFixed(2)} | BPM: ${map.stats.bpmMode} | Drain: ${formatTimestamp(map.stats.drainTimeMs)}`,
    dangerTimestamp: highestPattern
      ? `Atenção aos ${highestPattern.startTimestamp}: ${highestPattern.label} (${highestPattern.description})`
      : `Dificuldade distribuída homogeneamente ao longo dos ${formatTimestamp(map.stats.drainTimeMs)}.`,
    casterAdvice: `Ponto crítico de virada: jogadores com menor consistência costumam perder combo nos picos de aceleração angular. O time que mantiver o combo até a metade do mapa terá grande margem no ScoreV2.`,
  };
}

/**
 * Generates a Discord-ready formatted summary with markdown code blocks and emojis.
 */
export function generateDiscordMappoolSummary(
  pool: Mappool,
  tier: TournamentTier = 'open_rank'
): string {
  const tierConfig = TOURNAMENT_TIERS[tier];
  const maps = pool.maps;
  const count = maps.length;
  const avgSr = count > 0 ? (maps.reduce((s, m) => s + m.stats.starRating, 0) / count).toFixed(2) : '0.00';

  let text = `🏆 **${pool.name.toUpperCase()}** — ${pool.stage || 'Mappool Audit'}\n`;
  text += `🎯 **Tier**: ${tierConfig.label} (${tierConfig.rankRange})\n`;
  text += `📊 **Total de Mapas**: ${count} | **Média**: ★${avgSr}\n\n`;

  text += `\`\`\`yaml\n# DIAGNÓSTICO DOS SLOTS DE TORNEIO\n`;

  for (const m of maps) {
    const slot = (m.modSlot || 'NM1').padEnd(4, ' ');
    const sr = `★${m.stats.starRating.toFixed(2)}`.padEnd(6, ' ');
    const bpm = `${m.stats.bpmMode}BPM`.padEnd(7, ' ');
    const top = `${m.topSkills[0]} (${m.skills[m.topSkills[0]].toFixed(0)})`;
    const title = m.metadata.title.slice(0, 22).padEnd(22, ' ');
    text += `${slot} | ${sr} | ${bpm} | ${title} | ${top}\n`;
  }

  text += `\`\`\`\n`;
  text += `*Gerado automaticamente pelo osu!Radar — Inteligência Competitiva de Beatmaps*\n`;

  return text;
}

/**
 * Generates an analytical Match Scrim Report between two teams.
 */
export function generateMatchScrimReport(simulation: MatchSimulationReport): string {
  const { teamRed, teamBlue, confrontations, recommendedBansRed, recommendedBansBlue, predictedScoreBestOf } = simulation;

  let report = `# Relatório de Scouting e Confronto: ${teamRed.name} vs ${teamBlue.name}\n\n`;
  report += `**Previsão**: Vitória do **${predictedScoreBestOf.winner === 'red' ? teamRed.name : teamBlue.name}** (${predictedScoreBestOf.format}: ${predictedScoreBestOf.redWins} x ${predictedScoreBestOf.blueWins})\n\n`;

  report += `### 🛡️ Estratégia Recomendada de Bans\n`;
  report += `- **${teamRed.name}** deve banir: \`${recommendedBansRed.join(', ') || 'Nenhum'}\`\n`;
  report += `- **${teamBlue.name}** deve banir: \`${recommendedBansBlue.join(', ') || 'Nenhum'}\`\n\n`;

  report += `### ⚔️ Confrontos Diretos por Mapa\n\n`;
  report += `| Slot | Mapa | Chance ${teamRed.name} | Chance ${teamBlue.name} | Fator Chave |\n`;
  report += `| :--- | :--- | :---: | :---: | :--- |\n`;

  for (const c of confrontations) {
    report += `| **${c.modSlot}** | ${c.title} | ${c.redWinProbability}% | ${c.blueWinProbability}% | ${c.keyFactor} |\n`;
  }

  return report;
}
