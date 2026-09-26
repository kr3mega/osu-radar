import React from 'react';
import { BeatmapAnalysisResult } from '../../engine/types';
import { getStarRatingColor, getStarRatingTextColor, TOURNAMENT_MOD_COLORS } from '../../utils/osuColors';
import { ChevronRight, Trash2 } from 'lucide-react';

export interface BeatmapSetGroup {
  key: string;
  beatmapSetId: number | null;
  title: string;
  artist: string;
  creator: string;
  coverUrl: string | null;
  minSr: number;
  maxSr: number;
  maps: BeatmapAnalysisResult[];
}

export function groupBeatmapsBySet(maps: BeatmapAnalysisResult[]): BeatmapSetGroup[] {
  const groupMap = new Map<string, BeatmapSetGroup>();

  for (const m of maps) {
    const setId = m.metadata.beatmapSetId && m.metadata.beatmapSetId > 0 ? m.metadata.beatmapSetId : null;
    const key = setId
      ? `set-${setId}`
      : `set-${m.metadata.artist.toLowerCase().trim()}-${m.metadata.title.toLowerCase().trim()}`;

    if (!groupMap.has(key)) {
      const coverUrl = setId
        ? `https://assets.ppy.sh/beatmaps/${setId}/covers/card.jpg`
        : null;

      groupMap.set(key, {
        key,
        beatmapSetId: setId,
        title: m.metadata.title,
        artist: m.metadata.artist,
        creator: m.metadata.creator,
        coverUrl,
        minSr: m.stats.starRating,
        maxSr: m.stats.starRating,
        maps: [m],
      });
    } else {
      const g = groupMap.get(key)!;
      g.maps.push(m);
      if (m.stats.starRating < g.minSr) g.minSr = m.stats.starRating;
      if (m.stats.starRating > g.maxSr) g.maxSr = m.stats.starRating;
    }
  }

  return Array.from(groupMap.values());
}

interface LazerCarouselSetProps {
  group: BeatmapSetGroup;
  isExpanded: boolean;
  selectedMapId: string | null;
  onToggleExpand: () => void;
  onSelectMap: (mapId: string) => void;
  onRemoveMap: (mapId: string) => void;
}

export const LazerCarouselSet: React.FC<LazerCarouselSetProps> = ({
  group,
  isExpanded,
  selectedMapId,
  onToggleExpand,
  onSelectMap,
  onRemoveMap,
}) => {
  const { title, artist, coverUrl, minSr, maxSr, maps } = group;
  const hasSelected = maps.some((m) => m.id === selectedMapId);

  // Group by SR to show the colored diff dots (like in official osu!lazer)
  const sortedMaps = [...maps].sort((a, b) => a.stats.starRating - b.stats.starRating);

  return (
    <div className="w-full max-w-full min-w-0 flex flex-col box-border">
      {/* 1. PARENT SET CARD (Compact Header ~44px) */}
      <div
        onClick={onToggleExpand}
        className={`group relative overflow-hidden rounded-lg border transition-all duration-150 cursor-pointer select-none flex items-center justify-between px-2.5 py-1.5 min-h-[44px] box-border ${
          isExpanded
            ? 'bg-[#251532] border-osu-cyan/60 shadow-md ring-1 ring-osu-cyan/40'
            : hasSelected
            ? 'bg-[#22132d] border-osu-pink/60 shadow-sm'
            : 'bg-[#190e22]/90 border-white/10 hover:border-white/20 hover:bg-[#20112b]'
        }`}
      >
        {/* Cover Background on the right with dark gradient overlay */}
        {coverUrl && (
          <div
            className="absolute inset-0 bg-cover bg-right opacity-25 group-hover:opacity-35 transition-opacity pointer-events-none"
            style={{ backgroundImage: `url(${coverUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#170c20] via-[#170c20]/90 to-transparent pointer-events-none" />

        {/* Left Side: Active Indicator Tab + Title + Artist + Diff Dots */}
        <div className="relative z-10 flex items-center gap-2 min-w-0 max-w-[70%]">
          {/* Lazer White/Cyan Arrow Indicator Tab */}
          {isExpanded ? (
            <div className="w-3.5 h-6 rounded-sm bg-osu-cyan flex items-center justify-center text-[#120819] font-black text-[10px] shrink-0 shadow-sm">
              <ChevronRight className="w-3 h-3 stroke-[3]" />
            </div>
          ) : (
            <div className="w-1.5 h-6 rounded-full bg-white/20 group-hover:bg-white/40 shrink-0 transition-colors" />
          )}

          {/* Song Meta */}
          <div className="min-w-0 flex flex-col justify-center">
            <h4 className="text-xs font-black text-white leading-tight truncate">
              {title}
            </h4>
            <div className="flex items-center gap-1.5 text-[10px] text-white/60 leading-tight mt-0.5 truncate">
              <span className="font-semibold text-white/80 truncate">{artist}</span>
              <span>•</span>
              <span className="text-osu-cyan/80 font-mono font-bold shrink-0">
                {maps.length} {maps.length === 1 ? 'diff' : 'diffs'}
              </span>
            </div>
          </div>

          {/* Lazer Colored Difficulty Dots (osu! spectrum dots) */}
          <div className="hidden sm:flex items-center gap-0.5 ml-1 shrink-0">
            {sortedMaps.slice(0, 10).map((m) => {
              const dotColor = getStarRatingColor(m.stats.starRating);
              const isDotActive = m.id === selectedMapId;
              return (
                <span
                  key={m.id}
                  className={`w-1.5 h-3 rounded-full transition-all ${
                    isDotActive ? 'ring-1 ring-white scale-125' : 'opacity-85'
                  }`}
                  style={{ backgroundColor: dotColor }}
                  title={`${m.metadata.version} (★ ${m.stats.starRating.toFixed(2)})`}
                />
              );
            })}
          </div>
        </div>

        {/* Right Side: Star Range Pill + Expand Icon */}
        <div className="relative z-10 flex items-center gap-2 shrink-0">
          {/* Star Range Badge */}
          <div className="px-2 py-0.5 rounded-full bg-black/50 border border-white/10 text-white font-mono text-[11px] font-bold flex items-center gap-1">
            <span className="text-yellow-400 text-[10px]">★</span>
            <span>
              {minSr === maxSr
                ? minSr.toFixed(2).replace('.', ',')
                : `${minSr.toFixed(2).replace('.', ',')} - ${maxSr.toFixed(2).replace('.', ',')}`}
            </span>
          </div>

          {/* Chevron expand/collapse */}
          <ChevronRight
            className={`w-4 h-4 text-white/60 transition-transform duration-200 ${
              isExpanded ? 'rotate-90 text-osu-cyan' : 'group-hover:translate-x-0.5'
            }`}
          />
        </div>
      </div>

      {/* 2. EXPANDED DIFFICULTY CARDS (Child Cards ~34px, strictly indented) */}
      {isExpanded && (
        <div className="w-full pl-3 pr-1 pt-1.5 pb-1 flex flex-col gap-1 box-border animate-in fade-in duration-150">
          {sortedMaps.map((map) => {
            const isMapSelected = map.id === selectedMapId;
            const starColor = getStarRatingColor(map.stats.starRating);
            const starTextColor = getStarRatingTextColor(map.stats.starRating);

            const modPrefix = (map.modSlot || 'NM').slice(0, 2).toUpperCase();
            const modColorConfig = TOURNAMENT_MOD_COLORS[modPrefix] || TOURNAMENT_MOD_COLORS.NM;

            return (
              <div
                key={map.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectMap(map.id);
                }}
                className={`group relative overflow-hidden rounded-md border transition-all duration-150 cursor-pointer select-none flex items-center justify-between px-2.5 py-1 min-h-[34px] box-border ${
                  isMapSelected
                    ? 'bg-[#2d183d] border-osu-pink shadow-glowPink ring-1 ring-osu-pink/60'
                    : 'bg-[#1b0f25]/95 border-white/10 hover:border-osu-pink/40 hover:bg-[#23132e]'
                }`}
                style={{
                  borderLeftWidth: '4px',
                  borderLeftColor: starColor,
                }}
              >
                {/* Left Side: Mod Badge + Version Name + Creator */}
                <div className="min-w-0 flex items-center gap-2 max-w-[65%]">
                  {/* Mod Slot Pill */}
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0 shadow-sm"
                    style={{ backgroundColor: modColorConfig.bg, color: modColorConfig.text }}
                  >
                    {map.modSlot || 'NM1'}
                  </span>

                  {/* Version Name + Creator */}
                  <div className="min-w-0 flex items-baseline gap-1.5 truncate">
                    <span className="text-xs font-bold text-white truncate">
                      {map.metadata.version}
                    </span>
                    <span className="text-[10px] text-white/40 truncate hidden sm:inline">
                      mapeado por {map.metadata.creator}
                    </span>
                  </div>
                </div>

                {/* Right Side: Skill Tags (Percentage Format) + Star Badge + Delete */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Dominant Skills in Percentage format: "63,5%" */}
                  <div className="hidden md:flex items-center gap-1">
                    {map.topSkills.slice(0, 2).map((skillKey) => (
                      <span
                        key={skillKey}
                        className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#110618]/90 border border-white/10 text-osu-cyan font-mono"
                      >
                        {skillKey}: {map.skills[skillKey].toFixed(1).replace('.', ',')}%
                      </span>
                    ))}
                  </div>

                  {/* Canonical Star Rating Pill */}
                  <div
                    className="px-2 py-0.5 rounded-full font-extrabold text-[11px] flex items-center gap-1 shadow-sm border border-black/30 shrink-0"
                    style={{ backgroundColor: starColor, color: starTextColor }}
                  >
                    <span className="text-[9px]">★</span>
                    <span className="font-mono">{map.stats.starRating.toFixed(2).replace('.', ',')}</span>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveMap(map.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-red-400 transition-opacity"
                    title="Remover dificuldade"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
