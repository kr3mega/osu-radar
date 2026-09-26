import React, { useState, useRef } from 'react';
import { StrainPoint } from '../../engine/types';

interface StrainTimelineProps {
  timeline: StrainPoint[];
  height?: number;
}

export const StrainTimeline: React.FC<StrainTimelineProps> = ({
  timeline,
  height = 140,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (timeline.length === 0) {
    return (
      <div className="h-28 flex items-center justify-center text-xs text-white/40">
        Sem dados de timeline para este mapa
      </div>
    );
  }


  const maxStrain = Math.max(1, ...timeline.map((p) => p.totalStrain));
  const count = timeline.length;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const index = Math.min(count - 1, Math.floor((x / rect.width) * count));
    setHoverIndex(index);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activePoint = hoverIndex !== null ? timeline[hoverIndex] : null;

  return (
    <div className="w-full flex flex-col items-center bg-[#20262c] border border-[#2d353e] rounded-xl p-3 shadow-xl select-none">
      {/* Header: Pontos de Tensão */}
      <div className="w-full flex items-center justify-between px-1 mb-2">
        <h3 className="text-[13px] font-extrabold text-white tracking-wide">
          Pontos de Tensão
        </h3>

        {activePoint ? (
          <div className="flex items-center gap-2 font-mono text-[11px] bg-[#171c21] px-2.5 py-0.5 rounded border border-white/10 shadow-sm animate-in fade-in">
            <span className="text-osu-cyan font-bold">⏱ {activePoint.timestamp}</span>
            <span className="text-yellow-400 font-bold">
              Tensão: {activePoint.totalStrain.toFixed(1).replace('.', ',')}%
            </span>
            <span className="text-white/50 text-[10px] hidden sm:inline">
              (Aim: {(activePoint.snapStrain + activePoint.flowStrain).toFixed(1)} | Spd: {(activePoint.speedStrain + activePoint.staminaStrain).toFixed(1)})
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-white/40">
            Passe o mouse para inspecionar
          </span>
        )}
      </div>

      {/* 3. Bicolor Histogram Bar Chart (Orange = Fails, Yellow = Retries) */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full bg-[#1b2126] border border-[#2c333a] rounded-lg overflow-hidden cursor-crosshair group"
        style={{ height }}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          {/* Subtle horizontal grid lines */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.5" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.5" />

          {/* Stepped Histogram Bars */}
          {timeline.map((pt, i) => {
            const rawHeight = (pt.totalStrain / maxStrain) * 88;
            const barHeight = Math.max(pt.totalStrain > 0 ? 2.5 : 0, rawHeight);

            // Fail ratio (orange base: Aim strain & fatal choke sections)
            const failRatio = Math.min(
              0.80,
              Math.max(0.42, (pt.snapStrain + pt.flowStrain) / Math.max(0.1, pt.totalStrain))
            );
            const orangeHeight = barHeight * failRatio;
            const yellowHeight = Math.max(0, barHeight - orangeHeight);

            const barWidth = 100 / count;
            const x = (i / count) * 100;
            const isHovered = hoverIndex === i;

            return (
              <g key={i}>
                {/* Upper Yellow Bar (Retries / High Spikes) */}
                {yellowHeight > 0 && (
                  <rect
                    x={x}
                    y={100 - barHeight}
                    width={Math.max(0.4, barWidth - 0.15)}
                    height={yellowHeight}
                    fill={isHovered ? '#ffffff' : '#ffc400'}
                    className="transition-colors duration-75"
                  />
                )}
                {/* Lower Orange Bar (Fails / Fatal Strain) */}
                {orangeHeight > 0 && (
                  <rect
                    x={x}
                    y={100 - orangeHeight}
                    width={Math.max(0.4, barWidth - 0.15)}
                    height={orangeHeight}
                    fill={isHovered ? '#00e5ff' : '#cf5e00'}
                    className="transition-colors duration-75"
                  />
                )}
              </g>
            );
          })}

          {/* Interactive Scrub Line on hover */}
          {hoverIndex !== null && (
            <line
              x1={((hoverIndex + 0.5) / count) * 100}
              y1="0"
              x2={((hoverIndex + 0.5) / count) * 100}
              y2="100"
              stroke="#ffffff"
              strokeWidth="0.6"
              strokeDasharray="2 2"
            />
          )}
        </svg>

        {/* Start & End Timestamps on bottom corners */}
        <div className="absolute bottom-1 left-2 text-[9px] font-mono text-white/40 pointer-events-none">
          {timeline[0]?.timestamp || '00:00'}
        </div>
        <div className="absolute bottom-1 right-2 text-[9px] font-mono text-white/40 pointer-events-none">
          {timeline[timeline.length - 1]?.timestamp || '00:00'}
        </div>
      </div>
    </div>
  );
};
