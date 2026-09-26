import React from 'react';
import { BeatmapAnalysisResult } from '../../engine/types';
import { ModSlotBadge } from './ModSlotBadge';
import { formatTimestamp } from '../../engine/strains';
import { Trash2 } from 'lucide-react';

interface BeatmapCardProps {
  map: BeatmapAnalysisResult;
  isSelected?: boolean;
  onSelect: () => void;
  onRemove?: () => void;
  onSlotChange?: (newSlot: string) => void;
}

const SKILL_LABELS: Record<string, string> = {
  snapAim: 'Snap Aim',
  flowAim: 'Flow Aim',
  speed: 'Speed',
  stamina: 'Stamina',
  fingerControl: 'Finger Ctrl',
  readingTech: 'Tech/Read',
};

export const BeatmapCard: React.FC<BeatmapCardProps> = ({
  map,
  isSelected = false,
  onSelect,
  onRemove,
  onSlotChange,
}) => {
  const { metadata, stats, difficulty, modSlot, topSkills, skills } = map;

  const coverUrl = metadata.beatmapSetId
    ? `https://assets.ppy.sh/beatmaps/${metadata.beatmapSetId}/covers/card.jpg`
    : null;

  return (
    <div
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-card bg-osu-panel border transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-osu-pink shadow-glowPink ring-1 ring-osu-pink/50'
          : 'border-white/5 hover:border-osu-pink/40 hover:bg-osu-hover/40 shadow-card'
      }`}
    >
      {/* Background with Beatmap Cover Image & Dark Gradient Overlay */}
      {coverUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 group-hover:opacity-35 transition-opacity duration-300"
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-osu-surface to-osu-panel opacity-40" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-osu-panel via-osu-panel/90 to-transparent" />

      {/* Card Content */}
      <div className="relative p-3.5 flex flex-col justify-between z-10 gap-2.5">
        {/* Top Row: Mod Slot + Title & Artist + Star Rating */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            {/* Mod Slot Badge */}
            {onSlotChange ? (
              <input
                type="text"
                value={modSlot || 'NM1'}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onSlotChange(e.target.value)}
                maxLength={4}
                className="w-12 text-center text-xs font-bold uppercase rounded-pill bg-osu-surface border border-osu-border text-white focus:outline-none focus:border-osu-pink"
                title="Clique para editar o slot do mod (ex: NM1, HD2, TB)"
              />
            ) : (
              <ModSlotBadge slot={modSlot} size="sm" />
            )}

            {/* Title & Difficulty */}
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-osu-pink uppercase tracking-wider block truncate">
                {metadata.artist}
              </span>
              <h3 className="text-sm font-bold text-white leading-snug truncate">
                {metadata.title}{' '}
                <span className="text-osu-text-secondary text-xs font-normal">
                  [{metadata.version}]
                </span>
              </h3>
              <p className="text-[10px] text-osu-text-muted mt-0.5">
                Mapeado por <span className="text-osu-text-secondary">{metadata.creator}</span>
              </p>
            </div>
          </div>

          {/* Star Rating Badge */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="px-2 py-0.5 bg-yellow-500/15 border border-yellow-500/40 rounded-pill text-yellow-400 font-bold text-xs flex items-center gap-1 shadow-sm">
              <span className="text-[11px]">★</span>
              <span>{stats.starRating.toFixed(2)}</span>
            </div>

            {onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-osu-text-muted hover:text-red-400 transition-opacity"
                title="Remover mapa da pool"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: Stats & Top Skill Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px]">
          {/* Beatmap Stats */}
          <div className="flex items-center gap-2 text-osu-text-muted font-mono">
            <span>CS {difficulty.cs.toFixed(1)}</span>
            <span>AR {difficulty.ar.toFixed(1)}</span>
            <span>OD {difficulty.od.toFixed(1)}</span>
            <span>{stats.bpmMode} BPM</span>
            <span>⏱ {formatTimestamp(stats.drainTimeMs)}</span>
          </div>

          {/* Top Skill Badges */}
          <div className="flex items-center gap-1.5">
            {topSkills.map((skillKey) => {
              const score = skills[skillKey];
              return (
                <span
                  key={skillKey}
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-osu-surface/80 border border-osu-border text-osu-cyan"
                >
                  {SKILL_LABELS[skillKey] || skillKey}: {score.toFixed(0)}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
