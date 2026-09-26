import React from 'react';
import { BeatmapAnalysisResult, SkillAttributes } from '../../engine/types';
import { getStarRatingColor, getStarRatingTextColor } from '../../utils/osuColors';
import { ModSlotBadge } from './ModSlotBadge';
import { StatHexagon } from '../charts/StatHexagon';
import { StrainTimeline } from '../charts/StrainTimeline';
import { formatTimestamp } from '../../engine/strains';
import { ExternalLink, Radio } from 'lucide-react';

interface LazerWedgeProps {
  map: BeatmapAnalysisResult | null;
  poolAverageSkills?: SkillAttributes;
  onSlotChange?: (id: string, newSlot: string) => void;
}

export const LazerWedge: React.FC<LazerWedgeProps> = ({
  map,
  poolAverageSkills,
  onSlotChange,
}) => {
  if (!map) {
    return (
      <div className="h-full bg-[#180e22]/90 border border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center backdrop-blur-md">
        <Radio className="w-12 h-12 text-osu-pink/40 animate-pulse mb-3" />
        <h3 className="text-base font-bold text-white uppercase tracking-wider">
          Nenhum mapa selecionado
        </h3>
        <p className="text-xs text-white/50 max-w-xs mt-1">
          Selecione um beatmap no carrossel à direita para carregar a telemetria física e a teia de atributos.
        </p>
      </div>
    );
  }

  const { metadata, stats, difficulty, skills, timeline, modSlot } = map;
  const coverUrl = metadata.beatmapSetId
    ? `https://assets.ppy.sh/beatmaps/${metadata.beatmapSetId}/covers/cover.jpg`
    : null;

  const starColor = getStarRatingColor(stats.starRating);
  const starTextColor = getStarRatingTextColor(stats.starRating);

  const modSlotOptions = [
    'NM1', 'NM2', 'NM3', 'NM4', 'NM5', 'NM6',
    'HD1', 'HD2', 'HD3',
    'HR1', 'HR2', 'HR3',
    'DT1', 'DT2', 'DT3', 'DT4',
    'FM1', 'FM2', 'FM3',
    'TB',
  ];

  return (
    <div className="flex flex-col gap-4 bg-[#180e22]/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Top Banner (Wedge Style with Cover Art) */}
      <div className="relative h-44 overflow-hidden bg-[#100717]">
        {coverUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 transition-transform duration-500 hover:scale-105"
            style={{ backgroundImage: `url(${coverUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-osu-surface to-osu-panel opacity-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#180e22] via-[#180e22]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#180e22] via-transparent to-transparent" />

        {/* Content over Cover */}
        <div className="absolute bottom-3 left-4 right-4 z-10 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <ModSlotBadge slot={modSlot} size="sm" />
              <span className="text-xs font-bold uppercase tracking-wider text-osu-pink truncate">
                {metadata.artist}
              </span>
              {metadata.beatmapId && (
                <a
                  href={`https://osu.ppy.sh/b/${metadata.beatmapId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-osu-cyan hover:underline flex items-center gap-0.5"
                  title="Abrir no site oficial do osu!"
                >
                  <span>#{metadata.beatmapId}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight truncate drop-shadow-md">
              {metadata.title}
            </h2>
            <p className="text-xs text-white/70 mt-0.5 truncate">
              <span className="text-osu-cyan font-bold">[{metadata.version}]</span> • Mapeado por{' '}
              <span className="text-white font-medium">{metadata.creator}</span>
            </p>
          </div>

          {/* Canonical Star Rating Pill (Official ppy/osu spectrum) */}
          <div
            className="flex-shrink-0 px-3 py-1 rounded-pill font-extrabold text-sm flex items-center gap-1.5 shadow-lg border border-black/30"
            style={{ backgroundColor: starColor, color: starTextColor }}
          >
            <span>★</span>
            <span className="font-mono">{stats.starRating.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Middle Controls & Metrics Bar */}
      <div className="px-4 flex flex-col gap-4">
        {/* Mod Slot Selector + Meters */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[#22132d] border border-white/5 text-xs">
          {/* Mod Slot Picker */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-white/50">Slot do Torneio:</span>
            {onSlotChange ? (
              <select
                value={modSlot || 'NM1'}
                onChange={(e) => onSlotChange(map.id, e.target.value)}
                className="px-2 py-0.5 rounded bg-[#160a1e] border border-osu-pink/40 text-white font-bold text-xs focus:outline-none focus:border-osu-pink"
              >
                {modSlotOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <ModSlotBadge slot={modSlot} size="sm" />
            )}
          </div>

          {/* Difficulty Meters */}
          <div className="flex items-center gap-3 font-mono text-[11px] text-white/80">
            <span>CS <strong className="text-white">{difficulty.cs.toFixed(1)}</strong></span>
            <span>AR <strong className="text-white">{difficulty.ar.toFixed(1)}</strong></span>
            <span>OD <strong className="text-white">{difficulty.od.toFixed(1)}</strong></span>
            <span>HP <strong className="text-white">{difficulty.hp.toFixed(1)}</strong></span>
            <span>BPM <strong className="text-white">{stats.bpmMode}</strong></span>
            <span>⏱ <strong className="text-white">{formatTimestamp(stats.drainTimeMs)}</strong></span>
          </div>
        </div>

        {/* Stat Hexagon (Radar) with Pool Comparison */}
        <div className="flex flex-col items-center bg-[#13081a]/80 p-4 rounded-xl border border-white/5">
          <div className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
            <span>Hexágono de Atributos (6 Eixos)</span>
            <span className="text-[10px] text-osu-pink font-mono">Top: {map.topSkills.join(' + ')}</span>
          </div>
          <StatHexagon
            skills={skills}
            comparisonSkills={poolAverageSkills}
            comparisonLabel="Média da Pool"
            size={270}
            showLegend={true}
          />
        </div>

        {/* Continuous Strain Timeline ("Eletrocardiograma") */}
        <div className="bg-[#13081a]/80 p-4 rounded-xl border border-white/5 mb-3">
          <StrainTimeline timeline={timeline} height={110} />
        </div>
      </div>
    </div>
  );
};
