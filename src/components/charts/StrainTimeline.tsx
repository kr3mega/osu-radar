import React, { useState, useRef } from 'react';
import { StrainPoint } from '../../engine/types';

interface StrainTimelineProps {
  timeline: StrainPoint[];
  height?: number;
}

export const StrainTimeline: React.FC<StrainTimelineProps> = ({ timeline, height = 120 }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (timeline.length === 0) {
    return (
      <div className="h-28 flex items-center justify-center text-xs text-osu-text-muted">
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

  // Generate SVG path coordinates
  const points = timeline.map((pt, i) => {
    const x = (i / (count - 1 || 1)) * 100;
    const y = 100 - (pt.totalStrain / maxStrain) * 90; // Leave 10% headroom
    return `${x},${y}`;
  });

  const pathD = `M 0,100 L ${points.join(' L ')} L 100,100 Z`;
  const lineD = `M ${points.join(' L ')}`;

  const activePoint = hoverIndex !== null ? timeline[hoverIndex] : null;

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Header and Scrub Tooltip */}
      <div className="flex items-center justify-between text-xs text-osu-text-secondary px-1">
        <span className="font-semibold uppercase tracking-wider text-osu-text-muted text-[10px]">
          Dinâmica Temporal de Esforço (Eletrocardiograma)
        </span>
        {activePoint ? (
          <div className="flex items-center gap-3 font-mono text-[11px] bg-osu-surface px-2 py-0.5 rounded border border-osu-border">
            <span className="text-osu-cyan font-bold">⏱ {activePoint.timestamp}</span>
            <span className="text-osu-pink font-bold">Tensão: {activePoint.totalStrain}</span>
            <span className="text-white/60">
              (Aim: {(activePoint.snapStrain + activePoint.flowStrain).toFixed(1)} | Spd: {(activePoint.speedStrain + activePoint.staminaStrain).toFixed(1)} | Tech: {(activePoint.fingerStrain + activePoint.techStrain).toFixed(1)})
            </span>
          </div>
        ) : (
          <span className="text-osu-text-muted text-[11px]">Passe o cursor para inspecionar</span>
        )}
      </div>

      {/* SVG Canvas Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full bg-osu-base/80 border border-osu-border rounded-card overflow-hidden cursor-crosshair group"
        style={{ height }}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="strainGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff66aa" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#ff66aa" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#ff66aa" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background horizontal guide lines */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5" />

          {/* Area Fill */}
          <path d={pathD} fill="url(#strainGradient)" />

          {/* Stroke Line */}
          <path d={lineD} fill="none" stroke="#ff66aa" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Interactive Scrub Line */}
          {hoverIndex !== null && (
            <line
              x1={(hoverIndex / (count - 1 || 1)) * 100}
              y1="0"
              x2={(hoverIndex / (count - 1 || 1)) * 100}
              y2="100"
              stroke="#00d8ff"
              strokeWidth="0.8"
              strokeDasharray="2 2"
            />
          )}
        </svg>

        {/* Time stamps at bottom corners */}
        <div className="absolute bottom-1 left-2 text-[9px] font-mono text-osu-text-muted pointer-events-none">
          {timeline[0]?.timestamp || '00:00'}
        </div>
        <div className="absolute bottom-1 right-2 text-[9px] font-mono text-osu-text-muted pointer-events-none">
          {timeline[timeline.length - 1]?.timestamp || '00:00'}
        </div>
      </div>
    </div>
  );
};
