import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  usePoolStore,
  getFilteredAndSortedMaps,
  getBeatmapSetGroupKey,
  getDifficultyDeduplicationKey,
  isSameDifficultyAcrossClients,
  groupBeatmapsBySong,
  SortOption,
} from './store/usePoolStore';
import { LazerToolbar } from './components/layout/LazerToolbar';
import { ElectronTitlebar } from './components/layout/ElectronTitlebar';
import { LazerBottomBar } from './components/layout/LazerBottomBar';
import { LazerFloatingAudioPlayer } from './components/layout/LazerFloatingAudioPlayer';
import { LazerWedge } from './components/beatmap/LazerWedge';
import { VirtualBeatmapList } from './components/beatmap/VirtualBeatmapList';
import { StarRatingFilterRow, SkillPriorityFilterRow } from './components/beatmap/TrainingFiltersPanel';
import { PoolOverview } from './components/pool/PoolOverview';
import { PoolUploader, UploaderTab } from './components/pool/PoolUploader';
import { SkillAttributes, BeatmapAnalysisResult } from './engine/types';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { buildBeatmapCoverCss } from './lib/osu-preview';

const MOD_FILTERS: Array<{ id: string; label: string }> = [
  { id: 'ALL', label: 'Todos' },
  { id: 'NM', label: 'NM' },
  { id: 'HD', label: 'HD' },
  { id: 'HR', label: 'HR' },
  { id: 'DT', label: 'DT' },
  { id: 'FM', label: 'FM' },
  { id: 'TB', label: 'TB' },
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
    resetAllFilters,
    toggleExpandedSet,
    setSearchQuery,
    initFromDb,
  } = usePoolStore();

  const [activeTab, setActiveTab] = useState<'select' | 'overview'>('select');
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [uploaderInitialTab, setUploaderInitialTab] = useState<UploaderTab>('osu_songs');

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

  const { localMapsCount, stableMapsCount, lazerMapsCount } = useMemo(() => {
    let local = 0;
    let stable = 0;
    let lazer = 0;
    for (let i = 0; i < maps.length; i++) {
      const m = maps[i];
      const isLzr = m.origin === 'lazer' || m.localClient === 'lazer';
      const isStb = (m.origin === 'local_songs' || !m.origin) && m.localClient !== 'lazer' && Boolean(m.localOsuPath);
      if (isLzr) {
        lazer++;
        local++;
      } else if (isStb || m.origin === 'local_songs') {
        stable++;
        local++;
      }
    }
    return { localMapsCount: local, stableMapsCount: stable, lazerMapsCount: lazer };
  }, [maps]);

  const tournamentMaps = useMemo(
    () => maps.filter((m) => m.origin !== 'local_songs' && m.origin !== 'lazer' && !m.localClient),
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
    if (groupedSets.length > 0 && groupedSets[0].representative) {
      return groupedSets[0].representative;
    }
    return filteredMaps[0] || maps[0] || null;
  }, [maps, filteredMaps, selectedMapId, groupedSets]);

  const activeSiblingDifficulties = useMemo(() => {
    if (!activeMap) return undefined;
    const activeKey = getBeatmapSetGroupKey(activeMap);
    const matchingGroup = groupedSets.find((g) => g.groupKey === activeKey);
    if (matchingGroup) return matchingGroup.difficulties;
    const allSiblings = maps
      .filter((m) => getBeatmapSetGroupKey(m) === activeKey)
      .sort((a, b) => a.stats.starRating - b.stats.starRating);
    const deduplicatedSiblings: BeatmapAnalysisResult[] = [];
    for (const sib of allSiblings) {
      const alreadyHas = deduplicatedSiblings.some(
        (d) => isSameDifficultyAcrossClients(d, sib) || getDifficultyDeduplicationKey(d) === getDifficultyDeduplicationKey(sib)
      );
      if (!alreadyHas) {
        deduplicatedSiblings.push(sib);
      }
    }
    return deduplicatedSiblings.length > 0 ? deduplicatedSiblings : [activeMap];
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

  return (
    <div className="osu-skills-app">
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
                  {/* 1. Dificuldade (Dual-Thumb Star Rating Filter) */}
                  <StarRatingFilterRow />

                  {/* 2. Origem (clean text-only links below Dificuldade) */}
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
                        Todos
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
                        Todas Locais
                      </a>

                      {lazerMapsCount > 0 && (
                        <a
                          href="#origin-lazer"
                          onClick={(e) => {
                            e.preventDefault();
                            setFilterOrigin('lazer');
                          }}
                          className={`beatmapsets-search-filter__item ${
                            filterOrigin === 'lazer'
                              ? 'beatmapsets-search-filter__item--active'
                              : ''
                          }`}
                        >
                          osu!lazer
                        </a>
                      )}

                      {stableMapsCount > 0 && (
                        <a
                          href="#origin-stable"
                          onClick={(e) => {
                            e.preventDefault();
                            setFilterOrigin('stable');
                          }}
                          className={`beatmapsets-search-filter__item ${
                            filterOrigin === 'stable'
                              ? 'beatmapsets-search-filter__item--active'
                              : ''
                          }`}
                        >
                          osu! (Stable)
                        </a>
                      )}

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
                        Torneios
                      </a>
                    </div>
                  </div>

                  {/* 3. Priorizar (Skill Priority Filter Row with same design as Mod) */}
                  <SkillPriorityFilterRow />

                  {/* Tournament-specific filters (shown when not strictly filtering Local Songs) */}
                  {filterOrigin !== 'local_songs' && (
                    <>
                      <div className="beatmapsets-search-filter beatmapsets-search-filter--grid">
                        <span className="beatmapsets-search-filter__header">Mod</span>
                        <div className="beatmapsets-search-filter__items">
                          {MOD_FILTERS.map((mod) => {
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
                                {mod.label}
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
                              Todos
                            </a>
                            {availableTournaments.map((tourney: string) => {
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
                                  {tourney}
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
                              Todos
                            </a>
                            {availableStages.map((stage: string) => {
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
                                  {stage}
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
              <div className="osu-skills-workspace">
                {/* Left Column: Selected Beatmapset Header + Visualizer / Skills */}
                <div ref={wedgeContainerRef} className="osu-skills-left-col">
                  <LazerWedge
                    map={activeMap}
                    siblingDifficulties={activeSiblingDifficulties}
                    onSelectDifficulty={(id) => selectMap(id)}
                    poolAverageSkills={avgSkills}
                    onSlotChange={(id, newSlot) => updateModSlot(id, newSlot)}
                  />
                </div>

                {/* Right Column: Official .beatmapsets Toolbar + Virtualized .beatmapset-panel List */}
                <div className="osu-skills-right-col">
                  {/* Official ppy/osu-web .beatmapsets__toolbar & .sort (resources/js/beatmaps/search-sort.tsx) */}
                  <div className="beatmapsets__toolbar">
                    <div className="beatmapsets__toolbar-item" style={{ flex: '1 1 auto', minWidth: 0, width: '100%' }}>
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

                          <div className="osu-skills-toolbar-count">
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
                      </div>
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
                    maxHeightPx={wedgeHeight > 0 ? Math.max(460, wedgeHeight - 72) : undefined}
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
                          {maps.length > 0
                            ? 'Nenhum beatmap atende aos filtros atuais'
                            : (filterOrigin === 'local_songs' || filterOrigin === 'lazer' || filterOrigin === 'stable') && localMapsCount === 0
                            ? 'Sua biblioteca local do osu! / osu!lazer ainda não foi sincronizada'
                            : 'Nenhum beatmap encontrado nesta visualização'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'hsl(var(--hsl-l2))', maxWidth: '420px' }}>
                          {maps.length > 0
                            ? 'Experimente flexibilizar a barra de Star Rating ou as skills priorizadas, ou clique abaixo para resetar os filtros.'
                            : 'Sincronize todos os mapas instalados localmente na sua pasta Songs do osu! para treinar Streams, Jumps, Tech e Accuracy, ou importe uma planilha de torneio.'}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          {maps.length > 0 && (
                            <button
                              type="button"
                              onClick={resetAllFilters}
                              className="btn-osu-big btn-osu-big--rounded"
                            >
                              <div className="btn-osu-big__content">
                                <span className="btn-osu-big__icon-inline btn-osu-big__icon-inline--left">
                                  <i className="fas fa-undo" />
                                </span>
                                <span>Resetar Filtros</span>
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
          className="osu-skills-modal-backdrop"
          onClick={() => setIsUploaderOpen(false)}
        >
          <div
            className="osu-skills-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="osu-skills-modal__header">
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
            <div className="osu-skills-modal__body">
              <ErrorBoundary fallbackTitle="Erro ao carregar o sincronizador de beatmaps">
                <PoolUploader key={uploaderInitialTab} initialTab={uploaderInitialTab} />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
