import React, { useEffect, useState } from 'react';
import { usePoolStore, getFilteredAndSortedMaps, SortOption } from './store/usePoolStore';
import { TrianglesBackground } from './components/common/TrianglesBackground';
import { LazerToolbar } from './components/layout/LazerToolbar';
import { LazerBottomBar } from './components/layout/LazerBottomBar';
import { LazerWedge } from './components/beatmap/LazerWedge';
import { LazerCarouselSet, groupBeatmapsBySet } from './components/beatmap/LazerCarouselSet';
import { PoolOverview } from './components/pool/PoolOverview';
import { PoolUploader } from './components/pool/PoolUploader';
import { SkillAttributes } from './engine/types';
import { SlidersHorizontal, UploadCloud, X } from 'lucide-react';
import { extractOsuFilesFromZip } from './utils/unzip';
import { analyzeBeatmap } from './engine/analyzer';

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

export const App: React.FC = () => {
  const {
    currentPool,
    selectedMapId,
    expandedSetKey,
    setExpandedSetKey,
    filterMod,
    searchQuery,
    sortBy,
    selectMap,
    removeBeatmap,
    updateModSlot,
    setFilterMod,
    setSortBy,
    initFromDb,
    addBeatmaps,
    setIsAnalyzing,
    setProgress,
  } = usePoolStore();

  const [activeTab, setActiveTab] = useState<'select' | 'overview'>('select');
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);

  useEffect(() => {
    initFromDb();
  }, [initFromDb]);

  const maps = currentPool.maps;
  const filteredMaps = getFilteredAndSortedMaps(maps, filterMod, searchQuery, sortBy);
  const groupedSets = groupBeatmapsBySet(filteredMaps);

  // Selected map
  const activeMap = maps.find((m) => m.id === selectedMapId) || maps[0] || null;

  // Auto-expand the set containing active map if nothing is expanded
  useEffect(() => {
    if (activeMap && !expandedSetKey) {
      const parentGroup = groupedSets.find((g) => g.maps.some((m) => m.id === activeMap.id));
      if (parentGroup) {
        setExpandedSetKey(parentGroup.key);
      }
    }
  }, [activeMap, expandedSetKey, groupedSets, setExpandedSetKey]);

  const handleToggleSet = (key: string) => {
    // Accordion: clicking any other card immediately closes the previous one and opens the new one
    if (expandedSetKey === key) {
      setExpandedSetKey(null);
    } else {
      setExpandedSetKey(key);
    }
  };

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

      const results = [];
      for (let i = 0; i < pendingOsuFiles.length; i++) {
        const item = pendingOsuFiles[i];
        setProgress({ current: i + 1, total: pendingOsuFiles.length, fileName: item.fileName });
        const res = await analyzeBeatmap(item.text, item.fileName, item.bytes);
        results.push(res);
      }

      await addBeatmaps(results);
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
      className="min-h-screen bg-[#140a1b] text-white flex flex-col font-torus select-none relative overflow-x-hidden"
    >
      {/* 1. Animated Floating Triangles Background (Official ppy/osu Triangles.cs) */}
      <TrianglesBackground />

      {/* 2. Top Toolbar (osu.Game/Overlays/Toolbar) */}
      <LazerToolbar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      />

      {/* 3. Main View Area (Song Select / Overview) */}
      <main className="relative z-10 flex-1 px-3 sm:px-6 pt-4 pb-16 max-w-[1700px] w-full mx-auto">
        {activeTab === 'select' ? (
          /* Song Select Split View (Left: Info Wedge, Right: Carousel) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: The Beatmap Info Wedge */}
            <div className="lg:col-span-5 xl:col-span-5 sticky top-16">
              <LazerWedge
                map={activeMap}
                poolAverageSkills={maps.length > 1 ? avgSkills : undefined}
                onSlotChange={(id, newSlot) => updateModSlot(id, newSlot)}
              />
            </div>

            {/* Right Column: Beatmap Carousel & Mod Filters */}
            <div className="lg:col-span-7 xl:col-span-7 flex flex-col gap-3 min-w-0 max-w-full overflow-hidden">
              {/* Filter and Sort Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#1b0f24]/90 border border-white/10 rounded-lg backdrop-blur-md shadow-md min-w-0 max-w-full">
                {/* Mod Category Tabs */}
                <div className="flex items-center gap-1 flex-wrap">
                  {MOD_FILTERS.map((mod) => {
                    const cnt =
                      mod === 'ALL'
                        ? maps.length
                        : maps.filter((m) => m.modSlot?.startsWith(mod)).length;
                    const isSelected = filterMod === mod;

                    return (
                      <button
                        key={mod}
                        type="button"
                        onClick={() => setFilterMod(mod)}
                        className={`px-3 py-1 rounded text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-osu-pink text-white shadow-glowPink'
                            : 'bg-[#150a1d] hover:bg-[#22102e] text-white/70 border border-white/5'
                        }`}
                      >
                        <span>{mod}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-white/40'}`}>
                          {cnt}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Sort Option Dropdown */}
                <div className="flex items-center gap-1.5 bg-[#150a1d] border border-white/10 rounded px-2.5 py-1 shrink-0">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-osu-cyan" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#1c0f26] text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* The Carousel List (Grouped Set Cards + Accordion Difficulty Cards) */}
              <div className="flex flex-col gap-1.5 max-h-[calc(100vh-170px)] overflow-y-auto overflow-x-hidden pr-1 w-full min-w-0 max-w-full">
                {groupedSets.length > 0 ? (
                  groupedSets.map((group) => (
                    <LazerCarouselSet
                      key={group.key}
                      group={group}
                      isExpanded={expandedSetKey === group.key}
                      selectedMapId={selectedMapId}
                      onToggleExpand={() => handleToggleSet(group.key)}
                      onSelectMap={(id) => {
                        selectMap(id);
                        setExpandedSetKey(group.key);
                      }}
                      onRemoveMap={(id) => removeBeatmap(id)}
                    />
                  ))
                ) : (
                  <div className="p-12 bg-[#1b0f24]/80 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-center gap-3 text-white/50 backdrop-blur-md">
                    <p className="text-sm font-bold text-white">Nenhum beatmap importado ainda</p>
                    <p className="text-xs max-w-sm">
                      Arraste qualquer pacote <span className="text-osu-pink">.osz</span> ou arquivo <span className="text-osu-cyan">.osu</span> para a tela, ou clique em &ldquo;Importar .osz / .osu&rdquo; na barra inferior.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Overview & Full Pool Intelligence View */
          <div className="flex flex-col gap-6">
            <PoolOverview />
          </div>
        )}
      </main>

      {/* 4. Bottom Control Bar (ppy/osu style) */}
      <LazerBottomBar
        onBackClick={() => setActiveTab('select')}
        onOpenUpload={() => setIsUploaderOpen(true)}
      />

      {/* 5. Uploader Modal Drawer */}
      {isUploaderOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsUploaderOpen(false)}
        >
          <div
            className="relative w-full max-w-xl bg-[#1b0f24] border border-osu-pink/40 rounded-xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
                Importador de Mappool
              </h3>
              <button
                type="button"
                onClick={() => setIsUploaderOpen(false)}
                className="p-1 text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <PoolUploader />
          </div>
        </div>
      )}

      {/* 6. Fullscreen Drag Overlay (When dragging files from OS over browser window) */}
      {isGlobalDragging && (
        <div className="fixed inset-0 z-50 bg-[#1a0c24]/90 backdrop-blur-md border-4 border-dashed border-osu-pink flex flex-col items-center justify-center pointer-events-none shadow-glowPink">
          <UploadCloud className="w-16 h-16 text-osu-pink animate-bounce mb-4" />
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">
            Solte seus beatmaps aqui
          </h2>
          <p className="text-sm text-osu-cyan mt-1 font-semibold">
            O osu!Radar extrairá e analisará a física dos arquivos .osu instantaneamente
          </p>
        </div>
      )}
    </div>
  );
};

export default App;
