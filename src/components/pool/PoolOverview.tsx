import React from 'react';
import { usePoolStore } from '../../store/usePoolStore';
import { SkillAttributes } from '../../engine/types';
import { StatHexagon } from '../charts/StatHexagon';
import { ModSlotBadge } from '../beatmap/ModSlotBadge';
import { getStarRatingColor, getStarRatingTextColor } from '../../utils/osuColors';

export const PoolOverview: React.FC = () => {
  const { currentPool, selectMap } = usePoolStore();
  const maps = currentPool.maps;

  if (maps.length === 0) return null;

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

  const avgSr = maps.reduce((sum, m) => sum + m.stats.starRating, 0) / count;
  const srBgColor = getStarRatingColor(avgSr);
  const srTextColor = getStarRatingTextColor(avgSr);
  const modCounts: Record<string, number> = {};
  maps.forEach((m) => {
    const prefix = m.modSlot?.slice(0, 2) || 'OUT';
    modCounts[prefix] = (modCounts[prefix] || 0) + 1;
  });

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
    snapAim: 'Jump',
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Summary Counters */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '15px',
          paddingBottom: '15px',
          borderBottom: '1px solid hsl(var(--hsl-b3))',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'hsl(var(--hsl-h1))',
              display: 'block',
            }}
          >
            Inteligência Competitiva de Mappool
          </span>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: '2px 0' }}>
            {currentPool.name}
          </h2>
          <p style={{ fontSize: '12px', color: 'hsl(var(--hsl-l2))', margin: 0 }}>
            {currentPool.stage || 'Visão Consolidada'} • {count} mapas analisados
          </p>
        </div>

        {/* Global Stats Badges using osu-web difficulty-badge and counters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              backgroundColor: 'hsl(var(--hsl-b5))',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: 'hsl(var(--hsl-l2))' }}>
              Média Star Rating
            </span>
            <div
              className="difficulty-badge"
              style={{
                '--bg': srBgColor,
                color: srTextColor,
              } as React.CSSProperties}
            >
              <span className="difficulty-badge__icon">
                <i className="fas fa-star" />
              </span>
              <span className="difficulty-badge__rating">{avgSr.toFixed(2)}</span>
            </div>
          </div>

          <div
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              backgroundColor: 'hsl(var(--hsl-b5))',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: 'hsl(var(--hsl-l2))' }}>
              Distribuição de Mods
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {Object.entries(modCounts).map(([mod, cnt]) => (
                <span
                  key={mod}
                  style={{
                    fontSize: '12px',
                    fontFamily: 'AzeretMono, monospace',
                    fontWeight: 700,
                    color: '#fff',
                  }}
                >
                  {mod}:{cnt}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Radar Hexagon da Pool + Detecção de Anomalias */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Left: Aggregated Pool Radar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '15px',
            backgroundColor: 'hsl(var(--hsl-b5))',
            borderRadius: '8px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'hsl(var(--hsl-l1))',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fas fa-chart-network" style={{ color: 'hsl(var(--hsl-h1))' }} />
            Hexágono de Atributos Médios da Pool
          </span>
          <StatHexagon skills={avgSkills} size={270} showLegend={true} />
        </div>

        {/* Right: Anomalias e Pontos Críticos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-exclamation-triangle" style={{ color: 'hsl(var(--hsl-h1))' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', margin: 0 }}>
              Detecção de Desbalanceamentos & Spikes
            </h3>
          </div>

          {anomalies.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {anomalies.slice(0, 5).map((anomaly, idx) => (
                <div
                  key={idx}
                  onClick={() => selectMap(anomaly.mapId)}
                  style={{
                    padding: '12px',
                    backgroundColor: 'hsl(var(--hsl-b5))',
                    borderLeft: '3px solid hsl(var(--hsl-h1))',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    cursor: 'pointer',
                  }}
                >
                  <i
                    className="fas fa-bolt"
                    style={{ color: 'hsl(var(--hsl-h1))', marginTop: '3px', flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ModSlotBadge slot={anomaly.slot} size="sm" />
                      <span
                        className="u-ellipsis-overflow"
                        style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}
                      >
                        {anomaly.title}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'hsl(var(--hsl-l2))', margin: '4px 0 0' }}>
                      {anomaly.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: '20px',
                backgroundColor: 'hsl(var(--hsl-b5))',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '12px',
                color: 'hsl(var(--hsl-l2))',
              }}
            >
              <i className="fas fa-check-circle" style={{ color: 'hsl(var(--hsl-lime-1))', fontSize: '18px', marginBottom: '6px', display: 'block' }} />
              Nenhum desbalanceamento extremo detectado. A curva de dificuldade dos mapas está harmonizada.
            </div>
          )}

          {/* Dica para Capitães */}
          <div
            style={{
              padding: '12px',
              borderRadius: '6px',
              backgroundColor: 'hsl(var(--hsl-b5))',
              borderLeft: '3px solid hsl(var(--hsl-blue-1))',
              fontSize: '12px',
              color: 'hsl(var(--hsl-l1))',
            }}
          >
            <strong style={{ color: 'hsl(var(--hsl-h1))' }}>Dica de Ban/Pick: </strong>
            Use os desvios percentuais acima para identificar mapas de contragolpe (<em>counter-pick</em>) contra times com histórico fraco no vetor destacado.
          </div>
        </div>
      </div>
    </div>
  );
};
