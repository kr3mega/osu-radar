import { create } from 'zustand';
import {
  BeatmapAnalysisResult,
  Mappool,
  PatternCounts,
  SkillAttributes,
} from '../engine/types';
import { computePatternCounts } from '../engine/analyzer';
import { cacheBeatmaps, clearAllData, clearLocalSongsFromDb, db } from '../db';
import { startBackgroundPoolAudioSync, clearAudioCache as clearDbAudioCache } from '../lib/osu-preview';

import { TournamentTier } from '../engine/bws';
import { SheetBeatmapEntry } from '../utils/sheetParser';
import {
  computeMultiSkillSynergy,
  matchesPrioritizedSkills,
} from '../utils/skillLabels';

export interface ActiveTournamentFilter {
  stageName: string;
  entries: SheetBeatmapEntry[];
}

export type OriginFilter = 'ALL' | 'local_songs' | 'tournament';

export type PatternDensityFilter = 'any' | 'none' | 'low' | 'medium' | 'high';

export type TrainingPresetId =
  | 'streams_stamina'
  | 'jump_aim'
  | 'flow_aim'
  | 'speed_bursts'
  | 'finger_control'
  | 'tech_reading'
  | 'accuracy';

export interface TrainingFilterState {
  srMin: number;
  srMax: number;
  bpmMin: number;
  bpmMax: number;
  odMin: number;
  odMax: number;
  arMin: number;
  arMax: number;
  csMin: number;
  csMax: number;
  durationMinSec: number;
  durationMaxSec: number;
  streamsDensity: PatternDensityFilter;
  jumpsDensity: PatternDensityFilter;
  burstsDensity: PatternDensityFilter;
  techDensity: PatternDensityFilter;
  minSkills?: Partial<SkillAttributes>;
}

export const DEFAULT_TRAINING_FILTERS: TrainingFilterState = {
  srMin: 0,
  srMax: 12,
  bpmMin: 0,
  bpmMax: 400,
  odMin: 0,
  odMax: 11,
  arMin: 0,
  arMax: 11,
  csMin: 0,
  csMax: 10,
  durationMinSec: 0,
  durationMaxSec: 900,
  streamsDensity: 'any',
  jumpsDensity: 'any',
  burstsDensity: 'any',
  techDensity: 'any',
  minSkills: undefined,
};

export interface TrainingPresetDefinition {
  id: TrainingPresetId;
  label: string;
  description: string;
  icon: string;
  sortBy: SortOption;
  filters: Partial<TrainingFilterState>;
}

export const TRAINING_PRESETS: TrainingPresetDefinition[] = [
  {
    id: 'streams_stamina',
    label: 'Streams & Stamina',
    description: 'Foco em streams contínuas, deathstreams e resistência física',
    icon: 'fas fa-water',
    sortBy: 'stamina',
    filters: {
      streamsDensity: 'high',
      minSkills: { stamina: 20 },
    },
  },
  {
    id: 'jump_aim',
    label: 'Jump',
    description: 'Muitos jumps angulares com pouca ou nenhuma stream',
    icon: 'fas fa-crosshairs',
    sortBy: 'snapAim',
    filters: {
      jumpsDensity: 'high',
      streamsDensity: 'low',
      minSkills: { snapAim: 25 },
    },
  },
  {
    id: 'flow_aim',
    label: 'Flow Aim',
    description: 'Transições fluidas, spaced streams e padrões circulares',
    icon: 'fas fa-bezier-curve',
    sortBy: 'flowAim',
    filters: {
      minSkills: { flowAim: 28 },
    },
  },
  {
    id: 'speed_bursts',
    label: 'Speed & Bursts',
    description: 'Alta velocidade de tapping, bursts intensos e BPM elevado',
    icon: 'fas fa-bolt',
    sortBy: 'speed',
    filters: {
      burstsDensity: 'high',
      bpmMin: 185,
      minSkills: { speed: 25 },
    },
  },
  {
    id: 'finger_control',
    label: 'Finger Control',
    description: 'Trocas de subdivisão rítmica (1/3, 1/4, 1/6), bursts alternados e controle',
    icon: 'fas fa-drum',
    sortBy: 'fingerControl',
    filters: {
      minSkills: { fingerControl: 28 },
    },
  },
  {
    id: 'tech_reading',
    label: 'Tech / SV / Reading',
    description: 'Mudanças de Slider Velocity, ritmos quebrados e leitura densa',
    icon: 'fas fa-random',
    sortBy: 'readingTech',
    filters: {
      techDensity: 'high',
      minSkills: { readingTech: 22 },
    },
  },
  {
    id: 'accuracy',
    label: 'Accuracy / Consistência',
    description: 'OD elevado (≥ 8,0) e duração consistente (≥ 1m15s) para treino de precisão',
    icon: 'fas fa-bullseye',
    sortBy: 'od',
    filters: {
      odMin: 8.0,
      durationMinSec: 75,
    },
  },
];

export type SortOption =
  | 'slot'
  | 'sr'
  | 'bpm'
  | 'od'
  | 'drain'
  | 'synergy'
  | 'snapAim'
  | 'flowAim'
  | 'speed'
  | 'stamina'
  | 'fingerControl'
  | 'readingTech';

export type SortDirection = 'asc' | 'desc';

export interface BeatmapSetGroup {
  groupKey: string;
  title: string;
  artist: string;
  creator: string;
  beatmapSetId?: number;
  representative: BeatmapAnalysisResult;
  difficulties: BeatmapAnalysisResult[];
  synergyScore: number;
}

export interface AudioSyncStatus {
  isSyncing: boolean;
  current: number;
  total: number;
  activeMapName?: string;
  totalBytes: number;
}

interface PoolState {
  currentPool: Mappool;
  selectedMapId: string | null;
  filterOrigin: OriginFilter; // 'ALL' | 'local_songs' | 'tournament'
  filterMod: string; // 'ALL', 'NM', 'HD', 'HR', 'DT', 'FM', 'TB'
  filterTournament: string; // 'ALL' or specific tournament name
  filterStage: string; // 'ALL' or specific stage name
  trainingFilters: TrainingFilterState;
  activeTrainingPreset: TrainingPresetId | null;
  prioritizedSkills: Array<keyof SkillAttributes>;
  searchQuery: string;
  sortBy: SortOption;
  sortDirection: SortDirection;
  tournamentTier: TournamentTier;
  isAnalyzing: boolean;
  progress: { current: number; total: number; fileName: string } | null;
  isMatchSimulatorOpen: boolean;
  expandedSetKey: string | null;
  expandedSetKeys: Record<string, boolean>;
  activeTournamentFilter: ActiveTournamentFilter | null;
  audioSyncStatus: AudioSyncStatus | null;

  // Actions
  addBeatmaps: (results: BeatmapAnalysisResult[]) => Promise<void>;
  upsertLocalBeatmaps: (results: BeatmapAnalysisResult[], removedIds?: string[]) => Promise<void>;
  clearLocalSongs: () => Promise<void>;
  removeBeatmap: (id: string) => void;
  updateModSlot: (id: string, newSlot: string) => void;
  selectMap: (id: string | null) => void;
  setFilterOrigin: (origin: OriginFilter) => void;
  setFilterMod: (mod: string) => void;
  setFilterTournament: (tournament: string) => void;
  setFilterStage: (stage: string) => void;
  setStarRatingRange: (srMin: number, srMax: number) => void;
  setTrainingFilters: (partial: Partial<TrainingFilterState>) => void;
  applyTrainingPreset: (presetId: TrainingPresetId | null) => void;
  togglePrioritizedSkill: (skill: keyof SkillAttributes) => void;
  setPrioritizedSkills: (skills: Array<keyof SkillAttributes>) => void;
  clearPrioritizedSkills: () => void;
  resetTrainingFilters: () => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: SortOption) => void;
  setSortDirection: (dir: SortDirection) => void;
  toggleSort: (option: SortOption) => void;
  setTournamentTier: (tier: TournamentTier) => void;
  setIsMatchSimulatorOpen: (open: boolean) => void;
  setExpandedSetKey: (key: string | null) => void;
  toggleExpandedSet: (key: string) => void;
  collapseAllSets: () => void;
  setActiveTournamentFilter: (filter: ActiveTournamentFilter | null) => void;
  setPoolMetadata: (name: string, stage?: string) => void;
  clearPool: () => void;
  resetAllData: () => Promise<void>;
  setIsAnalyzing: (analyzing: boolean) => void;
  setProgress: (progress: { current: number; total: number; fileName: string } | null) => void;
  startAudioSync: () => void;
  clearAudioCache: () => Promise<void>;
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
  filterOrigin: 'ALL',
  filterMod: 'ALL',
  filterTournament: 'ALL',
  filterStage: 'ALL',
  trainingFilters: { ...DEFAULT_TRAINING_FILTERS },
  activeTrainingPreset: null,
  prioritizedSkills: [],
  searchQuery: '',
  sortBy: 'slot',
  sortDirection: 'asc',
  tournamentTier: 'open_rank',
  isAnalyzing: false,
  progress: null,
  isMatchSimulatorOpen: false,
  expandedSetKey: null,
  expandedSetKeys: {},
  activeTournamentFilter: null,
  audioSyncStatus: null,

  setTournamentTier: (tournamentTier) => set({ tournamentTier }),
  setIsMatchSimulatorOpen: (isMatchSimulatorOpen) => set({ isMatchSimulatorOpen }),
  setExpandedSetKey: (expandedSetKey) =>
    set({
      expandedSetKey,
      expandedSetKeys: expandedSetKey ? { [expandedSetKey]: true } : {},
    }),
  toggleExpandedSet: (key) =>
    set((state) => {
      const isCurrentlyOpen = Boolean(state.expandedSetKeys[key]);
      console.log('[PoolStore] Grupo de beatmaps alternado:', key, 'aberto:', !isCurrentlyOpen);
      return {
        expandedSetKey: isCurrentlyOpen ? null : key,
        expandedSetKeys: isCurrentlyOpen ? {} : { [key]: true },
      };
    }),
  collapseAllSets: () => set({ expandedSetKey: null, expandedSetKeys: {} }),
  setActiveTournamentFilter: (activeTournamentFilter) => {
    const current = get().activeTournamentFilter;
    if (!current && !activeTournamentFilter) return;
    if (
      current &&
      activeTournamentFilter &&
      current.stageName === activeTournamentFilter.stageName &&
      current.entries.length === activeTournamentFilter.entries.length
    ) {
      return;
    }
    set({ activeTournamentFilter });
  },

  addBeatmaps: async (results) => {
    // Avoid duplicate maps by ID
    const existingMapIds = new Set(get().currentPool.maps.map((m) => m.id));
    const newMaps = results.filter((m) => !existingMapIds.has(m.id));

    // Auto-assign tournament slots if not set (NM1, NM2, ..., HD1, HR1, etc.)
    const updatedNewMaps = assignDefaultModSlots(get().currentPool.maps, newMaps);

    // Cache full record (including audioBlob if provided locally) in IndexedDB first
    try {
      await cacheBeatmaps(updatedNewMaps);
    } catch (e) {
      console.warn('Could not cache to IndexedDB:', e);
    }

    // Keep in-memory Zustand store lightweight (audioBlob stays in IndexedDB and is read on-demand for the active map)
    const lightweightNewMaps = updatedNewMaps.map(stripHeavyFieldsForMemory);
    const merged = [...get().currentPool.maps, ...lightweightNewMaps];

    set((state) => ({
      currentPool: {
        ...state.currentPool,
        maps: merged,
        updatedAt: Date.now(),
      },
      selectedMapId: state.selectedMapId || (merged.length > 0 ? merged[0].id : null),
    }));
  },

  upsertLocalBeatmaps: async (results, removedIds) => {
    const taggedResults = results.map((m) => ({
      ...m,
      origin: 'local_songs' as const,
      modSlot: m.modSlot || 'LOCAL',
    }));

    try {
      if (removedIds && removedIds.length > 0) {
        await db.beatmaps.bulkDelete(removedIds);
      }
      if (taggedResults.length > 0) {
        await cacheBeatmaps(taggedResults);
      }
    } catch (e) {
      console.warn('Could not persist local beatmaps to IndexedDB:', e);
    }

    const lightweightIncoming = taggedResults.map(stripHeavyFieldsForMemory);
    const incomingIds = new Set(lightweightIncoming.map((m) => m.id));
    const incomingPaths = new Set(
      lightweightIncoming
        .map((m) => m.localOsuPath?.toLowerCase())
        .filter((p): p is string => Boolean(p))
    );
    const removeSet = new Set(removedIds || []);

    set((state) => {
      const kept = state.currentPool.maps.filter((m) => {
        if (removeSet.has(m.id) || incomingIds.has(m.id)) return false;
        if (
          m.origin === 'local_songs' &&
          m.localOsuPath &&
          incomingPaths.has(m.localOsuPath.toLowerCase())
        ) {
          return false;
        }
        return true;
      });
      const merged = [...kept, ...lightweightIncoming];
      return {
        currentPool: {
          ...state.currentPool,
          maps: merged,
          updatedAt: Date.now(),
        },
        selectedMapId: state.selectedMapId || (merged.length > 0 ? merged[0].id : null),
      };
    });
  },

  clearLocalSongs: async () => {
    try {
      await clearLocalSongsFromDb();
    } catch (e) {
      console.warn('Could not clear local songs from IndexedDB:', e);
    }
    set((state) => {
      const remaining = state.currentPool.maps.filter((m) => m.origin !== 'local_songs');
      return {
        currentPool: {
          ...state.currentPool,
          maps: remaining,
          updatedAt: Date.now(),
        },
        filterOrigin: state.filterOrigin === 'local_songs' ? 'ALL' : state.filterOrigin,
        selectedMapId:
          state.selectedMapId && remaining.some((m) => m.id === state.selectedMapId)
            ? state.selectedMapId
            : remaining[0]?.id || null,
      };
    });
  },

  removeBeatmap: (id) => {
    try {
      db.beatmaps.delete(id).catch(() => {});
      db.beatmapTexts.delete(id).catch(() => {});
    } catch {}
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

  selectMap: (id) => {
    console.log('[PoolStore] Beatmap selecionado ID:', id);
    set({ selectedMapId: id });
  },
  setFilterOrigin: (filterOrigin) => {
    console.log('[PoolStore] Filtro de origem alterado para:', filterOrigin);
    set((state) => ({
      filterOrigin,
      sortBy:
        filterOrigin === 'local_songs' && state.sortBy === 'slot'
          ? 'sr'
          : state.sortBy,
    }));
  },
  setFilterMod: (filterMod) => {
    console.log('[PoolStore] Filtro por Mod:', filterMod);
    set({ filterMod });
  },
  setFilterTournament: (filterTournament) => {
    console.log('[PoolStore] Filtro por Torneio:', filterTournament);
    set({ filterTournament });
  },
  setFilterStage: (filterStage) => {
    console.log('[PoolStore] Filtro por Estágio/Tier:', filterStage);
    set({ filterStage });
  },
  setStarRatingRange: (srMin, srMax) => {
    const clampedMin = Math.max(0, Math.min(srMin, srMax));
    const clampedMax = Math.max(clampedMin, srMax);
    const rMin = Math.round(clampedMin * 100) / 100;
    const rMax = Math.round(clampedMax * 100) / 100;
    console.log('[PoolStore] Faixa de Star Rating definida:', rMin, 'a', rMax, 'estrelas');
    set((state) => ({
      trainingFilters: {
        ...state.trainingFilters,
        srMin: rMin,
        srMax: rMax,
      },
    }));
  },
  setTrainingFilters: (partial) =>
    set((state) => ({
      trainingFilters: {
        ...state.trainingFilters,
        ...partial,
      },
      activeTrainingPreset: null,
    })),
  applyTrainingPreset: (presetId) => {
    console.log('[PoolStore] Preset de treino selecionado:', presetId || 'nenhum (reset)');
    const prevSrMin = get().trainingFilters.srMin;
    const prevSrMax = get().trainingFilters.srMax;
    if (!presetId || get().activeTrainingPreset === presetId) {
      set({
        trainingFilters: {
          ...DEFAULT_TRAINING_FILTERS,
          srMin: prevSrMin,
          srMax: prevSrMax,
        },
        activeTrainingPreset: null,
      });
      return;
    }
    const def = TRAINING_PRESETS.find((p) => p.id === presetId);
    if (!def) return;
    set({
      trainingFilters: {
        ...DEFAULT_TRAINING_FILTERS,
        ...def.filters,
        srMin: prevSrMin,
        srMax: prevSrMax,
      },
      activeTrainingPreset: presetId,
      prioritizedSkills: [],
      sortBy: def.sortBy,
      sortDirection: 'desc',
    });
  },
  togglePrioritizedSkill: (skill) => {
    const current = get().prioritizedSkills;
    const exists = current.includes(skill);
    const next = exists ? current.filter((s) => s !== skill) : [...current, skill];
    console.log('[PoolStore] Habilidade priorizada alternada:', skill, 'Ativas:', next);
    set((state) => ({
      prioritizedSkills: next,
      activeTrainingPreset: null,
      sortBy:
        next.length > 0
          ? 'synergy'
          : state.sortBy === 'synergy'
          ? state.filterOrigin === 'local_songs'
            ? 'sr'
            : 'slot'
          : state.sortBy,
      sortDirection: next.length > 0 ? 'desc' : state.sortDirection,
    }));
  },
  setPrioritizedSkills: (skills) => {
    const unique = Array.from(new Set(skills));
    console.log('[PoolStore] Habilidades priorizadas definidas:', unique);
    set((state) => ({
      prioritizedSkills: unique,
      activeTrainingPreset: unique.length > 0 ? null : state.activeTrainingPreset,
      sortBy:
        unique.length > 0
          ? 'synergy'
          : state.sortBy === 'synergy'
          ? state.filterOrigin === 'local_songs'
            ? 'sr'
            : 'slot'
          : state.sortBy,
      sortDirection: unique.length > 0 ? 'desc' : state.sortDirection,
    }));
  },
  clearPrioritizedSkills: () => {
    console.log('[PoolStore] Habilidades priorizadas limpas');
    set((state) => ({
      prioritizedSkills: [],
      sortBy:
        state.sortBy === 'synergy'
          ? state.filterOrigin === 'local_songs'
            ? 'sr'
            : 'slot'
          : state.sortBy,
    }));
  },
  resetTrainingFilters: () => {
    console.log('[PoolStore] Reset de filtros de treino');
    set((state) => ({
      trainingFilters: { ...DEFAULT_TRAINING_FILTERS },
      activeTrainingPreset: null,
      prioritizedSkills: [],
      sortBy:
        state.sortBy === 'synergy'
          ? state.filterOrigin === 'local_songs'
            ? 'sr'
            : 'slot'
          : state.sortBy,
    }));
  },
  setSearchQuery: (searchQuery) => {
    if (searchQuery.trim()) {
      console.log('[PoolStore] Termo de busca:', searchQuery.trim());
    }
    set({ searchQuery });
  },
  setSortBy: (sortBy) => {
    console.log('[PoolStore] Ordenação alterada para:', sortBy);
    set({ sortBy });
  },
  setSortDirection: (sortDirection) => {
    console.log('[PoolStore] Direção de ordenação alterada para:', sortDirection);
    set({ sortDirection });
  },
  toggleSort: (option) => {
    const { sortBy, sortDirection } = get();
    if (sortBy === option) {
      const nextDir = sortDirection === 'desc' ? 'asc' : 'desc';
      console.log('[PoolStore] Invertendo direção de ordenação para:', nextDir);
      set({ sortDirection: nextDir });
    } else {
      console.log('[PoolStore] Alternando critério de ordenação para:', option, '(desc)');
      set({
        sortBy: option,
        sortDirection: 'desc', // User requested: newly clicked filter starts descending, next click toggles ascending
      });
    }
  },
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
    const cleanMaps = pool.maps.map((m) => {
      const copy = { ...m };
      delete copy.audioBlob;
      if (copy.audioUrl?.startsWith('blob:')) {
        delete copy.audioUrl;
      }
      return copy;
    });
    return JSON.stringify(
      {
        id: pool.id || 'osu-skills-pool',
        name: pool.name || 'Mappool de Torneio',
        stage: pool.stage || 'Etapa Competitiva',
        description: pool.description || 'Auditoria de habilidades e tensões físicas de beatmaps',
        createdAt: pool.createdAt || Date.now(),
        updatedAt: Date.now(),
        maps: cleanMaps,
      },
      null,
      2
    );
  },

  importPoolJson: async (jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr) as Mappool;
      if (!parsed || !Array.isArray(parsed.maps)) {
        return false;
      }
      // Sanitize and validate every map to ensure none can crash the UI
      const validMaps: BeatmapAnalysisResult[] = parsed.maps
        .filter((m) => m && typeof m === 'object' && m.id && m.metadata)
        .map((m) => ({
          ...m,
          audioBlob: undefined,
          audioUrl: m.audioUrl?.startsWith('blob:') ? undefined : m.audioUrl,
          modSlot: m.modSlot || 'NM1',
          tournamentName: m.tournamentName || parsed.name || 'Torneio',
          stageName: m.stageName || parsed.stage || 'Mappool',
          stats: {
            starRating: m.stats?.starRating ?? 5.0,
            bpmMin: m.stats?.bpmMin ?? 120,
            bpmMax: m.stats?.bpmMax ?? 120,
            bpmMode: m.stats?.bpmMode ?? 120,
            durationMs: m.stats?.durationMs ?? 120000,
            drainTimeMs: m.stats?.drainTimeMs ?? 120000,
            circleCount: m.stats?.circleCount ?? 0,
            sliderCount: m.stats?.sliderCount ?? 0,
            spinnerCount: m.stats?.spinnerCount ?? 0,
            totalObjects: m.stats?.totalObjects ?? 0,
            maxCombo: m.stats?.maxCombo ?? 0,
          },
          difficulty: {
            cs: m.difficulty?.cs ?? 4,
            hp: m.difficulty?.hp ?? 5,
            od: m.difficulty?.od ?? 8,
            ar: m.difficulty?.ar ?? 9,
            sliderMultiplier: m.difficulty?.sliderMultiplier ?? 1.4,
            sliderTickRate: m.difficulty?.sliderTickRate ?? 1,
          },
          skills: {
            snapAim: m.skills?.snapAim ?? 0,
            flowAim: m.skills?.flowAim ?? 0,
            speed: m.skills?.speed ?? 0,
            stamina: m.skills?.stamina ?? 0,
            stream: m.skills?.stream ?? ((m.skills?.stamina ?? 0) * 0.7 + (m.skills?.speed ?? 0) * 0.3),
            burst: m.skills?.burst ?? ((m.skills?.speed ?? 0) * 0.7 + (m.skills?.fingerControl ?? 0) * 0.3),
            fingerControl: m.skills?.fingerControl ?? 0,
            accuracy: m.skills?.accuracy ?? ((m.skills?.fingerControl ?? 0) * 0.45 + (m.skills?.readingTech ?? 20) * 0.35 + 15),
            readingTech: m.skills?.readingTech ?? 0,
          },
          timeline: Array.isArray(m.timeline) ? m.timeline : [],
          patterns: Array.isArray(m.patterns) ? m.patterns : [],
          topSkills: Array.isArray(m.topSkills) ? m.topSkills : ['snapAim', 'flowAim'],
        }));

      if (validMaps.length === 0 && parsed.maps.length > 0) {
        return false;
      }

      const newPool: Mappool = {
        id: parsed.id || 'imported-pool',
        name: parsed.name || 'Mappool Importada',
        stage: parsed.stage || 'Etapa Competitiva',
        description: parsed.description || 'Pool importada via arquivo JSON',
        createdAt: parsed.createdAt || Date.now(),
        updatedAt: Date.now(),
        maps: validMaps,
      };

      set({
        currentPool: newPool,
        selectedMapId: validMaps.length > 0 ? validMaps[0].id : null,
      });

      try {
        await cacheBeatmaps(validMaps);
      } catch (e) {
        console.warn('Could not cache imported maps to IndexedDB:', e);
      }

      return true;
    } catch {
      return false;
    }
  },

  startAudioSync: () => {
    const maps = get().currentPool.maps;
    if (maps.length === 0) return;
    if (get().audioSyncStatus?.isSyncing) return;

    set({
      audioSyncStatus: {
        isSyncing: true,
        current: 0,
        total: maps.length,
        totalBytes: 0,
      },
    });

    startBackgroundPoolAudioSync(maps, (prog) => {
      set((state) => ({
        audioSyncStatus: {
          isSyncing: !prog.isCompleted,
          current: prog.current,
          total: prog.total,
          activeMapName: prog.activeMapName,
          totalBytes: prog.totalBytes,
        },
        currentPool: {
          ...state.currentPool,
          maps: [...state.currentPool.maps],
        },
      }));
    });
  },

  clearAudioCache: async () => {
    await clearDbAudioCache();
    set((state) => ({
      audioSyncStatus: null,
      currentPool: {
        ...state.currentPool,
        maps: state.currentPool.maps.map((m) => ({
          ...m,
          audioBlob: undefined,
          audioUrl: undefined,
        })),
      },
    }));
  },

  initFromDb: async () => {
    try {
      const allCached = await db.beatmaps.toArray();
      if (allCached && allCached.length > 0) {
        // Exclude and purge any demo/sample maps (100001, 100002, 100003 or Tester/Antigravity)
        const demoIds = ['100001', '100002', '100003'];
        const userMaps = allCached
          .filter(
            (m) =>
              !demoIds.includes(m.id) &&
              m.metadata?.creator !== 'Tester' &&
              m.metadata?.artist !== 'Antigravity'
          )
          .map(stripHeavyFieldsForMemory);

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
 * Resolves pattern counts for any beatmap (exact from patternCounts/patterns, or estimated from skills for legacy cache).
 */
export function getEffectivePatternCounts(m: BeatmapAnalysisResult): PatternCounts {
  if (m.patternCounts) {
    return m.patternCounts;
  }
  if (Array.isArray(m.patterns) && m.patterns.length > 0) {
    return computePatternCounts(m.patterns);
  }
  return {
    streams: Math.round((m.skills?.stamina || 0) / 14),
    streamNotes: Math.round((m.skills?.stamina || 0) * 1.8),
    deathstreams: (m.skills?.stamina || 0) >= 65 ? 1 : 0,
    jumps: Math.round((m.skills?.snapAim || 0) / 12),
    bursts: Math.round((m.skills?.speed || 0) / 12),
    tech: Math.round((m.skills?.readingTech || 0) / 14),
  };
}

/**
 * Counts how many training filter parameters differ from their default unrestricted state.
 */
export function countActiveTrainingFilters(tf: TrainingFilterState): number {
  let count = 0;
  if (tf.srMin > DEFAULT_TRAINING_FILTERS.srMin || tf.srMax < DEFAULT_TRAINING_FILTERS.srMax) count++;
  if (tf.bpmMin > DEFAULT_TRAINING_FILTERS.bpmMin || tf.bpmMax < DEFAULT_TRAINING_FILTERS.bpmMax) count++;
  if (tf.odMin > DEFAULT_TRAINING_FILTERS.odMin || tf.odMax < DEFAULT_TRAINING_FILTERS.odMax) count++;
  if (tf.arMin > DEFAULT_TRAINING_FILTERS.arMin || tf.arMax < DEFAULT_TRAINING_FILTERS.arMax) count++;
  if (tf.csMin > DEFAULT_TRAINING_FILTERS.csMin || tf.csMax < DEFAULT_TRAINING_FILTERS.csMax) count++;
  if (
    tf.durationMinSec > DEFAULT_TRAINING_FILTERS.durationMinSec ||
    tf.durationMaxSec < DEFAULT_TRAINING_FILTERS.durationMaxSec
  ) {
    count++;
  }
  if (tf.streamsDensity !== 'any') count++;
  if (tf.jumpsDensity !== 'any') count++;
  if (tf.burstsDensity !== 'any') count++;
  if (tf.techDensity !== 'any') count++;
  if (tf.minSkills && Object.values(tf.minSkills).some((v) => (v || 0) > 0)) count++;
  return count;
}

/**
 * Strips heavy binary/object arrays from the in-memory Zustand store (keeping audioBlob safely
 * in IndexedDB to be loaded on-demand only for the currently active beatmap).
 */
function stripHeavyFieldsForMemory(m: BeatmapAnalysisResult): BeatmapAnalysisResult {
  if (m.audioUrl?.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(m.audioUrl);
    } catch {}
  }
  const isLocalLibrary = m.origin === 'local_songs';
  const patternCounts = m.patternCounts || (m.patterns ? computePatternCounts(m.patterns) : undefined);

  return {
    ...m,
    patternCounts,
    audioBlob: undefined,
    audioUrl: m.audioUrl?.startsWith('blob:') ? undefined : m.audioUrl,
    rawText: isLocalLibrary ? undefined : m.rawText,
    patterns: isLocalLibrary ? undefined : m.patterns,
    hitObjects: m.rawText || isLocalLibrary ? undefined : m.hitObjects,
    timeline: [],
  };
}

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
    origin: m.origin || 'tournament',
    modSlot: m.modSlot || 'NM',
  }));
}

function matchesStreamsDensity(counts: PatternCounts, density: PatternDensityFilter): boolean {
  if (density === 'any') return true;
  if (density === 'none') return counts.streams === 0;
  if (density === 'low') {
    return counts.streams <= 2 && counts.deathstreams === 0 && counts.streamNotes < 48;
  }
  if (density === 'medium') {
    return (
      (counts.streams >= 2 && counts.streams <= 5 && counts.streamNotes < 180) ||
      (counts.streamNotes >= 32 && counts.streamNotes < 120)
    );
  }
  if (density === 'high') {
    return counts.streams >= 4 || counts.deathstreams >= 1 || counts.streamNotes >= 64;
  }
  return true;
}

function matchesGenericDensity(
  count: number,
  density: PatternDensityFilter,
  highThreshold: number = 4
): boolean {
  if (density === 'any') return true;
  if (density === 'none') return count === 0;
  if (density === 'low') return count <= 2;
  if (density === 'medium') return count >= 2 && count <= highThreshold + 2;
  if (density === 'high') return count >= highThreshold;
  return true;
}

/**
 * Filter and sort beatmaps according to current UI selections (Tournament + Personal Training + Multi-Skill Priority).
 * Star Rating bounds (`srMin`..`srMax`) act as a strict AND filter across all presets, skills, and sort modes.
 */
export function getFilteredAndSortedMaps(
  maps: BeatmapAnalysisResult[],
  filterMod: string,
  searchQuery: string,
  sortBy: SortOption,
  sortDirection: SortDirection = 'desc',
  filterTournament: string = 'ALL',
  filterStage: string = 'ALL',
  filterOrigin: OriginFilter = 'ALL',
  trainingFilters?: TrainingFilterState,
  prioritizedSkills: Array<keyof SkillAttributes> = []
): BeatmapAnalysisResult[] {
  let filtered = maps;

  // 1. Filter by Origin (All vs Local osu! Songs vs Tournaments)
  if (filterOrigin === 'local_songs') {
    filtered = filtered.filter((m) => m.origin === 'local_songs');
  } else if (filterOrigin === 'tournament') {
    filtered = filtered.filter((m) => m.origin !== 'local_songs');
  }

  // 2. Tournament-specific filters (skipped when strictly viewing Personal Local Library)
  if (filterOrigin !== 'local_songs') {
    if (filterMod !== 'ALL') {
      filtered = filtered.filter((m) => m.modSlot?.startsWith(filterMod));
    }

    if (filterTournament && filterTournament !== 'ALL') {
      filtered = filtered.filter((m) => m.tournamentName === filterTournament);
    }

    if (filterStage && filterStage !== 'ALL') {
      filtered = filtered.filter((m) => m.stageName === filterStage);
    }
  }

  // 3. Training & Mechanical Pattern Filters
  if (trainingFilters && countActiveTrainingFilters(trainingFilters) > 0) {
    const tf = trainingFilters;
    const checkSr =
      tf.srMin > DEFAULT_TRAINING_FILTERS.srMin || tf.srMax < DEFAULT_TRAINING_FILTERS.srMax;
    const checkBpm =
      tf.bpmMin > DEFAULT_TRAINING_FILTERS.bpmMin || tf.bpmMax < DEFAULT_TRAINING_FILTERS.bpmMax;
    const checkOd =
      tf.odMin > DEFAULT_TRAINING_FILTERS.odMin || tf.odMax < DEFAULT_TRAINING_FILTERS.odMax;
    const checkAr =
      tf.arMin > DEFAULT_TRAINING_FILTERS.arMin || tf.arMax < DEFAULT_TRAINING_FILTERS.arMax;
    const checkCs =
      tf.csMin > DEFAULT_TRAINING_FILTERS.csMin || tf.csMax < DEFAULT_TRAINING_FILTERS.csMax;
    const checkDur =
      tf.durationMinSec > DEFAULT_TRAINING_FILTERS.durationMinSec ||
      tf.durationMaxSec < DEFAULT_TRAINING_FILTERS.durationMaxSec;
    const checkPatterns =
      tf.streamsDensity !== 'any' ||
      tf.jumpsDensity !== 'any' ||
      tf.burstsDensity !== 'any' ||
      tf.techDensity !== 'any';
    const minSkillEntries = tf.minSkills
      ? (Object.entries(tf.minSkills) as Array<[keyof SkillAttributes, number]>).filter(
          ([, v]) => v > 0
        )
      : [];

    filtered = filtered.filter((m) => {
      if (checkSr) {
        const srRounded = Math.round(m.stats.starRating * 100) / 100;
        const minBound = Math.round(tf.srMin * 100) / 100;
        const maxBound = Math.round(tf.srMax * 100) / 100;
        if (srRounded < minBound || srRounded > maxBound) {
          return false;
        }
      }
      if (checkBpm && (m.stats.bpmMode < tf.bpmMin || m.stats.bpmMode > tf.bpmMax)) {
        return false;
      }
      if (checkOd && (m.difficulty.od < tf.odMin || m.difficulty.od > tf.odMax)) {
        return false;
      }
      if (checkAr && (m.difficulty.ar < tf.arMin || m.difficulty.ar > tf.arMax)) {
        return false;
      }
      if (checkCs && (m.difficulty.cs < tf.csMin || m.difficulty.cs > tf.csMax)) {
        return false;
      }
      if (checkDur) {
        const durSec = (m.stats.drainTimeMs || m.stats.durationMs || 0) / 1000;
        if (durSec < tf.durationMinSec || durSec > tf.durationMaxSec) {
          return false;
        }
      }
      for (let i = 0; i < minSkillEntries.length; i++) {
        const [skillKey, minVal] = minSkillEntries[i];
        if ((m.skills[skillKey] || 0) < minVal) {
          return false;
        }
      }
      if (checkPatterns) {
        const counts = getEffectivePatternCounts(m);
        if (!matchesStreamsDensity(counts, tf.streamsDensity)) return false;
        if (!matchesGenericDensity(counts.jumps, tf.jumpsDensity, 4)) return false;
        if (!matchesGenericDensity(counts.bursts, tf.burstsDensity, 5)) return false;
        if (!matchesGenericDensity(counts.tech, tf.techDensity, 3)) return false;
      }
      return true;
    });
  }

  // 3b. Filter by Multi-Skill Priority (requires every prioritized skill to be meaningful)
  if (prioritizedSkills.length > 0) {
    filtered = filtered.filter((m) => matchesPrioritizedSkills(m.skills, prioritizedSkills));
  }

  // 4. Filter by Search Query (Title, Artist, Version, Mapper, Tags, Slot, Tournament)
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.metadata.title.toLowerCase().includes(q) ||
        m.metadata.artist.toLowerCase().includes(q) ||
        m.metadata.version.toLowerCase().includes(q) ||
        m.metadata.creator.toLowerCase().includes(q) ||
        (m.metadata.tags && m.metadata.tags.some((t) => t.toLowerCase().includes(q))) ||
        (m.modSlot && m.modSlot.toLowerCase().includes(q)) ||
        (m.tournamentName && m.tournamentName.toLowerCase().includes(q)) ||
        (m.stageName && m.stageName.toLowerCase().includes(q))
    );
  }

  // 5. Sort
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
    let diff = 0;
    if (sortBy === 'slot') {
      const modA = a.modSlot?.slice(0, 2) || 'ZZ';
      const modB = b.modSlot?.slice(0, 2) || 'ZZ';
      const orderDiff = (modOrder[modA] || 99) - (modOrder[modB] || 99);
      if (orderDiff !== 0) {
        diff = orderDiff;
      } else {
        diff = (a.modSlot || '').localeCompare(b.modSlot || '', undefined, { numeric: true });
      }
      return sortDirection === 'desc' ? -diff : diff;
    }

    if (sortBy === 'synergy' && prioritizedSkills.length > 0) {
      diff =
        computeMultiSkillSynergy(b.skills, prioritizedSkills) -
        computeMultiSkillSynergy(a.skills, prioritizedSkills);
    } else if (sortBy === 'sr') {
      diff = b.stats.starRating - a.stats.starRating;
    } else if (sortBy === 'bpm') {
      diff = b.stats.bpmMode - a.stats.bpmMode;
    } else if (sortBy === 'od') {
      diff = b.difficulty.od - a.difficulty.od;
    } else if (sortBy === 'drain') {
      diff = (b.stats.drainTimeMs || b.stats.durationMs) - (a.stats.drainTimeMs || a.stats.durationMs);
    } else {
      const skillKey = sortBy as keyof SkillAttributes;
      if (skillKey in a.skills) {
        diff = (b.skills[skillKey] || 0) - (a.skills[skillKey] || 0);
      }
    }

    return sortDirection === 'asc' ? -diff : diff;
  });

  return sorted;
}

/**
 * Computes a canonical grouping key for a song (beatmapset) so all difficulties
 * of the same song collapse into a single expandable BeatmapSet card.
 */
export function getBeatmapSetGroupKey(map: BeatmapAnalysisResult): string {
  if (map.metadata.beatmapSetId && map.metadata.beatmapSetId > 0) {
    return `set:${map.metadata.beatmapSetId}`;
  }
  if (map.localOsuPath) {
    const normalized = map.localOsuPath.replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const parentFolder = parts[parts.length - 2].trim();
      const folderIdMatch = parentFolder.match(/^(\d+)\s+/);
      if (folderIdMatch) {
        return `set:${folderIdMatch[1]}`;
      }
      if (parentFolder) {
        return `folder:${parentFolder.toLowerCase()}`;
      }
    }
  }
  const artist = (map.metadata.artist || '').trim().toLowerCase();
  const title = (map.metadata.title || '').trim().toLowerCase();
  const creator = (map.metadata.creator || '').trim().toLowerCase();
  return `meta:${artist}::${title}::${creator}`;
}

/**
 * Groups an already-filtered and sorted list of beatmaps by song (beatmapset).
 * - Group order preserves the position of each song's highest-ranked qualifying difficulty (`representative`).
 * - Inside each group, `difficulties` are ordered ascending by Star Rating (`★`) like osu!lazer.
 * - Any difficulty excluded by Star Rating / skill filters never enters `group.difficulties`,
 *   and songs with zero qualifying difficulties are omitted completely.
 */
export function groupBeatmapsBySong(
  filteredAndSortedMaps: BeatmapAnalysisResult[],
  prioritizedSkills: Array<keyof SkillAttributes> = []
): BeatmapSetGroup[] {
  const groupMap = new Map<string, BeatmapSetGroup>();
  const groups: BeatmapSetGroup[] = [];

  for (let i = 0; i < filteredAndSortedMaps.length; i++) {
    const map = filteredAndSortedMaps[i];
    const key = getBeatmapSetGroupKey(map);
    let group = groupMap.get(key);
    if (!group) {
      group = {
        groupKey: key,
        title: map.metadata.title,
        artist: map.metadata.artist,
        creator: map.metadata.creator,
        beatmapSetId: map.metadata.beatmapSetId,
        representative: map,
        difficulties: [map],
        synergyScore:
          prioritizedSkills.length > 0
            ? computeMultiSkillSynergy(map.skills, prioritizedSkills)
            : 0,
      };
      groupMap.set(key, group);
      groups.push(group);
    } else {
      group.difficulties.push(map);
    }
  }

  for (let i = 0; i < groups.length; i++) {
    groups[i].difficulties.sort((a, b) => a.stats.starRating - b.stats.starRating);
  }

  return groups;
}
