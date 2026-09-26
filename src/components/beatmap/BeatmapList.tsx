import React from 'react';
import { usePoolStore, getFilteredAndSortedMaps, SortOption } from '../../store/usePoolStore';
import { BeatmapCard } from './BeatmapCard';
import { Search, SlidersHorizontal, Music } from 'lucide-react';

const MOD_FILTERS = ['ALL', 'NM', 'HD', 'HR', 'DT', 'FM', 'TB'];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'slot', label: 'Slot do Mod (NM1 → TB)' },
  { value: 'sr', label: 'Star Rating (★ Decrescente)' },
  { value: 'bpm', label: 'BPM' },
  { value: 'snapAim', label: 'Snap Aim' },
  { value: 'flowAim', label: 'Flow Aim' },
  { value: 'speed', label: 'Speed' },
  { value: 'stamina', label: 'Stamina' },
  { value: 'fingerControl', label: 'Finger Control' },
  { value: 'readingTech', label: 'Tech / Reading' },
];

export const BeatmapList: React.FC = () => {
  const {
    currentPool,
    selectedMapId,
    filterMod,
    searchQuery,
    sortBy,
    selectMap,
    removeBeatmap,
    updateModSlot,
    setFilterMod,
    setSearchQuery,
    setSortBy,
  } = usePoolStore();

  const filteredMaps = getFilteredAndSortedMaps(
    currentPool.maps,
    filterMod,
    searchQuery,
    sortBy
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Filters and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-osu-panel border border-osu-border rounded-card shadow-card">
        {/* Mod Category Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {MOD_FILTERS.map((mod) => {
            const count =
              mod === 'ALL'
                ? currentPool.maps.length
                : currentPool.maps.filter((m) => m.modSlot?.startsWith(mod)).length;

            const isActive = filterMod === mod;

            return (
              <button
                key={mod}
                type="button"
                onClick={() => setFilterMod(mod)}
                className={`px-3 py-1 rounded-pill text-xs font-bold uppercase transition-all duration-150 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-osu-pink text-white shadow-glowPink'
                    : 'bg-osu-surface hover:bg-osu-hover text-osu-text-secondary border border-osu-border'
                }`}
              >
                <span>{mod}</span>
                <span className={`text-[10px] ${isActive ? 'text-white/80' : 'text-osu-text-muted'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-osu-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar mapa, artista, diff..."
              className="pl-8 pr-3 py-1 text-xs rounded bg-osu-surface border border-osu-border text-white placeholder-osu-text-muted focus:outline-none focus:border-osu-pink w-48 sm:w-56"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 bg-osu-surface border border-osu-border rounded px-2.5 py-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-osu-cyan" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-osu-panel text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Beatmaps Grid */}
      {filteredMaps.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredMaps.map((map) => (
            <BeatmapCard
              key={map.id}
              map={map}
              isSelected={selectedMapId === map.id}
              onSelect={() => selectMap(map.id)}
              onRemove={() => removeBeatmap(map.id)}
              onSlotChange={(newSlot) => updateModSlot(map.id, newSlot)}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 bg-osu-panel/60 border border-dashed border-white/10 rounded-card flex flex-col items-center justify-center text-center gap-3 text-osu-text-muted">
          <Music className="w-8 h-8 text-osu-pink opacity-40" />
          <p className="text-sm font-medium text-white">Nenhum beatmap na visualização atual</p>
          <p className="text-xs max-w-sm">
            Arraste arquivos .osu ou pacotes .osz no painel de upload acima, ou clique em &ldquo;Carregar Demos&rdquo; na barra superior para começar.
          </p>
        </div>
      )}
    </div>
  );
};
