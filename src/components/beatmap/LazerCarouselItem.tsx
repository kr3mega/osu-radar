import React from 'react';
import { BeatmapAnalysisResult } from '../../engine/types';
import { getStarRatingColor, getStarRatingTextColor, TOURNAMENT_MOD_COLORS } from '../../utils/osuColors';
import { Trash2 } from 'lucide-react';

interface LazerCarouselItemProps {
  map: BeatmapAnalysisResult;
  isSelected: boolean;
  onSelect: () => void;
  onRemove?: () => void;
}

export const LazerCarouselItem: React.FC<LazerCarouselItemProps> = ({
  map,
  isSelected,
  onSelect,
  onRemove,
}) => {
  const { metadata, stats, modSlot, topSkills, skills } = map;

  const coverUrl = metadata.beatmapSetId
    ? `https://assets.ppy.sh/beatmaps/${metadata.beatmapSetId}/covers/card.jpg`
    : null;

  const starColor = getStarRatingColor(stats.starRating);
  const starTextColor = getStarRatingTextColor(stats.starRating);

  const modPrefix = (modSlot || 'NM').slice(0, 2).toUpperCase();
  const modColorConfig = TOURNAMENT_MOD_COLORS[modPrefix] || TOURNAMENT_MOD_COLORS.NM;

  return (
    <div
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-xl border transition-all duration-150 cursor-pointer select-none min-h-[58px] box-border ${
        isSelected
          ? 'bg-[#2c163b] border-osu-pink shadow-[0_0_16px_rgba(255,102,170,0.35)] ring-1 ring-osu-pink/70'
          : 'bg-[#1a0e22]/90 border-white/10 hover:border-osu-pink/50 hover:bg-[#23122f]'
      }`}
      style={{
        borderLeftWidth: '5px',
        borderLeftColor: modColorConfig.bg,
      }}
    >
      {/* Background Cover Image with Gradient */}
      {coverUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none"
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-r from-osu-surface to-transparent opacity-25 pointer-events-none" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[#170a20] via-[#170a20]/90 to-transparent pointer-events-none" />

      {/* Card Content (Spacious 2-Row Flex Layout) */}
      <div className="relative px-3.5 py-2 flex items-center justify-between gap-3 z-10 w-full min-w-0 box-border">
        {/* Left Side: Mod Slot Badge + Song Title & Version + Artist & Creator */}
        <div className="min-w-0 flex items-center gap-3 flex-1 overflow-hidden">
          {/* Mod Badge */}
          <span
            className="px-2 py-1 rounded-md text-xs font-black uppercase tracking-wider shrink-0 shadow-sm"
            style={{ backgroundColor: modColorConfig.bg, color: modColorConfig.text }}
          >
            {modSlot || 'NM1'}
          </span>

          {/* Song & Difficulty Info */}
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            {/* Row 1: Title + [Diff] */}
            <div className="flex items-baseline gap-2 truncate">
              <h4 className="text-sm font-black text-white leading-snug truncate">
                {metadata.title}
              </h4>
              <span className="text-xs font-bold text-osu-cyan leading-snug truncate shrink-0">
                [{metadata.version}]
              </span>
            </div>

            {/* Row 2: Artist • Mapper • BPM */}
            <div className="flex items-center gap-2 text-[11px] text-white/50 leading-tight mt-0.5 truncate">
              <span className="font-semibold text-osu-pink/90 truncate">
                {metadata.artist}
              </span>
              <span>•</span>
              <span className="text-white/40 truncate hidden sm:inline">
                mapeado por {metadata.creator}
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="font-mono text-white/60 shrink-0">
                {stats.bpmMode} BPM
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Dominant Skill Chips + Star Rating Badge + Delete Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Dominant Skill Chips (Formatted with Brazilian Comma and Percentage: "63,5%") */}
          <div className="hidden md:flex items-center gap-1.5">
            {topSkills.slice(0, 2).map((skillKey) => (
              <span
                key={skillKey}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-black/60 border border-white/10 text-osu-cyan font-mono whitespace-nowrap"
              >
                {skillKey}: {skills[skillKey].toFixed(1).replace('.', ',')}%
              </span>
            ))}
          </div>

          {/* Star Rating Badge (ppy/osu Spectrum) */}
          <div
            className="px-2.5 py-1 rounded-full font-black text-xs flex items-center gap-1 shadow-md border border-black/30 shrink-0"
            style={{ backgroundColor: starColor, color: starTextColor }}
          >
            <span className="text-[10px]">★</span>
            <span className="font-mono">{stats.starRating.toFixed(2).replace('.', ',')}</span>
          </div>

          {/* Remove Button */}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-red-400 hover:bg-white/5 rounded transition-all shrink-0 ml-0.5"
              title="Remover mapa da pool"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
