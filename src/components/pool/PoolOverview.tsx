import React from 'react';
import { usePoolStore } from '../../store/usePoolStore';
import { SkillAttributes } from '../../engine/types';
import { StatHexagon } from '../charts/StatHexagon';
import { AlertTriangle, Zap, ShieldAlert, TrendingUp } from 'lucide-react';
import { ModSlotBadge } from '../beatmap/ModSlotBadge';

export const PoolOverview: React.FC = () => {
  const { currentPool, selectMap } = usePoolStore();
  const maps = currentPool.maps;

  if (maps.length === 0) return null;

  // Compute average skills across the entire pool
  const avgSkills: SkillAttributes = {
    snapAim: 0,
    flowAim: 0,
    speed: 0,
    stamina: 0,
    fingerControl: 0,
    readingTech: 0,
  };

  for (const m of maps) {
    avgSkills.snapAim += m.skills.snapAim;
    avgSkills.flowAim += m.skills.flowAim;
    avgSkills.speed += m.skills.speed;
    avgSkills.stamina += m.skills.stamina;
    avgSkills.fingerControl += m.skills.fingerControl;
    avgSkills.readingTech += m.skills.readingTech;
  }

  const count = maps.length;
  (Object.keys(avgSkills) as Array<keyof SkillAttributes>).forEach((k) => {
    avgSkills[k] = Math.round((avgSkills[k] / count) * 10) / 10;
  });

  // Calculate pool metrics: Average Star Rating, total duration, mod counts
  const avgSr = maps.reduce((sum, m) => sum + m.stats.starRating, 0) / count;
  const modCounts: Record<string, number> = {};
  maps.forEach((m) => {
    const prefix = m.modSlot?.slice(0, 2) || 'OUT';
    modCounts[prefix] = (modCounts[prefix] || 0) + 1;
  });

  // Anomaly Detection: Detect maps with skill score > 1.4x the pool average or notable spikes
  interface Anomaly {
    mapId: string;
    slot: string;
    title: string;
    attribute: string;
    mapValue: number;
    avgValue: number;
    ratio: number;
    description: string;
  }

  const anomalies: Anomaly[] = [];
  const skillNames: Record<keyof SkillAttributes, string> = {
    snapAim: 'Snap Aim',
    flowAim: 'Flow Aim',
    speed: 'Speed',
    stamina: 'Stamina',
    fingerControl: 'Finger Control',
    readingTech: 'Tech / Reading',
  };

  for (const m of maps) {
    for (const [key, label] of Object.entries(skillNames) as Array<[keyof SkillAttributes, string]>) {
      const val = m.skills[key];
      const avg = avgSkills[key];
      if (avg >= 20 && val > avg * 1.45 && val >= 55) {
        const ratio = Math.round(((val - avg) / avg) * 100);
        anomalies.push({
          mapId: m.id,
          slot: m.modSlot || 'MAP',
          title: m.metadata.title,
          attribute: label,
          mapValue: val,
          avgValue: avg,
          ratio,
          description: `O slot ${m.modSlot || 'escolhido'} possui ${ratio}% a mais de exigência em ${label} do que a média geral da pool (${val.toFixed(1).replace('.', ',')}% vs ${avg.toFixed(1).replace('.', ',')}%).`,
        });
      }
    }
  }

  return (
    <div className="bg-osu-panel border border-osu-border rounded-card p-5 flex flex-col gap-6 shadow-card">
      {/* Header and Summary Counters */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-osu-pink">
            Inteligência Competitiva de Mappool
          </span>
          <h2 className="text-xl font-bold text-white leading-tight">
            {currentPool.name}
          </h2>
          <p className="text-xs text-osu-text-secondary mt-0.5">
            {currentPool.stage || 'Visão Consolidada'} • {count} mapas analisados
          </p>
        </div>

        {/* Global Stats Badges */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-card bg-osu-surface border border-osu-border flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-osu-text-muted">Média Star Rating</span>
            <span className="text-sm font-bold text-yellow-400">★ {avgSr.toFixed(2)}</span>
          </div>

          <div className="px-3 py-1.5 rounded-card bg-osu-surface border border-osu-border flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-osu-text-muted">Distribuição de Mods</span>
            <div className="flex items-center gap-1 mt-0.5">
              {Object.entries(modCounts).map(([mod, cnt]) => (
                <span key={mod} className="text-xs font-mono font-bold text-osu-text-primary">
                  {mod}:{cnt}{' '}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Radar Hexagon da Pool + Detecção de Anomalias */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Aggregated Pool Radar */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center p-3 bg-osu-base/40 rounded-card border border-white/5">
          <span className="text-xs font-bold uppercase tracking-wider text-osu-text-secondary mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-osu-cyan" />
            Hexágono de Atributos Médios da Pool
          </span>
          <StatHexagon skills={avgSkills} size={280} showLegend={true} />
        </div>

        {/* Right: Anomalias e Pontos Críticos */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-osu-pink" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Detecção de Desbalanceamentos & Spikes
            </h3>
          </div>

          {anomalies.length > 0 ? (
            <div className="flex flex-col gap-2 max-h-[290px] overflow-y-auto pr-1">
              {anomalies.slice(0, 5).map((anomaly, idx) => (
                <div
                  key={idx}
                  onClick={() => selectMap(anomaly.mapId)}
                  className="p-3 bg-osu-surface/90 hover:bg-osu-hover border border-osu-pink/20 hover:border-osu-pink/50 rounded-card flex items-start gap-3 cursor-pointer transition-all duration-150"
                >
                  <AlertTriangle className="w-4 h-4 text-osu-pink flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <ModSlotBadge slot={anomaly.slot} size="sm" />
                      <span className="text-xs font-bold text-white truncate">{anomaly.title}</span>
                    </div>
                    <p className="text-xs text-osu-text-secondary mt-1 leading-snug">
                      {anomaly.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-osu-surface/40 border border-osu-border rounded-card text-center text-xs text-osu-text-muted flex flex-col items-center gap-2">
              <Zap className="w-5 h-5 text-osu-cyan" />
              <span>Nenhum desbalanceamento extremo detectado. A curva de dificuldade dos mapas está harmonizada.</span>
            </div>
          )}

          {/* Dica para Capitães */}
          <div className="p-3 rounded-card bg-osu-pink/10 border border-osu-pink/20 text-[11px] text-osu-text-secondary flex items-start gap-2 mt-1">
            <span className="text-osu-pink font-bold">💡 Dica de Ban/Pick:</span>
            <span>
              Use os desvios percentuais acima para identificar mapas de contragolpe (*counter-pick*) contra times com histórico fraco no vetor destacado.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
