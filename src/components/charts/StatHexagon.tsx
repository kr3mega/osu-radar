import React from 'react';
import { SkillAttributes } from '../../engine/types';

interface StatHexagonProps {
  skills: SkillAttributes;
  comparisonSkills?: SkillAttributes;
  comparisonLabel?: string;
  size?: number;
  showLegend?: boolean;
}

const AXES: Array<{ key: keyof SkillAttributes; label: string; desc: string }> = [
  { key: 'snapAim', label: 'Jump', desc: 'Jumps agudos & desaceleração' },
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

  const getCoordinates = (index: number, val: number, maxR: number = radius) => {
    const angle = -Math.PI / 2 + (index * Math.PI) / 3;
    const r = (Math.max(0, Math.min(100, val)) / 100) * maxR;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ overflow: 'visible' }}>
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
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth={lvl === 1.0 ? '1.5' : '1'}
                strokeDasharray={lvl === 1.0 ? 'none' : '3 3'}
              />
            );
          })}

          {/* Spokes */}
          {AXES.map((_, i) => {
            const outer = getCoordinates(i, 100);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(255, 255, 255, 0.14)"
                strokeWidth="1"
              />
            );
          })}

          {/* Comparison Polygon */}
          {comparisonSkills && (
            <polygon
              points={comparisonPoints}
              fill="hsl(var(--hsl-blue-1))"
              fillOpacity="0.14"
              stroke="hsl(var(--hsl-blue-1))"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          )}

          {/* Main Skill Polygon */}
          <polygon
            points={mainPoints}
            fill="hsl(var(--hsl-h1))"
            fillOpacity="0.32"
            stroke="hsl(var(--hsl-h1))"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Vertex Node Points */}
          {AXES.map((axis, i) => {
            const pt = getCoordinates(i, skills[axis.key]);
            return (
              <g key={axis.key}>
                <circle cx={pt.x} cy={pt.y} r="5" fill="hsl(var(--hsl-blue-1))" stroke="hsl(var(--hsl-b5))" strokeWidth="2" />
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
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    fill: '#ffffff',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {axis.label}
                </text>
                <text
                  y="13"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontSize: '10px',
                    fontFamily: 'AzeretMono, monospace',
                    fontWeight: 700,
                    fill: 'hsl(var(--hsl-h1))',
                  }}
                >
                  {val.toFixed(1).replace('.', ',')}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Optional Legend and Attributes Breakdown using osu-web .bar */}
      {showLegend && (
        <div
          style={{
            marginTop: '14px',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '8px',
          }}
        >
          {AXES.map((axis) => {
            const score = skills[axis.key];
            return (
              <div
                key={axis.key}
                style={{
                  backgroundColor: 'hsl(var(--hsl-b4))',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'hsl(var(--hsl-l1))' }}>
                    {axis.label}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: 'AzeretMono, monospace',
                      fontWeight: 700,
                      color: 'hsl(var(--hsl-h1))',
                    }}
                  >
                    {score.toFixed(1).replace('.', ',')}%
                  </span>
                </div>
                <div className="bar bar--beatmap-stats" style={{ width: '100%' }}>
                  <div
                    className="bar__fill"
                    style={{
                      width: `${Math.min(100, Math.max(0, score))}%`,
                      backgroundColor: 'hsl(var(--hsl-h1))',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {comparisonSkills && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '11px',
            color: 'hsl(var(--hsl-l2))',
            marginTop: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                backgroundColor: 'hsla(var(--hsl-h1), 0.4)',
                border: '1px solid hsl(var(--hsl-h1))',
                display: 'inline-block',
              }}
            />
            <span>Mapa Atual</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                backgroundColor: 'hsla(var(--hsl-blue-1), 0.25)',
                border: '1px dashed hsl(var(--hsl-blue-1))',
                display: 'inline-block',
              }}
            />
            <span>{comparisonLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
};
