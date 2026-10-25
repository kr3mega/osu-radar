import React from 'react';
import { SkillAttributes } from '../../engine/types';
import { getSkillValue } from '../../utils/skillLabels';

export interface StatHexagonProps {
  skills: SkillAttributes;
  comparisonSkills?: SkillAttributes;
  comparisonLabel?: string;
  size?: number;
  showLegend?: boolean;
}

const SKILL_AXES: Array<{
  key: keyof SkillAttributes;
  label: string;
  desc: string;
  icon: string;
}> = [
  { key: 'snapAim', label: 'Jump', desc: 'Jumps agudos & mira brusca', icon: 'fas fa-crosshairs' },
  { key: 'flowAim', label: 'Flow Aim', desc: 'Movimentos contínuos & arcos fluídos', icon: 'fas fa-bezier-curve' },
  { key: 'speed', label: 'Speed', desc: 'Frequência bruta de tapping', icon: 'fas fa-bolt' },
  { key: 'stamina', label: 'Stamina', desc: 'Resistência a streams longas', icon: 'fas fa-water' },
  { key: 'stream', label: 'Stream', desc: 'Fluxo contínuo e volume de streams', icon: 'fas fa-wave-square' },
  { key: 'burst', label: 'Burst', desc: 'Sequências explosivas de 3 a 7 notas', icon: 'fas fa-fire' },
  { key: 'fingerControl', label: 'Finger Control', desc: 'Alternância e complexidade rítmica', icon: 'fas fa-drum' },
  { key: 'accuracy', label: 'Accuracy', desc: 'Exigência de precisão e janela de OD', icon: 'fas fa-bullseye' },
  { key: 'readingTech', label: 'Tech / Reading', desc: 'Velocidade de slider & sobreposições', icon: 'fas fa-random' },
];

/**
 * Skill Bar Chart - Gráfico moderno de barras para análise dimensional de beatmaps.
 * Inspirado no design nativo do osu! (cores pastéis e rosa padrão da interface).
 */
export const StatHexagon: React.FC<StatHexagonProps> = ({ skills }) => {
  return (
    <div className="osu-radar-skills-panel">
      {/* 9-Dimensional Skills Bar Grid */}
      <div className="osu-radar-skills-bars-grid">
        {SKILL_AXES.map((axis) => {
          const val = getSkillValue(skills, axis.key);

          return (
            <div key={axis.key} className="osu-radar-skill-card" title={axis.desc}>
              <div className="osu-radar-skill-card__header">
                <div className="osu-radar-skill-card__title">
                  <i className={axis.icon} />
                  <span>{axis.label}</span>
                </div>
                <div className="osu-radar-skill-card__values">
                  <span className="osu-radar-skill-card__score">
                    {val.toFixed(1).replace('.', ',')}%
                  </span>
                </div>
              </div>

              {/* Progress bar with standard solid osu! pink fill */}
              <div className="osu-radar-skill-bar">
                <div
                  className="osu-radar-skill-bar__fill"
                  style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
