import React, { useEffect, useState, useRef, useMemo } from 'react';
import { usePoolStore, getFilteredAndSortedMaps, SortOption } from './store/usePoolStore';
import { LazerToolbar } from './components/layout/LazerToolbar';
import { LazerBottomBar } from './components/layout/LazerBottomBar';
import { LazerFloatingAudioPlayer } from './components/layout/LazerFloatingAudioPlayer';
import { LazerWedge } from './components/beatmap/LazerWedge';
import { LazerCarouselItem } from './components/beatmap/LazerCarouselItem';
import { PoolOverview } from './components/pool/PoolOverview';
import { PoolUploader } from './components/pool/PoolUploader';
import { SkillAttributes } from './engine/types';
import { extractOsuFilesFromZip } from './utils/unzip';
import { analyzeBeatmap } from './engine/analyzer';
import { extractQuickOsuMeta, matchOsuFileToTournamentEntry } from './utils/sheetParser';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const MOD_FILTERS: Array<{ id: string; label: string }> = [
  { id: 'ALL', label: 'Qualquer' },
  { id: 'NM', label: 'NoMod (NM)' },
  { id: 'HD', label: 'Hidden (HD)' },
  { id: 'HR', label: 'HardRock (HR)' },
  { id: 'DT', label: 'DoubleTime (DT)' },
  { id: 'FM', label: 'FreeMod (FM)' },
  { id: 'TB', label: 'Tiebreaker (TB)' },
];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'slot', label: 'Slot' },
  { value: 'sr', label: 'Dificuldade (★)' },
  { value: 'bpm', label: 'BPM' },
  { value: 'snapAim', label: 'Snap Aim' },
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
    filterMod,
    filterTournament,
    filterStage,
    searchQuery,
    sortBy,
    sortDirection,
    toggleSort,
    selectMap,
    removeBeatmap,
    updateModSlot,
    setFilterMod,
    setFilterTournament,
    setFilterStage,
    setSearchQuery,
    setSortBy: _setSortBy,
    initFromDb,
    addBeatmaps,
    setIsAnalyzing,
    setProgress,
    activeTournamentFilter,
  } = usePoolStore();

  const [activeTab, setActiveTab] = useState<'select' | 'overview'>('select');
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);

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

  const availableTournaments = useMemo(() => {
    return Array.from(
      new Set(maps.map((m) => m.tournamentName).filter((t): t is string => Boolean(t && t.trim())))
    );
  }, [maps]);

  const availableStages = useMemo(() => {
    const pool =
      filterTournament !== 'ALL'
        ? maps.filter((m) => m.tournamentName === filterTournament)
        : maps;
    return Array.from(
      new Set(pool.map((m) => m.stageName).filter((s): s is string => Boolean(s && s.trim())))
    );
  }, [maps, filterTournament]);

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

  const filteredMaps = getFilteredAndSortedMaps(
    maps,
    filterMod,
    searchQuery,
    sortBy,
    sortDirection,
    filterTournament,
    filterStage
  );
  const activeMap = maps.find((m) => m.id === selectedMapId) || maps[0] || null;

  const activeCoverUrl = activeMap?.metadata.beatmapSetId
    ? `https://assets.ppy.sh/beatmaps/${activeMap.metadata.beatmapSetId}/covers/cover.jpg`
    : null;

  // Calculate pool average skills for comparison in the Wedge
  const avgSkills: SkillAttributes = {
    snapAim: 0,
    flowAim: 0,
    speed: 0,
    stamina: 0,
    fingerControl: 0,
    readingTech: 0,
  };

  if (maps.length > 0) {
    for (const m of maps) {
      avgSkills.snapAim += m.skills.snapAim;
      avgSkills.flowAim += m.skills.flowAim;
      avgSkills.speed += m.skills.speed;
      avgSkills.stamina += m.skills.stamina;
      avgSkills.fingerControl += m.skills.fingerControl;
      avgSkills.readingTech += m.skills.readingTech;
    }
    (Object.keys(avgSkills) as Array<keyof SkillAttributes>).forEach((k) => {
      avgSkills[k] = Math.round((avgSkills[k] / maps.length) * 10) / 10;
    });
  }

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
    setIsAnalyzing(true);

    try {
      const pendingOsuFiles: Array<{ fileName: string; text: string; bytes?: Uint8Array }> = [];

      for (const file of files) {
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

  return (
    <div
      onDragOver={handleWindowDragOver}
      onDragLeave={handleWindowDragLeave}
      onDrop={handleWindowDrop}
      className="osu-radar-app"
    >
      {/* 1. Official ppy/osu-web Pinned Navbar + Header v4 */}
      <LazerToolbar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onOpenUpload={() => setIsUploaderOpen(true)}
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
                      activeCoverUrl
                        ? ({
                            '--bg': `url("${activeCoverUrl}")`,
                            '--bg-2x': `url("${activeCoverUrl}")`,
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
                      placeholder="procurar beatmap por título, artista, mapper, diff ou slot..."
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
                  <div className="beatmapsets-search-filter beatmapsets-search-filter--grid">
                    <span className="beatmapsets-search-filter__header">Slot / Mod</span>
                    <div className="beatmapsets-search-filter__items">
                      {MOD_FILTERS.map((mod) => {
                        const cnt =
                          mod.id === 'ALL'
                            ? maps.length
                            : maps.filter((m) => m.modSlot?.startsWith(mod.id)).length;
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
                          Todos os Torneios ({maps.length})
                        </a>
                        {availableTournaments.map((tourney: string) => {
                          const cnt = maps.filter((m) => m.tournamentName === tourney).length;
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
                          Todas as Etapas ({filterTournament === 'ALL' ? maps.length : maps.filter(m => m.tournamentName === filterTournament).length})
                        </a>
                        {availableStages.map((stage: string) => {
                          const cnt = maps.filter(
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
                    poolAverageSkills={maps.length > 1 ? avgSkills : undefined}
                    onSlotChange={(id, newSlot) => updateModSlot(id, newSlot)}
                  />
                </div>

                {/* Right Column: Official .beatmapsets Toolbar + .beatmapset-panel List */}
                <div className="osu-radar-right-col">
                  {/* Official ppy/osu-web .beatmapsets__toolbar & .sort (resources/js/beatmaps/search-sort.tsx) */}
                  <div className="beatmapsets__toolbar">
                    <div className="beatmapsets__toolbar-item">
                      <div className="sort sort--beatmapsets">
                        <div className="sort__items">
                          <span className="sort__item sort__item--title">ordenar por</span>
                          {SORT_OPTIONS.map((opt) => {
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
                  </div>

                  {/* Beatmapset Panels List (sized to match Left Column) */}
                  <div
                    style={{
                      height: wedgeHeight > 0 ? `${Math.max(460, wedgeHeight - 48)}px` : undefined,
                      maxHeight: wedgeHeight > 0 ? `${Math.max(460, wedgeHeight - 48)}px` : undefined,
                    }}
                    className="osu-radar-beatmapsets-list"
                  >
                    {filteredMaps.length > 0 ? (
                      filteredMaps.map((map) => (
                        <LazerCarouselItem
                          key={map.id}
                          map={map}
                          isSelected={map.id === selectedMapId}
                          onSelect={() => selectMap(map.id)}
                          onRemove={() => removeBeatmap(map.id)}
                        />
                      ))
                    ) : (
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
                          Nenhum beatmap encontrado nesta visualização
                        </div>
                        <div style={{ fontSize: '12px', color: 'hsl(var(--hsl-l2))', maxWidth: '380px' }}>
                          Arraste pacotes <strong>.osz</strong> ou arquivos <strong>.osu</strong> para a janela, ou clique abaixo para importar uma mappool / planilha do Google Sheets.
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsUploaderOpen(true)}
                          className="btn-osu-big btn-osu-big--rounded"
                        >
                          <div className="btn-osu-big__content">
                            <span className="btn-osu-big__icon-inline btn-osu-big__icon-inline--left">
                              <i className="fas fa-cloud-upload-alt" />
                            </span>
                            <span>Importar Beatmaps / Google Sheets</span>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
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
        onOpenUpload={() => setIsUploaderOpen(true)}
      />

      {/* 3.1 Official osu-web Floating Audio Player for Previews */}
      <LazerFloatingAudioPlayer />

      {/* 4. Uploader Modal */}
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
                <i className="fas fa-cloud-upload-alt" style={{ marginRight: '8px', color: 'hsl(var(--hsl-h1))' }} />
                Importador de Mappool & Sincronizador Google Sheets
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
              <ErrorBoundary fallbackTitle="Erro ao carregar o importador de beatmaps">
                <PoolUploader />
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
            Solte seus beatmaps (.osz / .osu) aqui
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'hsl(var(--hsl-c1))' }}>
            O osu!radar extrairá e analisará a física dos arquivos instantaneamente
          </p>
        </div>
      )}
    </div>
  );
};

export default App;
