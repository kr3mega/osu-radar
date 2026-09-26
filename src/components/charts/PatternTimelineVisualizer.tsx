import React, { useState } from 'react';
import { DetectedPattern, PatternType, PatternSeverity } from '../../engine/patterns';
import { Copy, Check, Filter, Zap, Target, Waves, Activity } from 'lucide-react';

interface PatternTimelineVisualizerProps {
  patterns: DetectedPattern[];
  durationMs: number;
  onSelectTimestamp?: (timeMs: number, pattern?: DetectedPattern) => void;
}

const SEVERITY_BADGES: Record<PatternSeverity, { bg: string; text: string; border: string }> = {
  extreme: { bg: 'bg-red-500/20', text: 'text-red-400 font-extrabold', border: 'border-red-500/50' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400 font-bold', border: 'border-orange-500/50' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400 font-medium', border: 'border-yellow-500/40' },
  low: { bg: 'bg-cyan-500/15', text: 'text-cyan-300 font-normal', border: 'border-cyan-500/30' },
};

const PATTERN_ICONS: Record<PatternType, React.ReactNode> = {
  deathstream: <Waves className="w-3.5 h-3.5 text-osu-pink" />,
  stream: <Waves className="w-3.5 h-3.5 text-osu-cyan" />,
  spaced_stream: <Waves className="w-3.5 h-3.5 text-red-400" />,
  burst: <Activity className="w-3.5 h-3.5 text-osu-cyan" />,
  snap_jumps: <Target className="w-3.5 h-3.5 text-yellow-400" />,
  flow_aim: <Zap className="w-3.5 h-3.5 text-green-400" />,
  sv_spike: <Activity className="w-3.5 h-3.5 text-purple-400" />,
  rhythm_switch: <Filter className="w-3.5 h-3.5 text-blue-400" />,
  choke_point: <Zap className="w-3.5 h-3.5 text-red-500" />,
};

export const PatternTimelineVisualizer: React.FC<PatternTimelineVisualizerProps> = ({
  patterns,
  durationMs,
  onSelectTimestamp,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);

  const filtered = patterns.filter((p) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'STREAMS') return p.type === 'stream' || p.type === 'deathstream' || p.type === 'spaced_stream';
    if (filterType === 'JUMPS') return p.type === 'snap_jumps' || p.type === 'flow_aim';
    if (filterType === 'BURSTS') return p.type === 'burst';
    if (filterType === 'TECH') return p.type === 'sv_spike' || p.type === 'rhythm_switch';
    return true;
  });

  const handleCopyEditorTimestamp = async (p: DetectedPattern, e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(p.osuEditorTimestamp);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const maxDuration = Math.max(1000, durationMs);

  return (
    <div className="flex flex-col gap-3 w-full bg-[#14081c]/90 border border-white/10 rounded-xl p-4 backdrop-blur-md">
      {/* Header and Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-osu-pink" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Padrões Competitivos Detectados ({patterns.length})
          </h3>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1 text-[10px] font-bold uppercase flex-wrap">
          {['ALL', 'STREAMS', 'JUMPS', 'BURSTS', 'TECH'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterType(tab)}
              className={`px-2.5 py-0.5 rounded-full transition-all ${
                filterType === tab
                  ? 'bg-osu-pink text-white shadow-glowPink'
                  : 'bg-white/5 hover:bg-white/10 text-white/60'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Timeline Strip with Colored Pattern Bands */}
      <div className="relative w-full h-8 bg-[#0d0413] border border-white/10 rounded-lg overflow-hidden flex items-center">
        {patterns.map((p) => {
          const leftPercent = Math.min(100, Math.max(0, (p.startTimeMs / maxDuration) * 100));
          const widthPercent = Math.max(1.5, Math.min(100 - leftPercent, ((p.endTimeMs - p.startTimeMs) / maxDuration) * 100));

          let barColor = 'bg-osu-cyan';
          if (p.type === 'deathstream' || p.type === 'spaced_stream') barColor = 'bg-red-500';
          else if (p.type === 'snap_jumps') barColor = 'bg-yellow-400';
          else if (p.type === 'sv_spike') barColor = 'bg-purple-400';

          const isHighlight = selectedPatternId === p.id;

          return (
            <div
              key={p.id}
              onClick={() => {
                setSelectedPatternId(p.id);
                if (onSelectTimestamp) onSelectTimestamp(p.startTimeMs, p);
              }}
              style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
              className={`absolute h-5 rounded-sm cursor-pointer transition-all duration-150 ${barColor} ${
                isHighlight ? 'ring-2 ring-white scale-y-125 z-20' : 'opacity-70 hover:opacity-100 hover:scale-y-110 z-10'
              }`}
              title={`${p.label} [${p.startTimestamp}] — Clique para visualizar ao vivo`}
            />
          );
        })}
      </div>

      {/* Detected Patterns List */}
      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
        {filtered.length > 0 ? (
          filtered.map((p) => {
            const sev = SEVERITY_BADGES[p.severity];
            const isSelected = selectedPatternId === p.id;

            return (
              <div
                key={p.id}
                onClick={() => {
                  setSelectedPatternId(p.id);
                  if (onSelectTimestamp) onSelectTimestamp(p.startTimeMs, p);
                }}
                className={`p-2.5 rounded-lg border transition-all duration-150 flex items-start justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-[#291438] border-osu-pink shadow-glowPink ring-1 ring-osu-pink/60'
                    : 'bg-[#1b0d26]/80 hover:bg-[#231131] border-white/5 hover:border-white/20'
                }`}
              >
                {/* Left: Icon + Label + Description */}
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="p-1.5 rounded bg-black/40 border border-white/5 mt-0.5">
                    {PATTERN_ICONS[p.type] || <Activity className="w-3.5 h-3.5 text-osu-pink" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white truncate">{p.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] uppercase border ${sev.bg} ${sev.text} ${sev.border}`}
                      >
                        {p.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/60 mt-0.5 leading-snug">
                      {p.description}
                    </p>
                  </div>
                </div>

                {/* Right: Timestamp & Copy Editor format */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] font-mono text-osu-cyan font-bold bg-black/40 px-2 py-0.5 rounded border border-white/5">
                    ⏱ {p.startTimestamp}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => handleCopyEditorTimestamp(p, e)}
                    className="p-1 rounded bg-black/50 hover:bg-black/80 border border-white/10 hover:border-osu-pink text-white/70 hover:text-white transition-all text-[10px] font-mono flex items-center gap-1"
                    title="Copiar timestamp para o editor do osu!"
                  >
                    {copiedId === p.id ? (
                      <>
                        <Check className="w-3 h-3 text-green-400" />
                        <span className="text-green-400">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>{p.osuEditorTimestamp}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-6 text-center text-xs text-white/40">
            Nenhum padrão encontrado para o filtro selecionado.
          </div>
        )}
      </div>
    </div>
  );
};
