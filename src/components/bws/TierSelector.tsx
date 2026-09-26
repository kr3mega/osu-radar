import React from 'react';
import { usePoolStore } from '../../store/usePoolStore';
import { TournamentTier, TOURNAMENT_TIERS } from '../../engine/bws';
import { Award } from 'lucide-react';

export const TierSelector: React.FC = () => {
  const { tournamentTier, setTournamentTier } = usePoolStore();
  const currentConfig = TOURNAMENT_TIERS[tournamentTier];

  const tiers: TournamentTier[] = ['6digit', '5digit', '4digit', 'open_rank'];

  return (
    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-[#1a0c24] border border-white/10 text-xs">
      <div className="flex items-center gap-1.5 px-2 text-osu-pink font-bold">
        <Award className="w-3.5 h-3.5" />
        <span className="hidden sm:inline uppercase text-[10px] tracking-wider text-white/60">Tier:</span>
      </div>

      <div className="flex items-center gap-1">
        {tiers.map((tier) => {
          const config = TOURNAMENT_TIERS[tier];
          const isSelected = tournamentTier === tier;

          return (
            <button
              key={tier}
              type="button"
              onClick={() => setTournamentTier(tier)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-osu-pink text-white shadow-glowPink'
                  : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
              }`}
              title={`${config.label} (${config.rankRange})`}
            >
              {tier === '6digit' && '6-Digit'}
              {tier === '5digit' && '5-Digit'}
              {tier === '4digit' && '4-Digit'}
              {tier === 'open_rank' && 'Open / OWC'}
            </button>
          );
        })}
      </div>

      <span className="text-[10px] text-osu-cyan font-mono hidden md:inline ml-1">
        {currentConfig.rankRange}
      </span>
    </div>
  );
};
