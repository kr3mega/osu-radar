import { create } from 'zustand';
import { BeatmapAnalysisResult, Mappool, SkillAttributes } from '../engine/types';
import { cacheBeatmaps, clearAllData, db } from '../db';

import { TournamentTier } from '../engine/bws';
import { SheetBeatmapEntry } from '../utils/sheetParser';

export interface ActiveTournamentFilter {
  stageName: string;
  entries: SheetBeatmapEntry[];
}

export type SortOption =
  | 'slot'
  | 'sr'
  | 'bpm'
  | 'snapAim'
  | 'flowAim'
  | 'speed'
  | 'stamina'
  | 'fingerControl'
  | 'readingTech';

interface PoolState {
  currentPool: Mappool;
  selectedMapId: string | null;
  filterMod: string; // 'ALL', 'NM', 'HD', 'HR', 'DT', 'FM', 'TB'
  searchQuery: string;
  sortBy: SortOption;
  tournamentTier: TournamentTier;
  isAnalyzing: boolean;
  progress: { current: number; total: number; fileName: string } | null;
  isMatchSimulatorOpen: boolean;
  expandedSetKey: string | null;
  activeTournamentFilter: ActiveTournamentFilter | null;

  // Actions
  addBeatmaps: (results: BeatmapAnalysisResult[]) => Promise<void>;
  removeBeatmap: (id: string) => void;
  updateModSlot: (id: string, newSlot: string) => void;
  selectMap: (id: string | null) => void;
  setFilterMod: (mod: string) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: SortOption) => void;
  setTournamentTier: (tier: TournamentTier) => void;
  setIsMatchSimulatorOpen: (open: boolean) => void;
  setExpandedSetKey: (key: string | null) => void;
  setActiveTournamentFilter: (filter: ActiveTournamentFilter | null) => void;
  setPoolMetadata: (name: string, stage?: string) => void;
  clearPool: () => void;
  resetAllData: () => Promise<void>;
  setIsAnalyzing: (analyzing: boolean) => void;
  setProgress: (progress: { current: number; total: number; fileName: string } | null) => void;
  exportPoolJson: () => string;
  importPoolJson: (jsonStr: string) => Promise<boolean>;
  initFromDb: () => Promise<void>;
}

export const usePoolStore = create<PoolState>((set, get) => ({
  currentPool: {
    id: 'default-pool',
    name: 'Mappool de Torneio',
    stage: 'Etapa Competitiva',
    description: 'Auditoria de habilidades e tensões físicas de beatmaps',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    maps: [],
  },
  selectedMapId: null,
  filterMod: 'ALL',
  searchQuery: '',
  sortBy: 'slot',
  tournamentTier: 'open_rank',
  isAnalyzing: false,
  progress: null,
  isMatchSimulatorOpen: false,
  expandedSetKey: null,
  activeTournamentFilter: null,

  setTournamentTier: (tournamentTier) => set({ tournamentTier }),
  setIsMatchSimulatorOpen: (isMatchSimulatorOpen) => set({ isMatchSimulatorOpen }),
  setExpandedSetKey: (expandedSetKey) => set({ expandedSetKey }),
  setActiveTournamentFilter: (activeTournamentFilter) => set({ activeTournamentFilter }),

  addBeatmaps: async (results) => {
    // Avoid duplicate maps by ID
    const existingMapIds = new Set(get().currentPool.maps.map((m) => m.id));
    const newMaps = results.filter((m) => !existingMapIds.has(m.id));

    // Auto-assign tournament slots if not set (NM1, NM2, ..., HD1, HR1, etc.)
    const updatedNewMaps = assignDefaultModSlots(get().currentPool.maps, newMaps);

    const merged = [...get().currentPool.maps, ...updatedNewMaps];

    set((state) => ({
      currentPool: {
        ...state.currentPool,
        maps: merged,
        updatedAt: Date.now(),
      },
      selectedMapId: state.selectedMapId || (merged.length > 0 ? merged[0].id : null),
    }));

    // Cache in IndexedDB
    try {
      await cacheBeatmaps(merged);
    } catch (e) {
      console.warn('Could not cache to IndexedDB:', e);
    }
  },

  removeBeatmap: (id) => {
    set((state) => {
      const updated = state.currentPool.maps.filter((m) => m.id !== id);
      return {
        currentPool: {
          ...state.currentPool,
          maps: updated,
          updatedAt: Date.now(),
        },
        selectedMapId: state.selectedMapId === id ? (updated[0]?.id || null) : state.selectedMapId,
      };
    });
  },

  updateModSlot: (id, newSlot) => {
    set((state) => ({
      currentPool: {
        ...state.currentPool,
        maps: state.currentPool.maps.map((m) =>
          m.id === id ? { ...m, modSlot: newSlot.toUpperCase() } : m
        ),
        updatedAt: Date.now(),
      },
    }));
  },

  selectMap: (id) => set({ selectedMapId: id }),
  setFilterMod: (filterMod) => set({ filterMod }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSortBy: (sortBy) => set({ sortBy }),
  setPoolMetadata: (name, stage) =>
    set((state) => ({
      currentPool: {
        ...state.currentPool,
        name,
        stage: stage || state.currentPool.stage,
        updatedAt: Date.now(),
      },
    })),

  clearPool: () =>
    set((state) => ({
      currentPool: {
        ...state.currentPool,
        maps: [],
        updatedAt: Date.now(),
      },
      selectedMapId: null,
      expandedSetKey: null,
    })),

  resetAllData: async () => {
    try {
      await clearAllData();
    } catch (e) {
      console.warn('Could not clear IndexedDB:', e);
    }
    set((state) => ({
      currentPool: {
        ...state.currentPool,
        maps: [],
        updatedAt: Date.now(),
      },
      selectedMapId: null,
      expandedSetKey: null,
    }));
  },

  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setProgress: (progress) => set({ progress }),

  exportPoolJson: () => {
    const pool = get().currentPool;
    return JSON.stringify(pool, null, 2);
  },

  importPoolJson: async (jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr) as Mappool;
      if (!parsed || !Array.isArray(parsed.maps)) {
        return false;
      }
      set({
        currentPool: parsed,
        selectedMapId: parsed.maps.length > 0 ? parsed.maps[0].id : null,
      });
      await cacheBeatmaps(parsed.maps);
      return true;
    } catch {
      return false;
    }
  },

  initFromDb: async () => {
    try {
      const allCached = await db.beatmaps.toArray();
      if (allCached && allCached.length > 0) {
        // Exclude and purge any demo/sample maps (100001, 100002, 100003 or Tester/Antigravity)
        const demoIds = ['100001', '100002', '100003'];
        const userMaps = allCached.filter(
          (m) =>
            !demoIds.includes(m.id) &&
            m.metadata?.creator !== 'Tester' &&
            m.metadata?.artist !== 'Antigravity'
        );

        if (userMaps.length !== allCached.length) {
          const toDelete = allCached
            .filter(
              (m) =>
                demoIds.includes(m.id) ||
                m.metadata?.creator === 'Tester' ||
                m.metadata?.artist === 'Antigravity'
            )
            .map((m) => m.id);
          await db.beatmaps.bulkDelete(toDelete);
        }

        set((state) => ({
          currentPool: {
            ...state.currentPool,
            maps: userMaps,
          },
          selectedMapId: userMaps.length > 0 ? userMaps[0].id : null,
        }));
      }
    } catch (e) {
      console.warn('Failed to load from DB:', e);
    }
  },
}));

/**
 * Sets default mod slot strictly to 'NM'.
 * No automatic mod guessing is performed; all maps default to 'NM'.
 */
function assignDefaultModSlots(
  _existingMaps: BeatmapAnalysisResult[],
  newMaps: BeatmapAnalysisResult[]
): BeatmapAnalysisResult[] {
  return newMaps.map((m) => ({
    ...m,
    modSlot: m.modSlot || 'NM',
  }));
}

/**
 * Filter and sort beatmaps according to current UI selections.
 */
export function getFilteredAndSortedMaps(
  maps: BeatmapAnalysisResult[],
  filterMod: string,
  searchQuery: string,
  sortBy: SortOption
): BeatmapAnalysisResult[] {
  let filtered = maps;

  // Filter by Mod
  if (filterMod !== 'ALL') {
    filtered = filtered.filter((m) => m.modSlot?.startsWith(filterMod));
  }

  // Filter by Search Query
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.metadata.title.toLowerCase().includes(q) ||
        m.metadata.artist.toLowerCase().includes(q) ||
        m.metadata.version.toLowerCase().includes(q) ||
        m.metadata.creator.toLowerCase().includes(q) ||
        (m.modSlot && m.modSlot.toLowerCase().includes(q))
    );
  }

  // Sort
  const sorted = [...filtered];
  const modOrder: Record<string, number> = {
    NM: 1,
    HD: 2,
    HR: 3,
    DT: 4,
    FM: 5,
    TB: 6,
  };

  sorted.sort((a, b) => {
    if (sortBy === 'slot') {
      const modA = a.modSlot?.slice(0, 2) || 'ZZ';
      const modB = b.modSlot?.slice(0, 2) || 'ZZ';
      const orderDiff = (modOrder[modA] || 99) - (modOrder[modB] || 99);
      if (orderDiff !== 0) return orderDiff;
      return (a.modSlot || '').localeCompare(b.modSlot || '', undefined, { numeric: true });
    }
    if (sortBy === 'sr') {
      return b.stats.starRating - a.stats.starRating;
    }
    if (sortBy === 'bpm') {
      return b.stats.bpmMode - a.stats.bpmMode;
    }
    const skillKey = sortBy as keyof SkillAttributes;
    if (skillKey in a.skills) {
      return (b.skills[skillKey] || 0) - (a.skills[skillKey] || 0);
    }
    return 0;
  });

  return sorted;
}
