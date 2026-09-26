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
      className={`group relative overflow-hidden rounded-r-lg border-y border-r transition-all duration-200 cursor-pointer select-none ${
        isSelected
          ? 'bg-[#291738] border-osu-pink -translate-x-3 shadow-glowPink ring-1 ring-osu-pink/60'
          : 'bg-[#1b0f24]/90 border-white/10 hover:border-osu-pink/40 hover:-translate-x-1 hover:bg-[#23132e]'
      }`}
      style={{
        borderLeftWidth: '6px',
        borderLeftColor: modColorConfig.bg,
      }}
    >
      {/* Background Cover Image with Gradient */}
      {coverUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 group-hover:opacity-35 transition-opacity"
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-r from-osu-surface to-transparent opacity-30" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[#190d23] via-[#190d23]/90 to-transparent" />

      {/* Card Content */}
      <div className="relative px-3 py-2.5 flex items-center justify-between gap-3 z-10">
        {/* Left Side: Mod Slot + Title + Artist */}
        <div className="min-w-0 flex items-center gap-2.5">
          {/* Mod Badge */}
          <span
            className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider flex-shrink-0 shadow-sm"
            style={{ backgroundColor: modColorConfig.bg, color: modColorConfig.text }}
          >
            {modSlot || 'NM1'}
          </span>

          {/* Song Info */}
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-white leading-tight truncate">
              {metadata.title}{' '}
              <span className="text-osu-cyan text-xs font-normal">
                [{metadata.version}]
              </span>
            </h4>
            <div className="flex items-center gap-2 text-[10px] text-white/50 mt-0.5">
              <span className="text-osu-pink font-semibold uppercase truncate">
                {metadata.artist}
              </span>
              <span>•</span>
              <span className="truncate">{metadata.creator}</span>
              <span>•</span>
              <span className="font-mono">{stats.bpmMode} BPM</span>
            </div>
          </div>
        </div>

        {/* Right Side: Skill Highlights + Canonical Star Rating Pill + Delete */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Dominant Skill Chips */}
          <div className="hidden sm:flex items-center gap-1">
            {topSkills.slice(0, 2).map((skillKey) => (
              <span
                key={skillKey}
                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#13071b]/90 border border-white/10 text-osu-cyan font-mono"
              >
                {skillKey}: {skills[skillKey].toFixed(0)}
              </span>
            ))}
          </div>

          {/* Star Rating Badge (ppy/osu Spectrum) */}
          <div
            className="px-2.5 py-0.5 rounded-pill font-extrabold text-xs flex items-center gap-1 shadow-sm border border-black/30"
            style={{ backgroundColor: starColor, color: starTextColor }}
          >
            <span className="text-[10px]">★</span>
            <span className="font-mono">{stats.starRating.toFixed(2)}</span>
          </div>

          {/* Remove Button */}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-red-400 transition-opacity ml-1"
              title="Remover mapa"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
