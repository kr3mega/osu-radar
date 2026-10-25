import fs from 'fs';
import os from 'os';
import path from 'path';
import { zipSync, strToU8 } from 'fflate';
import { beforeEach, describe, expect, it } from 'vitest';
import { BeatmapAnalysisResult, SkillAttributes } from '../src/engine/types';
import { generateDiscordMappoolSummary } from '../src/engine/reporter';
import { rgb } from '../src/lib/osu-preview/functions';
import { extractSkinArchive, parseSkinIni } from '../src/lib/osu-preview/skin';
import {
  buildLocalSkinManifest,
  scanOsuSkinsDirectory,
} from '../src/server/localSkinsPlugin';
import {
  DEFAULT_TRAINING_FILTERS,
  getBeatmapSetGroupKey,
  getFilteredAndSortedMaps,
  groupBeatmapsBySong,
  TRAINING_PRESETS,
  usePoolStore,
} from '../src/store/usePoolStore';
import {
  computeMultiSkillSynergy,
  formatSkillLabel,
  SKILL_LABELS,
  SKILL_SHORT_LABELS,
} from '../src/utils/skillLabels';

function createMockBeatmap(overrides: {
  id: string;
  title?: string;
  artist?: string;
  creator?: string;
  version?: string;
  beatmapSetId?: number;
  localOsuPath?: string;
  starRating: number;
  bpm?: number;
  skills: Partial<SkillAttributes>;
}): BeatmapAnalysisResult {
  const fullSkills: SkillAttributes = {
    snapAim: 10,
    flowAim: 10,
    speed: 10,
    stamina: 10,
    stream: 10,
    burst: 10,
    fingerControl: 10,
    accuracy: 10,
    readingTech: 10,
    ...overrides.skills,
  };

  const sortedSkillKeys = (Object.entries(fullSkills) as Array<[keyof SkillAttributes, number]>)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  return {
    id: overrides.id,
    fileName: `${overrides.title || 'Song'} [${overrides.version || 'Insane'}].osu`,
    origin: 'local_songs',
    localOsuPath: overrides.localOsuPath,
    metadata: {
      title: overrides.title || 'Test Song',
      artist: overrides.artist || 'Test Artist',
      creator: overrides.creator || 'Test Mapper',
      version: overrides.version || 'Insane',
      beatmapId: Math.abs(overrides.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 1000)),
      beatmapSetId: overrides.beatmapSetId,
      previewTime: 1000,
    },
    difficulty: {
      cs: 4,
      ar: 9.2,
      od: 8.5,
      hp: 6,
      sliderMultiplier: 1.4,
      sliderTickRate: 1,
    },
    stats: {
      starRating: overrides.starRating,
      maxCombo: 600,
      bpmMin: overrides.bpm ?? 180,
      bpmMax: overrides.bpm ?? 180,
      bpmMode: overrides.bpm ?? 180,
      circleCount: 300,
      sliderCount: 120,
      spinnerCount: 1,
      totalObjects: 421,
      durationMs: 120000,
      drainTimeMs: 110000,
    },
    skills: fullSkills,
    timeline: [],
    topSkills: [sortedSkillKeys[0], sortedSkillKeys[1]],
    calculatedAt: Date.now(),
  };
}

describe('Skins osu!, Agrupamento de Músicas, Barra Dual de ★, Sinergia Multi-Skill e Label Jump', () => {
  beforeEach(() => {
    usePoolStore.setState({
      currentPool: {
        id: 'test-pool',
        name: 'Test Pool',
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
      expandedSetKeys: {},
      searchQuery: '',
      sortBy: 'sr',
      sortDirection: 'desc',
    });
  });

  it('substitui "Snap Aim" por "Jump" globalmente nos rótulos, presets e relatórios', () => {
    expect(SKILL_LABELS.snapAim).toBe('Jump');
    expect(SKILL_SHORT_LABELS.snapAim).toBe('Jump');
    expect(formatSkillLabel('snapAim')).toBe('Jump');

    const jumpPreset = TRAINING_PRESETS.find((p) => p.id === 'jump_aim');
    expect(jumpPreset?.label).toBe('Jump');

    const allLabels = [
      ...Object.values(SKILL_LABELS),
      ...Object.values(SKILL_SHORT_LABELS),
      ...TRAINING_PRESETS.map((p) => p.label),
    ];
    for (const lbl of allLabels) {
      expect(lbl.toLowerCase()).not.toContain('snap aim');
    }

    const map = createMockBeatmap({
      id: 'jump-1',
      title: 'Jump Training',
      starRating: 5.1,
      skills: { snapAim: 74, speed: 22 },
    });
    const summary = generateDiscordMappoolSummary({
      id: 'p1',
      name: 'Pool',
      createdAt: 0,
      updatedAt: 0,
      maps: [map],
    });
    expect(summary).toContain('Jump (74)');
    expect(summary).not.toContain('snapAim');
  });

  it('interpreta skin.ini reais (WhiteCat / Rafis), pacotes .osk e pastas com "#" e subpastas', async () => {
    const whiteCatIni = `\uFEFF[General]
Name: -        # WhiteCat (1.0) 『CK』 #-
Author: CK
CursorRotate: 0
CursorExpand: 0
CursorCentre: 1
AllowSliderBallTint: 0 // disable tint
HitCircleOverlayAboveNumer: 0

[Colours]
Combo1: 255, 232, 199 // #FFE8C7
Combo2: 214, 199, 255 // #D6C7FF
SliderTrackOverride: 0,0,0 // dark slider body
SliderBorder: 255, 255, 255

[Fonts]
HitCirclePrefix: Assets/default/default
HitCircleOverlap: 16 // px
`;

    const parsed = parseSkinIni(whiteCatIni);
    expect(parsed.General.Name).toBe('-        # WhiteCat (1.0) 『CK』 #-');
    expect(parsed.General.AllowSliderBallTint).toBe('0');
    expect(parsed.General.HitCircleOverlayAboveNumber).toBe('0');
    expect(parsed.combos).toEqual([
      [255, 232, 199],
      [214, 199, 255],
    ]);
    expect(parsed.Colours.SliderTrackOverride).toBe('0,0,0');
    expect(rgb(parsed.Colours.SliderTrackOverride as string)).toEqual([0, 0, 0]);
    expect(parsed.Fonts.HitCirclePrefix).toBe('Assets/default/default');
    expect(parsed.Fonts.HitCircleOverlap).toBe(16);

    // Build an in-memory .osk archive with nested wrapper folder & subfolder assets
    const zipped = zipSync({
      'MyCustomSkin/skin.ini': strToU8(whiteCatIni),
      'MyCustomSkin/hitcircle@2x.png': new Uint8Array([137, 80, 78, 71]),
      'MyCustomSkin/Assets/default/default-1@2x.png': new Uint8Array([137, 80, 78, 71]),
      'MyCustomSkin/soft-hitnormal.wav': new Uint8Array([82, 73, 70, 70]),
    });

    const extracted = extractSkinArchive(zipped.buffer as ArrayBuffer, 'WhiteCat.osk');
    expect(extracted.name).toBe('-        # WhiteCat (1.0) 『CK』 #-');
    expect(extracted.files['hitcircle@2x.png']).toBeDefined();
    expect(extracted.files['assets/default/default-1@2x.png']).toBeDefined();
    expect(extracted.files['soft-hitnormal.wav']).toBeDefined();

    // Test filesystem skin scanning & manifest with `#` in directory name
    const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'osu-radar-skins-'));
    try {
      const skinFolder = path.join(tmpRoot, '- # WhiteCat Test #-');
      const nestedDigitsDir = path.join(skinFolder, 'Assets', 'default');
      await fs.promises.mkdir(nestedDigitsDir, { recursive: true });
      await fs.promises.writeFile(path.join(skinFolder, 'skin.ini'), whiteCatIni, 'utf8');
      await fs.promises.writeFile(path.join(skinFolder, 'cursor.png'), Buffer.from([1, 2, 3]));
      await fs.promises.writeFile(
        path.join(nestedDigitsDir, 'default-0@2x.png'),
        Buffer.from([4, 5, 6])
      );

      const scanRes = await scanOsuSkinsDirectory(tmpRoot);
      expect(scanRes.skins).toHaveLength(1);
      expect(scanRes.skins[0].name).toBe('- # WhiteCat Test #-');
      expect(scanRes.skins[0].hasSkinIni).toBe(true);

      const manifest = await buildLocalSkinManifest(skinFolder);
      expect(manifest.files['cursor.png']).toBeDefined();
      expect(manifest.files['assets/default/default-0@2x.png']).toBeDefined();
      expect(manifest.iniText).toContain('SliderTrackOverride: 0,0,0');
    } finally {
      await fs.promises.rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it('oculta estritamente mapas fora da barra de Star Rating mesmo quando qualificados em Finger Control', () => {
    const fcLowSr = createMockBeatmap({
      id: 'fc-3.5',
      title: 'Tech Warmup',
      starRating: 3.5,
      skills: { fingerControl: 68, readingTech: 35 },
    });
    const fcInRange = createMockBeatmap({
      id: 'fc-4.8',
      title: 'Break',
      starRating: 4.8,
      skills: { fingerControl: 64, snapAim: 24 },
    });
    const fcHighSr = createMockBeatmap({
      id: 'fc-6.3',
      title: 'Ascension',
      starRating: 6.3,
      skills: { fingerControl: 79, speed: 55 },
    });

    const pool = [fcLowSr, fcInRange, fcHighSr];

    // User sets Star Rating slider to 4.0★ – 5.5★ AND clicks Finger Control preset
    usePoolStore.getState().setStarRatingRange(4.0, 5.5);
    usePoolStore.getState().applyTrainingPreset('finger_control');

    const stateAfterPreset = usePoolStore.getState();
    // Star rating bar MUST remain [4.0, 5.5]!
    expect(stateAfterPreset.trainingFilters.srMin).toBe(4.0);
    expect(stateAfterPreset.trainingFilters.srMax).toBe(5.5);

    const filtered = getFilteredAndSortedMaps(
      pool,
      'ALL',
      '',
      stateAfterPreset.sortBy,
      stateAfterPreset.sortDirection,
      'ALL',
      'ALL',
      'ALL',
      stateAfterPreset.trainingFilters,
      stateAfterPreset.prioritizedSkills
    );

    expect(filtered.map((m) => m.id)).toEqual(['fc-4.8']);
  });

  it('prioriza múltiplos filtros simultâneos (ex: Jump + Finger Control entre 4.0★ e 5.5★) ordenando pela maior sinergia', () => {
    const pureJumpOnly = createMockBeatmap({
      id: 'pure-jump',
      title: 'Pure Jump Farm',
      starRating: 4.9,
      skills: { snapAim: 82, fingerControl: 4 }, // Sem Finger Control!
    });
    const pureFcOnly = createMockBeatmap({
      id: 'pure-fc',
      title: 'Pure Finger Control',
      starRating: 4.7,
      skills: { snapAim: 3, fingerControl: 78 }, // Sem Jump!
    });
    const moderateHybrid = createMockBeatmap({
      id: 'hybrid-medium',
      title: 'Moderate Jump + FC',
      starRating: 4.5,
      skills: { snapAim: 42, fingerControl: 38 },
    });
    const strongHybridInRange = createMockBeatmap({
      id: 'hybrid-top',
      title: 'Peak Jump + FC Hybrid',
      starRating: 5.25,
      skills: { snapAim: 66, fingerControl: 61 },
    });
    const strongHybridTooHard = createMockBeatmap({
      id: 'hybrid-6.4',
      title: 'Extreme Jump + FC',
      starRating: 6.4,
      skills: { snapAim: 75, fingerControl: 72 }, // Fora do limite 4.0–5.5★!
    });

    const pool = [
      pureJumpOnly,
      pureFcOnly,
      moderateHybrid,
      strongHybridInRange,
      strongHybridTooHard,
    ];

    // User sets 4.0★–5.5★ and prioritizes BOTH Jump ('snapAim') + Finger Control ('fingerControl')
    usePoolStore.getState().setStarRatingRange(4.0, 5.5);
    usePoolStore.getState().togglePrioritizedSkill('snapAim');
    usePoolStore.getState().togglePrioritizedSkill('fingerControl');

    const st = usePoolStore.getState();
    expect(st.prioritizedSkills).toEqual(['snapAim', 'fingerControl']);
    expect(st.sortBy).toBe('synergy');

    const results = getFilteredAndSortedMaps(
      pool,
      'ALL',
      '',
      st.sortBy,
      st.sortDirection,
      'ALL',
      'ALL',
      'ALL',
      st.trainingFilters,
      st.prioritizedSkills
    );

    // Only genuine hybrids inside [4.0, 5.5] qualify, ordered by highest combined synergy!
    expect(results.map((m) => m.id)).toEqual(['hybrid-top', 'hybrid-medium']);
    expect(computeMultiSkillSynergy(strongHybridInRange.skills, st.prioritizedSkills)).toBeGreaterThan(
      computeMultiSkillSynergy(moderateHybrid.skills, st.prioritizedSkills)
    );
  });

  it('agrupa todas as dificuldades da mesma música e oculta dificuldades fora do filtro de Star Rating', () => {
    const songADiffs = [
      createMockBeatmap({
        id: 'songA-easy',
        beatmapSetId: 9001,
        title: 'Freedom Dive',
        artist: 'xi',
        version: 'Easy',
        starRating: 2.1,
        skills: { snapAim: 30, fingerControl: 30 },
      }),
      createMockBeatmap({
        id: 'songA-insane',
        beatmapSetId: 9001,
        title: 'Freedom Dive',
        artist: 'xi',
        version: 'Insane',
        starRating: 5.3,
        skills: { snapAim: 58, fingerControl: 54 },
      }),
      createMockBeatmap({
        id: 'songA-hard',
        beatmapSetId: 9001,
        title: 'Freedom Dive',
        artist: 'xi',
        version: 'Hard',
        starRating: 4.2,
        skills: { snapAim: 44, fingerControl: 41 },
      }),
      createMockBeatmap({
        id: 'songA-fd',
        beatmapSetId: 9001,
        title: 'Freedom Dive',
        artist: 'xi',
        version: 'FOUR DIMENSIONS',
        starRating: 7.58,
        skills: { stamina: 95, speed: 88, fingerControl: 70, snapAim: 40 },
      }),
    ];

    // Local song without beatmapSetId in .osu (grouped via Songs folder prefix)
    const songBDiffs = [
      createMockBeatmap({
        id: 'songB-normal',
        localOsuPath: 'C:\\osu!\\Songs\\774411 Camellia - Exit This Earth\\Map [Normal].osu',
        title: 'Exit This Earth',
        artist: 'Camellia',
        version: 'Normal',
        starRating: 3.1,
        skills: { snapAim: 25, fingerControl: 25 },
      }),
      createMockBeatmap({
        id: 'songB-extra',
        localOsuPath: 'C:\\osu!\\Songs\\774411 Camellia - Exit This Earth\\Map [Extra].osu',
        title: 'Exit This Earth',
        artist: 'Camellia',
        version: 'Extra',
        starRating: 6.8,
        skills: { snapAim: 65, fingerControl: 70 },
      }),
    ];

    expect(getBeatmapSetGroupKey(songBDiffs[0])).toBe('set:774411');
    expect(getBeatmapSetGroupKey(songBDiffs[1])).toBe('set:774411');

    const allMaps = [...songADiffs, ...songBDiffs];

    // Without SR restriction: 6 scattered beatmaps collapse into 2 grouped songs
    const unfiltered = getFilteredAndSortedMaps(
      allMaps,
      'ALL',
      '',
      'sr',
      'desc',
      'ALL',
      'ALL',
      'ALL',
      DEFAULT_TRAINING_FILTERS,
      []
    );
    const allGroups = groupBeatmapsBySong(unfiltered);
    expect(allGroups).toHaveLength(2);
    expect(allGroups[0].difficulties).toHaveLength(4);
    // Internal difficulties inside an expanded song are ordered ascending by ★
    expect(allGroups[0].difficulties.map((d) => d.id)).toEqual([
      'songA-easy',
      'songA-hard',
      'songA-insane',
      'songA-fd',
    ]);

    // With 4.0★ – 5.5★ filter: Song B has 0 qualifying diffs (3.1★ & 6.8★) so Song B is hidden completely,
    // and Song A only exposes its 2 qualifying diffs (4.2★ Hard & 5.3★ Insane)!
    const srFiltered = getFilteredAndSortedMaps(
      allMaps,
      'ALL',
      '',
      'sr',
      'desc',
      'ALL',
      'ALL',
      'ALL',
      { ...DEFAULT_TRAINING_FILTERS, srMin: 4.0, srMax: 5.5 },
      []
    );
    const srGroups = groupBeatmapsBySong(srFiltered);
    expect(srGroups).toHaveLength(1);
    expect(srGroups[0].title).toBe('Freedom Dive');
    expect(srGroups[0].difficulties.map((d) => d.id)).toEqual([
      'songA-hard',
      'songA-insane',
    ]);
  });
});
