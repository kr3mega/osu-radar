import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  usePoolStore,
  getFilteredAndSortedMaps,
  getBeatmapSetGroupKey,
  groupBeatmapsBySong,
  SortOption,
  countActiveTrainingFilters,
} from './store/usePoolStore';
import { useSkinStore } from './store/useSkinStore';
import { LazerToolbar } from './components/layout/LazerToolbar';
import { ElectronTitlebar } from './components/layout/ElectronTitlebar';
import { LazerBottomBar } from './components/layout/LazerBottomBar';
import { LazerFloatingAudioPlayer } from './components/layout/LazerFloatingAudioPlayer';
import { LazerWedge } from './components/beatmap/LazerWedge';
import { VirtualBeatmapList } from './components/beatmap/VirtualBeatmapList';
import { TrainingFiltersPanel } from './components/beatmap/TrainingFiltersPanel';
import { PoolOverview } from './components/pool/PoolOverview';
import { PoolUploader, UploaderTab } from './components/pool/PoolUploader';
import { SkillAttributes } from './engine/types';
import { extractOsuFilesFromZip } from './utils/unzip';
import { analyzeBeatmap } from './engine/analyzer';
import { extractQuickOsuMeta, matchOsuFileToTournamentEntry } from './utils/sheetParser';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { buildBeatmapCoverCss } from './lib/osu-preview';

const MOD_FILTERS: Array<{ id: string; label: string }> = [
  { id: 'ALL', label: 'Qualquer' },
  { id: 'NM', label: 'NoMod (NM)' },
  { id: 'HD', label: 'Hidden (HD)' },
  { id: 'HR', label: 'HardRock (HR)' },
  { id: 'DT', label: 'DoubleTime (DT)' },
  { id: 'FM', label: 'FreeMod (FM)' },
  { id: 'TB', label: 'Tiebreaker (TB)' },
];

const SORT_OPTIONS: Array<{
  value: SortOption;
  label: string;
  hideInLocal?: boolean;
  requiresSynergy?: boolean;
}> = [
  { value: 'synergy', label: 'Sinergia Multi-Skill', requiresSynergy: true },
  { value: 'slot', label: 'Slot', hideInLocal: true },
  { value: 'sr', label: 'Dificuldade (★)' },
  { value: 'bpm', label: 'BPM' },
  { value: 'od', label: 'Precisão (OD)' },
  { value: 'drain', label: 'Duração' },
  { value: 'snapAim', label: 'Jump' },
  { value: 'flowAim', label: 'Flow Aim' },
  { value: 'speed', label: 'Speed' },
  { value: 'stamina', label: 'Stamina' },
  { value: 'fingerControl', label: 'Finger Control' },
  { value: 'readingTech', label: 'Tech / Reading' },
];

export const App: React.FC = () => {
  const {
    currentPool,
    selectedMapId,
    filterOrigin,
    filterMod,
    filterTournament,
    filterStage,
    trainingFilters,
    prioritizedSkills,
    expandedSetKeys,
    searchQuery,
    sortBy,
    sortDirection,
    toggleSort,
    selectMap,
    removeBeatmap,
    updateModSlot,
    setFilterOrigin,
    setFilterMod,
    setFilterTournament,
    setFilterStage,
    resetTrainingFilters,
    toggleExpandedSet,
    setSearchQuery,
    initFromDb,
    addBeatmaps,
    setIsAnalyzing,
    setProgress,
    activeTournamentFilter,
  } = usePoolStore();

  const [activeTab, setActiveTab] = useState<'select' | 'overview'>('select');
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [uploaderInitialTab, setUploaderInitialTab] = useState<UploaderTab>('osu_songs');
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);

  const openUploader = (tab: UploaderTab = 'osu_songs') => {
    setUploaderInitialTab(tab);
    setIsUploaderOpen(true);
  };

  // Measure Left Wedge container height to sync the right beatmapset-panel list height
  const wedgeContainerRef = useRef<HTMLDivElement | null>(null);
  const [wedgeHeight, setWedgeHeight] = useState<number>(0);

  useEffect(() => {
    if (!wedgeContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setWedgeHeight(Math.round(entry.contentRect.height));
        }
      }
    });
    observer.observe(wedgeContainerRef.current);
    return () => observer.disconnect();
  }, [selectedMapId, activeTab]);

  useEffect(() => {
    initFromDb();
  }, [initFromDb]);

  const maps = currentPool.maps;

  const { localMapsCount, tournamentMapsCount } = useMemo(() => {
    let local = 0;
    let tourney = 0;
    for (let i = 0; i < maps.length; i++) {
      if (maps[i].origin === 'local_songs') local++;
      else tourney++;
    }
    return { localMapsCount: local, tournamentMapsCount: tourney };
  }, [maps]);

  const tournamentMaps = useMemo(
    () => maps.filter((m) => m.origin !== 'local_songs'),
    [maps]
  );

  const availableTournaments = useMemo(() => {
    return Array.from(
      new Set(
        tournamentMaps
          .map((m) => m.tournamentName)
          .filter((t): t is string => Boolean(t && t.trim()))
      )
    );
  }, [tournamentMaps]);

  const availableStages = useMemo(() => {
    const pool =
      filterTournament !== 'ALL'
        ? tournamentMaps.filter((m) => m.tournamentName === filterTournament)
        : tournamentMaps;
    return Array.from(
      new Set(pool.map((m) => m.stageName).filter((s): s is string => Boolean(s && s.trim())))
    );
  }, [tournamentMaps, filterTournament]);

  // Cleanly fallback if a selected tournament or stage filter was removed
  useEffect(() => {
    if (filterTournament !== 'ALL' && !availableTournaments.includes(filterTournament)) {
      setFilterTournament('ALL');
    }
  }, [availableTournaments, filterTournament, setFilterTournament]);

  useEffect(() => {
    if (filterStage !== 'ALL' && !availableStages.includes(filterStage)) {
      setFilterStage('ALL');
    }
  }, [availableStages, filterStage, setFilterStage]);

  const filteredMaps = useMemo(
    () =>
      getFilteredAndSortedMaps(
        maps,
        filterMod,
        searchQuery,
        sortBy,
        sortDirection,
        filterTournament,
        filterStage,
        filterOrigin,
        trainingFilters,
        prioritizedSkills
      ),
    [
      maps,
      filterMod,
      searchQuery,
      sortBy,
      sortDirection,
      filterTournament,
      filterStage,
      filterOrigin,
      trainingFilters,
      prioritizedSkills,
    ]
  );

  const groupedSets = useMemo(
    () => groupBeatmapsBySong(filteredMaps, prioritizedSkills),
    [filteredMaps, prioritizedSkills]
  );

  const activeMap = useMemo(() => {
    if (selectedMapId) {
      const inFiltered = filteredMaps.find((m) => m.id === selectedMapId);
      if (inFiltered) return inFiltered;
      if (filteredMaps.length === 0) {
        const foundAny = maps.find((m) => m.id === selectedMapId);
        if (foundAny) return foundAny;
      }
    }
    return filteredMaps[0] || maps[0] || null;
  }, [maps, filteredMaps, selectedMapId]);

  const activeSiblingDifficulties = useMemo(() => {
    if (!activeMap) return undefined;
    const activeKey = getBeatmapSetGroupKey(activeMap);
    const matchingGroup = groupedSets.find((g) => g.groupKey === activeKey);
    if (matchingGroup) return matchingGroup.difficulties;
    const allSiblings = maps
      .filter((m) => getBeatmapSetGroupKey(m) === activeKey)
      .sort((a, b) => a.stats.starRating - b.stats.starRating);
    return allSiblings.length > 0 ? allSiblings : [activeMap];
  }, [activeMap, groupedSets, maps]);

  const activeCoverCss = buildBeatmapCoverCss(activeMap, 'cover');

  // Calculate average skills across currently viewed origin/pool for comparison in the Wedge
  const avgSkills = useMemo<SkillAttributes | undefined>(() => {
    const refPool = filteredMaps.length > 1 ? filteredMaps : maps;
    if (refPool.length <= 1) return undefined;

    const sum: SkillAttributes = {
      snapAim: 0,
      flowAim: 0,
      speed: 0,
      stamina: 0,
      fingerControl: 0,
      readingTech: 0,
      stream: 0,
      burst: 0,
      accuracy: 0,
    };

    for (let i = 0; i < refPool.length; i++) {
      const s = refPool[i].skills;
      sum.snapAim += s.snapAim || 0;
      sum.flowAim += s.flowAim || 0;
      sum.speed += s.speed || 0;
      sum.stamina += s.stamina || 0;
      sum.fingerControl += s.fingerControl || 0;
      sum.readingTech += s.readingTech || 0;
      sum.stream! += s.stream ?? ((s.stamina || 0) * 0.7 + (s.speed || 0) * 0.3);
      sum.burst! += s.burst ?? ((s.speed || 0) * 0.7 + (s.fingerControl || 0) * 0.3);
      sum.accuracy! += s.accuracy ?? ((s.fingerControl || 0) * 0.45 + (s.readingTech || 20) * 0.35 + 15);
    }

    (Object.keys(sum) as Array<keyof SkillAttributes>).forEach((k) => {
      sum[k] = Math.round((sum[k] / refPool.length) * 10) / 10;
    });
    return sum;
  }, [filteredMaps, maps]);

  // Global Drag & Drop Handler
  const handleWindowDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsGlobalDragging(true);
  };

  const handleWindowDragLeave = (e: React.DragEvent) => {
    if (e.relatedTarget === null) {
      setIsGlobalDragging(false);
    }
  };

  const handleWindowDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsGlobalDragging(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

    const files = Array.from(e.dataTransfer.files);
    const oskFiles = files.filter((f) => f.name.toLowerCase().endsWith('.osk'));
    const beatmapFiles = files.filter((f) => !f.name.toLowerCase().endsWith('.osk'));

    if (oskFiles.length > 0) {
      for (const osk of oskFiles) {
        await useSkinStore.getState().importSkinOskOrZip(osk);
      }
    }

    if (beatmapFiles.length === 0) return;
    setIsAnalyzing(true);

    try {
      const pendingOsuFiles: Array<{ fileName: string; text: string; bytes?: Uint8Array }> = [];

      for (const file of beatmapFiles) {
        const lower = file.name.toLowerCase();
        if (lower.endsWith('.osu')) {
          const text = await file.text();
          const bytes = new Uint8Array(await file.arrayBuffer());
          pendingOsuFiles.push({ fileName: file.name, text, bytes });
        } else if (lower.endsWith('.osz') || lower.endsWith('.zip')) {
          const buf = await file.arrayBuffer();
          const extracted = await extractOsuFilesFromZip(buf);
          pendingOsuFiles.push(...extracted);
        }
      }

      let filesToAnalyze: Array<{
        fileName: string;
        text: string;
        bytes?: Uint8Array;
        officialSr?: number;
        officialBpm?: number;
        modSlot?: string;
      }> = [];

      if (activeTournamentFilter && activeTournamentFilter.entries.length > 0) {
        const requiredEntries = activeTournamentFilter.entries;
        for (const item of pendingOsuFiles) {
          const meta = extractQuickOsuMeta(item.text);
          const matched = matchOsuFileToTournamentEntry(meta, requiredEntries);
          if (matched) {
            filesToAnalyze.push({
              fileName: item.fileName,
              text: item.text,
              bytes: item.bytes,
              officialSr: matched.sr,
              officialBpm: matched.bpm,
              modSlot: matched.slot,
            });
          }
        }
      } else {
        filesToAnalyze = pendingOsuFiles;
      }

      const results = [];
      for (let i = 0; i < filesToAnalyze.length; i++) {
        const item = filesToAnalyze[i];
        setProgress({ current: i + 1, total: filesToAnalyze.length, fileName: item.fileName });
        const res = await analyzeBeatmap(item.text, item.fileName, item.bytes, item.officialSr);
        if (item.modSlot) res.modSlot = item.modSlot;
        if (item.officialSr) res.stats.starRating = item.officialSr;
        if (item.officialBpm) res.stats.bpmMode = item.officialBpm;
        results.push(res);
      }

      if (results.length > 0) {
        await addBeatmaps(results);
      }
    } finally {
      setIsAnalyzing(false);
      setProgress(null);
    }
  };

  const hasActiveTrainingFilters =
    countActiveTrainingFilters(trainingFilters) > 0 || prioritizedSkills.length > 0;

  return (
    <div
      onDragOver={handleWindowDragOver}
      onDragLeave={handleWindowDragLeave}
      onDrop={handleWindowDrop}
      className="osu-radar-app"
    >
      {/* 0. Custom Frameless osu!lazer Titlebar (rendered only inside Electron) */}
      <ElectronTitlebar
        activeSubtitle={
          activeMap
            ? `${activeMap.metadata.artist} — ${activeMap.metadata.title} [${activeMap.metadata.version}]`
            : undefined
        }
      />

      {/* 1. Official ppy/osu-web Pinned Navbar + Header v4 */}
      <LazerToolbar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onOpenUpload={() => openUploader('osu_songs')}
      />

      {/* 2. Main osu-web Page Content */}
      <div className="osu-layout__section osu-layout__section--full">
        {activeTab === 'select' ? (
          <>
            {/* Official ppy/osu-web .beatmapsets-search Header (resources/js/beatmaps/search-panel.tsx) */}
            <div className="osu-page osu-page--beatmapsets-search-header">
              <div className="beatmapsets-search" style={{ paddingTop: '14px', paddingBottom: '14px' }}>
                <div className="beatmapsets-search__cover">
                  <div
                    className="beatmapset-cover beatmapset-cover--full"
                    style={
                      activeCoverCss
                        ? ({
                            '--bg': activeCoverCss,
                            '--bg-2x': activeCoverCss,
                          } as React.CSSProperties)
                        : undefined
                    }
                  />
                </div>

                {/* Official osu-web Search Box */}
                <div className="beatmapsets-search__input-container" style={{ margin: '8px 0 12px' }}>
                  <label className="beatmapsets-search__input-container-label">
                    <span className="beatmapsets-search__icon">
                      <i className="fas fa-search" />
                    </span>
                    <input
                      className="beatmapsets-search__input"
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="procurar beatmap por título, artista, mapper, diff, tag ou slot..."
                    />
                  </label>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="beatmapsets-search__icon beatmapsets-search__icon--button"
                      title="Limpar busca"
                    >
                      <i className="fas fa-times" />
                    </button>
                  )}
                </div>

                {/* Official osu-web Filter Grid (.beatmapsets-search__filter-grid) */}
                <div className="beatmapsets-search__filter-grid">
                  {/* Origin Filter Row: All vs Personal osu! Songs vs Tournaments */}
                  <div className="beatmapsets-search-filter beatmapsets-search-filter--grid">
                    <span className="beatmapsets-search-filter__header">Origem</span>
                    <div
                      className="beatmapsets-search-filter__items"
                      style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 10px' }}
                    >
                      <a
                        href="#origin-all"
                        onClick={(e) => {
                          e.preventDefault();
                          setFilterOrigin('ALL');
                        }}
                        className={`beatmapsets-search-filter__item ${
                          filterOrigin === 'ALL' ? 'beatmapsets-search-filter__item--active' : ''
                        }`}
                      >
                        Qualquer ({maps.length})
                      </a>

                      <a
                        href="#origin-local"
                        onClick={(e) => {
                          e.preventDefault();
                          setFilterOrigin('local_songs');
                        }}
                        className={`beatmapsets-search-filter__item ${
                          filterOrigin === 'local_songs'
                            ? 'beatmapsets-search-filter__item--active'
                            : ''
                        }`}
                      >
                        <i
                          className="fas fa-hdd"
                          style={{ marginRight: '5px', fontSize: '10px', color: 'hsl(var(--hsl-h1))' }}
                        />
                        Meus Beatmaps / Songs ({localMapsCount})
                      </a>

                      <a
                        href="#origin-tournament"
                        onClick={(e) => {
                          e.preventDefault();
                          setFilterOrigin('tournament');
                        }}
                        className={`beatmapsets-search-filter__item ${
                          filterOrigin === 'tournament'
                            ? 'beatmapsets-search-filter__item--active'
                            : ''
                        }`}
                      >
                        <i
                          className="fas fa-trophy"
                          style={{ marginRight: '5px', fontSize: '10px', color: '#e5b32e' }}
                        />
                        Torneios ({tournamentMapsCount})
                      </a>

                      <button
                        type="button"
                        onClick={() => openUploader('osu_songs')}
                        className="osu-radar-player__mod-btn osu-radar-player__mod-btn--active"
                        style={{
                          marginLeft: '4px',
                          padding: '3px 10px',
                          fontSize: '11px',
                          textTransform: 'none',
                        }}
                        title="Indexar ou atualizar automaticamente sua pasta Songs instalada no osu!"
                      >
                        <i className="fas fa-sync-alt" style={{ marginRight: '5px' }} />
                        Sincronizar Pasta Songs
                      </button>

                      <button
                        type="button"
                        onClick={() => openUploader('skins')}
                        className="osu-radar-player__mod-btn"
                        style={{
                          padding: '3px 10px',
                          fontSize: '11px',
                          textTransform: 'none',
                        }}
                        title="Detectar ou importar Skins do osu! (.osk / pasta Skins) para usar no Preview"
                      >
                        <i className="fas fa-palette" style={{ marginRight: '5px', color: 'hsl(var(--hsl-h1))' }} />
                        Skins do osu!
                      </button>
                    </div>
                  </div>

                  {/* Personal Training Presets + Pattern Density / Range Filters */}
                  <TrainingFiltersPanel />

                  {/* Tournament-specific filters (shown when not strictly filtering Local Songs) */}
                  {filterOrigin !== 'local_songs' && (
                    <>
                      <div className="beatmapsets-search-filter beatmapsets-search-filter--grid">
                        <span className="beatmapsets-search-filter__header">Slot / Mod</span>
                        <div className="beatmapsets-search-filter__items">
                          {MOD_FILTERS.map((mod) => {
                            const basePool = filterOrigin === 'tournament' ? tournamentMaps : maps;
                            const cnt =
                              mod.id === 'ALL'
                                ? basePool.length
                                : basePool.filter((m) => m.modSlot?.startsWith(mod.id)).length;
                            const isSelected = filterMod === mod.id;

                            return (
                              <a
                                key={mod.id}
                                href={`#mod-${mod.id}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setFilterMod(mod.id);
                                }}
                                className={`beatmapsets-search-filter__item ${
                                  isSelected ? 'beatmapsets-search-filter__item--active' : ''
                                }`}
                              >
                                {mod.label} ({cnt})
                              </a>
                            );
                          })}
                        </div>
                      </div>

                      {/* Tournament Filter Row (Shown when tournaments exist) */}
                      {availableTournaments.length > 0 && (
                        <div className="beatmapsets-search-filter beatmapsets-search-filter--grid">
                          <span className="beatmapsets-search-filter__header">Torneio</span>
                          <div className="beatmapsets-search-filter__items">
                            <a
                              href="#tourney-all"
                              onClick={(e) => {
                                e.preventDefault();
                                setFilterTournament('ALL');
                              }}
                              className={`beatmapsets-search-filter__item ${
                                filterTournament === 'ALL' ? 'beatmapsets-search-filter__item--active' : ''
                              }`}
                            >
                              Todos os Torneios ({tournamentMaps.length})
                            </a>
                            {availableTournaments.map((tourney: string) => {
                              const cnt = tournamentMaps.filter((m) => m.tournamentName === tourney).length;
                              const isSelected = filterTournament === tourney;
                              return (
                                <a
                                  key={tourney}
                                  href={`#tourney-${tourney}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setFilterTournament(tourney);
                                  }}
                                  className={`beatmapsets-search-filter__item ${
                                    isSelected ? 'beatmapsets-search-filter__item--active' : ''
                                  }`}
                                >
                                  <i className="fas fa-trophy" style={{ marginRight: '5px', fontSize: '10px', color: '#e5b32e' }} />
                                  {tourney} ({cnt})
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Stage / Pool Difficulty Filter Row (Shown when stages exist) */}
                      {availableStages.length > 0 && (
                        <div className="beatmapsets-search-filter beatmapsets-search-filter--grid">
                          <span className="beatmapsets-search-filter__header">Etapa / Dificuldade</span>
                          <div className="beatmapsets-search-filter__items">
                            <a
                              href="#stage-all"
                              onClick={(e) => {
                                e.preventDefault();
                                setFilterStage('ALL');
                              }}
                              className={`beatmapsets-search-filter__item ${
                                filterStage === 'ALL' ? 'beatmapsets-search-filter__item--active' : ''
                              }`}
                            >
                              Todas as Etapas (
                              {filterTournament === 'ALL'
                                ? tournamentMaps.length
                                : tournamentMaps.filter((m) => m.tournamentName === filterTournament).length}
                              )
                            </a>
                            {availableStages.map((stage: string) => {
                              const cnt = tournamentMaps.filter(
                                (m) =>
                                  (filterTournament === 'ALL' || m.tournamentName === filterTournament) &&
                                  m.stageName === stage
                              ).length;
                              const isSelected = filterStage === stage;
                              return (
                                <a
                                  key={stage}
                                  href={`#stage-${stage}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setFilterStage(stage);
                                  }}
                                  className={`beatmapsets-search-filter__item ${
                                    isSelected ? 'beatmapsets-search-filter__item--active' : ''
                                  }`}
                                >
                                  <i className="fas fa-layer-group" style={{ marginRight: '5px', fontSize: '10px' }} />
                                  {stage} ({cnt})
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Main Split Workspace inside .osu-page */}
            <div className="osu-page">
              <div className="osu-radar-workspace">
                {/* Left Column: Selected Beatmapset Header + Live Visualizer / Radar */}
                <div ref={wedgeContainerRef} className="osu-radar-left-col">
                  <LazerWedge
                    map={activeMap}
                    siblingDifficulties={activeSiblingDifficulties}
                    onSelectDifficulty={(id) => selectMap(id)}
                    poolAverageSkills={avgSkills}
                    onSlotChange={(id, newSlot) => updateModSlot(id, newSlot)}
                  />
                </div>

                {/* Right Column: Official .beatmapsets Toolbar + Virtualized .beatmapset-panel List */}
                <div className="osu-radar-right-col">
                  {/* Official ppy/osu-web .beatmapsets__toolbar & .sort (resources/js/beatmaps/search-sort.tsx) */}
                  <div
                    className="beatmapsets__toolbar"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div className="beatmapsets__toolbar-item">
                      <div className="sort sort--beatmapsets">
                        <div className="sort__items">
                          <span className="sort__item sort__item--title">ordenar por</span>
                          {SORT_OPTIONS.filter((opt) => {
                            if (filterOrigin === 'local_songs' && opt.hideInLocal) return false;
                            if (
                              opt.requiresSynergy &&
                              prioritizedSkills.length < 2 &&
                              sortBy !== 'synergy'
                            ) {
                              return false;
                            }
                            return true;
                          }).map((opt) => {
                            const active = sortBy === opt.value;
                            return (
                              <a
                                key={opt.value}
                                href={`#sort-${opt.value}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  toggleSort(opt.value);
                                }}
                                className={`sort__item sort__item--button ${
                                  active ? 'sort__item--active' : ''
                                }`}
                                title={`${opt.label}: Clique para alternar entre decrescente e crescente`}
                              >
                                {opt.label}
                                <span className="sort__item-arrow">
                                  <i
                                    className={`fas fa-caret-${
                                      active && sortDirection === 'asc' ? 'up' : 'down'
                                    }`}
                                  />
                                </span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        paddingRight: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'hsl(var(--hsl-l2))',
                      }}
                    >
                      <span>
                        <strong style={{ color: '#fff' }}>
                          {groupedSets.length.toLocaleString('pt-BR')}
                        </strong>{' '}
                        {groupedSets.length === 1 ? 'música' : 'músicas'}
                        {' · '}
                        <strong style={{ color: 'hsl(var(--hsl-c1))' }}>
                          {filteredMaps.length.toLocaleString('pt-BR')}
                        </strong>{' '}
                        {filteredMaps.length === 1 ? 'diff' : 'diffs'}
                      </span>
                    </div>
                  </div>

                  {/* Virtualized Grouped Beatmapset Panels List */}
                  <VirtualBeatmapList
                    maps={filteredMaps}
                    groups={groupedSets}
                    expandedSetKeys={expandedSetKeys}
                    onToggleExpandSet={toggleExpandedSet}
                    prioritizedSkills={prioritizedSkills}
                    selectedMapId={activeMap?.id || selectedMapId}
                    maxHeightPx={wedgeHeight > 0 ? Math.max(460, wedgeHeight - 48) : undefined}
                    onSelectMap={(id) => selectMap(id)}
                    onRemoveMap={(id) => removeBeatmap(id)}
                    emptyState={
                      <div
                        className="beatmapsets__empty"
                        style={{
                          flexDirection: 'column',
                          gap: '12px',
                          padding: '40px 20px',
                          textAlign: 'center',
                        }}
                      >
                        <img
                          src="/images/layout/beatmaps/not-found.png"
                          alt="Nenhum beatmap encontrado"
                          style={{ maxWidth: '180px', opacity: 0.85 }}
                        />
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                          {hasActiveTrainingFilters && maps.length > 0
                            ? 'Nenhum beatmap atende aos filtros de treino atuais'
                            : filterOrigin === 'local_songs' && localMapsCount === 0
                            ? 'Sua pasta Songs do osu! ainda não foi sincronizada'
                            : 'Nenhum beatmap encontrado nesta visualização'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'hsl(var(--hsl-l2))', maxWidth: '420px' }}>
                          {hasActiveTrainingFilters && maps.length > 0
                            ? 'Experimente flexibilizar a barra de Star Rating (★) ou as skills priorizadas, ou clique abaixo para resetar os filtros.'
                            : 'Sincronize todos os mapas instalados localmente na sua pasta Songs do osu! para treinar Streams, Jumps, Tech e Accuracy, ou importe uma planilha de torneio.'}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          {hasActiveTrainingFilters && maps.length > 0 && (
                            <button
                              type="button"
                              onClick={resetTrainingFilters}
                              className="btn-osu-big btn-osu-big--rounded"
                            >
                              <div className="btn-osu-big__content">
                                <span className="btn-osu-big__icon-inline btn-osu-big__icon-inline--left">
                                  <i className="fas fa-undo" />
                                </span>
                                <span>Resetar Filtros de Treino</span>
                              </div>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openUploader('osu_songs')}
                            className="btn-osu-big btn-osu-big--rounded"
                          >
                            <div className="btn-osu-big__content">
                              <span className="btn-osu-big__icon-inline btn-osu-big__icon-inline--left">
                                <i className="fas fa-hdd" />
                              </span>
                              <span>Sincronizar Pasta Songs (osu!)</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => openUploader('sheet')}
                            className="btn-osu-big btn-osu-big--rounded"
                            style={{ backgroundColor: 'hsl(var(--hsl-b3))' }}
                          >
                            <div className="btn-osu-big__content">
                              <span className="btn-osu-big__icon-inline btn-osu-big__icon-inline--left">
                                <i className="fas fa-table" />
                              </span>
                              <span>Importar Torneio / Sheets</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Overview & Full Pool Intelligence View */
          <div className="osu-page osu-page--generic">
            <PoolOverview />
          </div>
        )}
      </div>

      {/* 3. Official ppy/osu-web Footer */}
      <LazerBottomBar
        onBackClick={() => setActiveTab('select')}
        onOpenUpload={() => openUploader('osu_songs')}
      />

      {/* 3.1 Official osu-web Floating Audio Player for Previews */}
      <LazerFloatingAudioPlayer />

      {/* 4. Uploader & Songs Sync Modal */}
      {isUploaderOpen && (
        <div
          className="osu-radar-modal-backdrop"
          onClick={() => setIsUploaderOpen(false)}
        >
          <div
            className="osu-radar-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="osu-radar-modal__header">
              <span style={{ fontWeight: 700, fontSize: '16px', color: 'hsl(var(--hsl-c1))' }}>
                <i className="fas fa-hdd" style={{ marginRight: '8px', color: 'hsl(var(--hsl-h1))' }} />
                Biblioteca osu! Songs, Skins & Importador de Mappools
              </span>
              <button
                type="button"
                onClick={() => setIsUploaderOpen(false)}
                className="btn-osu-big btn-osu-big--rounded-small"
              >
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="osu-radar-modal__body">
              <ErrorBoundary fallbackTitle="Erro ao carregar o sincronizador de beatmaps">
                <PoolUploader key={uploaderInitialTab} initialTab={uploaderInitialTab} />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      )}

      {/* 5. Fullscreen Drag Overlay */}
      {isGlobalDragging && (
        <div
          className="osu-radar-modal-backdrop"
          style={{
            border: '4px dashed hsl(var(--hsl-h1))',
            flexDirection: 'column',
            gap: '12px',
            pointerEvents: 'none',
          }}
        >
          <i className="fas fa-cloud-upload-alt" style={{ fontSize: '54px', color: 'hsl(var(--hsl-h1))' }} />
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#fff' }}>
            Solte seus beatmaps (.osz / .osu) ou skins (.osk) aqui
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'hsl(var(--hsl-c1))' }}>
            O osu!radar importará mapas e skins automaticamente
          </p>
        </div>
      )}
    </div>
  );
};

export default App;
