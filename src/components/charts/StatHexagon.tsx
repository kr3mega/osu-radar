import React from 'react';
import { SkillAttributes } from '../../engine/types';

interface StatHexagonProps {
  skills: SkillAttributes;
  comparisonSkills?: SkillAttributes;
  comparisonLabel?: string;
  size?: number; // width & height in px
  showLegend?: boolean;
}

const AXES: Array<{ key: keyof SkillAttributes; label: string; desc: string }> = [
  { key: 'snapAim', label: 'Snap Aim', desc: 'Jumps agudos & desaceleração' },
  { key: 'flowAim', label: 'Flow Aim', desc: 'Curvatura & arcos contínuos' },
  { key: 'speed', label: 'Speed', desc: 'Frequência bruta de tapping' },
  { key: 'stamina', label: 'Stamina', desc: 'Resistência a streams longas' },
  { key: 'fingerControl', label: 'Finger Control', desc: 'Complexidade rítmica & alternância' },
  { key: 'readingTech', label: 'Tech / Reading', desc: 'Dinâmica de SV & sobreposição' },
];

export const StatHexagon: React.FC<StatHexagonProps> = ({
  skills,
  comparisonSkills,
  comparisonLabel = 'Média da Pool',
  size = 320,
  showLegend = true,
}) => {
  const center = size / 2;
  const radius = size * 0.38;
  const levels = [0.25, 0.5, 0.75, 1.0];

  // Helper to compute (x, y) for an axis index and normalized value [0, 100]
  const getCoordinates = (index: number, val: number, maxR: number = radius) => {
    // Start at top (-PI/2) and rotate clockwise by 60° (PI/3)
    const angle = -Math.PI / 2 + (index * Math.PI) / 3;
    const r = (Math.max(0, Math.min(100, val)) / 100) * maxR;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Build SVG polygon points string
  const mainPoints = AXES.map((axis, i) => {
    const pt = getCoordinates(i, skills[axis.key]);
    return `${pt.x},${pt.y}`;
  }).join(' ');

  const comparisonPoints = comparisonSkills
    ? AXES.map((axis, i) => {
        const pt = getCoordinates(i, comparisonSkills[axis.key]);
        return `${pt.x},${pt.y}`;
      }).join(' ')
    : '';

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible">
          {/* Concentric Hexagonal Grid Lines */}
          {levels.map((lvl) => {
            const gridPts = AXES.map((_, i) => {
              const pt = getCoordinates(i, lvl * 100);
              return `${pt.x},${pt.y}`;
            }).join(' ');
            return (
              <polygon
                key={lvl}
                points={gridPts}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth={lvl === 1.0 ? '1.5' : '1'}
                strokeDasharray={lvl === 1.0 ? 'none' : '3 3'}
              />
            );
          })}

          {/* Spokes (Axis Lines from center to outer ring) */}
          {AXES.map((_, i) => {
            const outer = getCoordinates(i, 100);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="1"
              />
            );
          })}

          {/* Comparison Polygon (Pool Average or Reference) */}
          {comparisonSkills && (
            <polygon
              points={comparisonPoints}
              fill="#00d8ff"
              fillOpacity="0.12"
              stroke="#00d8ff"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          )}

          {/* Main Skill Polygon */}
          <polygon
            points={mainPoints}
            fill="#ff66aa"
            fillOpacity="0.32"
            stroke="#ff66aa"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Vertex Node Points (Neon Cyan circles) */}
          {AXES.map((axis, i) => {
            const pt = getCoordinates(i, skills[axis.key]);
            return (
              <g key={axis.key}>
                <circle cx={pt.x} cy={pt.y} r="5" fill="#00d8ff" stroke="#221c29" strokeWidth="2" />
                <circle cx={pt.x} cy={pt.y} r="2" fill="#ffffff" />
              </g>
            );
          })}

          {/* Axis Labels */}
          {AXES.map((axis, i) => {
            const labelCoord = getCoordinates(i, 118);
            const val = skills[axis.key];
            return (
              <g key={axis.key} transform={`translate(${labelCoord.x}, ${labelCoord.y})`}>
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[11px] font-bold fill-osu-text-primary tracking-wide uppercase"
                >
                  {axis.label}
                </text>
                <text
                  y="12"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[10px] font-mono font-bold fill-osu-cyan"
                >
                  {val.toFixed(1)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Optional Legend and Attributes Breakdown */}
      {showLegend && (
        <div className="mt-4 w-full grid grid-cols-2 sm:grid-cols-3 gap-2 px-2">
          {AXES.map((axis) => {
            const score = skills[axis.key];
            return (
              <div
                key={axis.key}
                className="bg-osu-surface/60 border border-osu-border rounded-card p-2 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-osu-text-secondary font-medium">{axis.label}</span>
                  <span className="text-xs font-mono font-bold text-osu-pink">{score.toFixed(1)}</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-osu-base h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="bg-gradient-to-r from-osu-pink to-osu-cyan h-full rounded-full transition-all duration-300"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {comparisonSkills && (
        <div className="flex items-center gap-4 text-xs text-osu-text-muted mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-osu-pink/40 border border-osu-pink inline-block" />
            <span>Mapa Atual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-osu-cyan/20 border border-osu-cyan border-dashed inline-block" />
            <span>{comparisonLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
};
