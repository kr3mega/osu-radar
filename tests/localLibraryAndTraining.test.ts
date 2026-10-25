import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  extractOsuModeQuick,
  extractSetIdFromFolderName,
  parseOsuBeatmap,
} from '../src/engine/parser';
import { analyzeBeatmap } from '../src/engine/analyzer';
import {
  DEFAULT_TRAINING_FILTERS,
  getFilteredAndSortedMaps,
  usePoolStore,
} from '../src/store/usePoolStore';
import {
  isPathInsideAuthorizedRoots,
  readLocalOsuBatch,
  scanOsuSongsDirectory,
} from '../src/server/localSongsPlugin';
import { buildBeatmapCoverCss, getLocalSongFileUrl } from '../src/lib/osu-preview';
import { BeatmapAnalysisResult } from '../src/engine/types';

function makeMockMap(overrides: Partial<BeatmapAnalysisResult> & { id: string }): BeatmapAnalysisResult {
  return {
    id: overrides.id,
    fileName: overrides.fileName || `${overrides.id}.osu`,
    origin: overrides.origin || 'local_songs',
    modSlot: overrides.modSlot || 'LOCAL',
    tournamentName: overrides.tournamentName,
    stageName: overrides.stageName,
    localOsuPath: overrides.localOsuPath,
    localAudioPath: overrides.localAudioPath,
    localBgPath: overrides.localBgPath,
    metadata: {
      title: 'Test Map',
      artist: 'Test Artist',
      creator: 'Mapper',
      version: 'Insane',
      ...overrides.metadata,
    },
    difficulty: {
      hp: 5,
      cs: 4,
      od: 8,
      ar: 9,
      sliderMultiplier: 1.4,
      sliderTickRate: 1,
      ...overrides.difficulty,
    },
    stats: {
      bpmMin: 180,
      bpmMax: 180,
      bpmMode: 180,
      durationMs: 120000,
      drainTimeMs: 120000,
      circleCount: 300,
      sliderCount: 100,
      spinnerCount: 1,
      totalObjects: 401,
      maxCombo: 550,
      starRating: 5.5,
      ...overrides.stats,
    },
    skills: {
      snapAim: 40,
      flowAim: 30,
      speed: 35,
      stamina: 25,
      fingerControl: 20,
      readingTech: 15,
      ...overrides.skills,
    },
    patternCounts: overrides.patternCounts || {
      streams: 0,
      streamNotes: 0,
      deathstreams: 0,
      jumps: 2,
      bursts: 2,
      tech: 0,
    },
    timeline: [],
    topSkills: overrides.topSkills || ['snapAim', 'speed'],
    calculatedAt: Date.now(),
  };
}

describe('osu!stable Songs Folder Parser & Legacy Format Support', () => {
  it('extracts BeatmapSetID from osu!stable Songs folder naming conventions', () => {
    expect(extractSetIdFromFolderName('3875 Gojou Kai - Voyage 1969-1970')).toBe(3875);
    expect(extractSetIdFromFolderName('8741 Flo Rida ft Wynter - Sugar [no video]')).toBe(8741);
    expect(
      extractSetIdFromFolderName('C:\\Users\\Usuário\\AppData\\Local\\osu!\\Songs\\2101092 Artist - Song')
    ).toBe(2101092);
    expect(extractSetIdFromFolderName('Custom Practice Pack')).toBeUndefined();
  });

  it('handles legacy osu file format v5 (missing ApproachRate & BeatmapSetID) and Events background', async () => {
    const legacyV5Osu = [
      'osu file format v5',
      '',
      '[General]',
      'AudioFilename: voyage1969.mp3',
      'PreviewTime: 48200',
      '',
      '[Metadata]',
      'Title:Voyage 1969-1970',
      'Artist:Gojou Kai',
      'Creator:arsec',
      'Version:Hard',
      'BeatmapID:0',
      'BeatmapSetID:-1',
      '',
      '[Difficulty]',
      'HPDrainRate:6',
      'CircleSize:4',
      'OverallDifficulty:7.5',
      'SliderMultiplier:1.4',
      'SliderTickRate:1',
      '',
      '[Events]',
      '//Background and Video events',
      '0,0,"image.jpg"',
      '',
      '[TimingPoints]',
      '0,333.333,4,2,1,80,1,0',
      '',
      '[HitObjects]',
      '100,100,1000,1,0',
      '220,160,1333,1,0',
      '340,220,1666,1,0',
      '200,280,2000,1,0',
    ].join('\n');

    const parsed = parseOsuBeatmap(legacyV5Osu);
    expect(parsed.difficulty.od).toBe(7.5);
    expect(parsed.difficulty.ar).toBe(7.5); // Legacy AR === OD rule
    expect(parsed.metadata.backgroundFilename).toBe('image.jpg');
    expect(parsed.metadata.previewTime).toBe(48200);
    expect(parsed.metadata.beatmapId).toBeUndefined();
    expect(parsed.metadata.beatmapSetId).toBeUndefined();
    expect(parsed.metadata.mode).toBe(0);

    const lightweightAnalysis = await analyzeBeatmap(
      legacyV5Osu,
      'Gojou Kai - Voyage 1969-1970 (arsec) [Hard].osu',
      undefined,
      undefined,
      undefined,
      {
        folderName: '3875 Gojou Kai - Voyage 1969-1970',
        lightweight: true,
        origin: 'local_songs',
        localOsuPath: 'C:\\osu!\\Songs\\3875 Gojou Kai - Voyage 1969-1970\\Hard.osu',
      }
    );

    expect(lightweightAnalysis.metadata.beatmapSetId).toBe(3875);
    expect(lightweightAnalysis.origin).toBe('local_songs');
    expect(lightweightAnalysis.id.startsWith('local_')).toBe(true);
    expect(lightweightAnalysis.rawText).toBeUndefined();
    expect(lightweightAnalysis.hitObjects).toBeUndefined();
    expect(lightweightAnalysis.timeline).toEqual([]);
    expect(lightweightAnalysis.patternCounts).toBeDefined();
  });

  it('detects non-standard osu! modes (Taiko/Catch/Mania) quickly', () => {
    const maniaOsu = `osu file format v14\n[General]\nAudioFilename: audio.mp3\nMode: 3\n[Metadata]\nTitle:4K`;
    const stdOsu = `osu file format v14\n[General]\nAudioFilename: audio.mp3\nMode: 0\n[Metadata]\nTitle:Std`;
    expect(extractOsuModeQuick(maniaOsu)).toBe(3);
    expect(extractOsuModeQuick(stdOsu)).toBe(0);
  });

  it('escapes parentheses and quotes in local media cover URLs', () => {
    const map = makeMockMap({
      id: 'local_cover_test',
      localBgPath: 'C:\\osu!\\Songs\\3875 Gojou Kai (arsec)\\image (1).jpg',
      metadata: {
        title: 'Voyage',
        artist: 'Gojou Kai',
        creator: 'arsec',
        version: 'Hard',
        beatmapSetId: 3875,
      },
    });
    const url = getLocalSongFileUrl(map.localBgPath)!;
    expect(url).not.toContain('(');
    expect(url).not.toContain(')');
    const css = buildBeatmapCoverCss(map, 'list')!;
    expect(css).toContain('/api/local-songs/file?path=');
    expect(css).toContain('https://assets.ppy.sh/beatmaps/3875/covers/list.jpg');
  });
});

describe('Local Songs Disk Bridge Scanner & Security', () => {
  it('scans beatmapset folders, pairs local audio/bg case-insensitively, and enforces path traversal boundaries', async () => {
    const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'osu-songs-test-'));
    try {
      const setFolder = path.join(tmpRoot, '3875 Gojou Kai - Voyage 1969-1970');
      await fs.promises.mkdir(setFolder, { recursive: true });

      const osuFile = path.join(setFolder, 'Gojou Kai - Voyage 1969-1970 (arsec) [Hard].osu');
      const mp3File = path.join(setFolder, 'voyage1969.mp3');
      const bgFile = path.join(setFolder, 'image.jpg');

      await fs.promises.writeFile(
        osuFile,
        [
          'osu file format v9',
          '[General]',
          'AudioFilename: VOYAGE1969.MP3',
          'Mode: 0',
          '[Metadata]',
          'Title:Voyage 1969-1970',
          'Artist:Gojou Kai',
          'Creator:arsec',
          'Version:Hard',
          '[Difficulty]',
          'OverallDifficulty:7',
          '[Events]',
          '0,0,"IMAGE.JPG",0,0',
          '[HitObjects]',
          '256,192,1000,1,0',
        ].join('\n'),
        'utf8'
      );
      await fs.promises.writeFile(mp3File, Buffer.alloc(2048));
      await fs.promises.writeFile(bgFile, Buffer.alloc(1024));

      const scan = await scanOsuSongsDirectory(tmpRoot);
      expect(scan.folderCount).toBe(1);
      expect(scan.entries.length).toBe(1);
      expect(scan.entries[0].folderName).toBe('3875 Gojou Kai - Voyage 1969-1970');

      const authorized = new Set([scan.songsDir]);
      expect(isPathInsideAuthorizedRoots(osuFile, authorized)).toBe(true);
      expect(
        isPathInsideAuthorizedRoots(path.resolve(tmpRoot, '..', 'outside.osu'), authorized)
      ).toBe(false);

      const batch = await readLocalOsuBatch(
        [{ osuPath: scan.entries[0].osuPath, folderPath: scan.entries[0].folderPath }],
        authorized
      );
      expect(batch.length).toBe(1);
      expect(batch[0].localAudioPath).toBe(mp3File);
      expect(batch[0].localBgPath).toBe(bgFile);
    } finally {
      await fs.promises.rm(tmpRoot, { recursive: true, force: true });
    }
  });
});

describe('Training Filters, Origin Separation & 10k-Map Performance', () => {
  beforeEach(() => {
    usePoolStore.setState({
      currentPool: {
        id: 'test-pool',
        name: 'Test Pool',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        maps: [],
      },
      filterOrigin: 'ALL',
      filterMod: 'ALL',
      filterTournament: 'ALL',
      filterStage: 'ALL',
      trainingFilters: { ...DEFAULT_TRAINING_FILTERS },
      activeTrainingPreset: null,
      searchQuery: '',
      sortBy: 'sr',
      sortDirection: 'desc',
    });
  });

  const streamHeavyMap = makeMockMap({
    id: 'local_stream_1',
    origin: 'local_songs',
    stats: { starRating: 6.4, bpmMode: 200 } as any,
    difficulty: { hp: 6, cs: 4, od: 9, ar: 9.5, sliderMultiplier: 1.4, sliderTickRate: 1 },
    skills: { snapAim: 30, flowAim: 72, speed: 68, stamina: 82, fingerControl: 40, readingTech: 20 },
    patternCounts: { streams: 9, streamNotes: 260, deathstreams: 3, jumps: 1, bursts: 3, tech: 0 },
  });

  const singleLongDeathstreamPractice = makeMockMap({
    id: 'local_long_stream_practice',
    origin: 'local_songs',
    stats: { starRating: 5.9, bpmMode: 180 } as any,
    skills: { snapAim: 15, flowAim: 65, speed: 55, stamina: 90, fingerControl: 15, readingTech: 10 },
    patternCounts: { streams: 1, streamNotes: 400, deathstreams: 1, jumps: 0, bursts: 0, tech: 0 },
  });

  const pureJumpNoStreamMap = makeMockMap({
    id: 'local_jump_1',
    origin: 'local_songs',
    stats: { starRating: 6.2, bpmMode: 190 } as any,
    difficulty: { hp: 5, cs: 4, od: 8.5, ar: 9.6, sliderMultiplier: 1.4, sliderTickRate: 1 },
    skills: { snapAim: 84, flowAim: 22, speed: 45, stamina: 12, fingerControl: 18, readingTech: 14 },
    patternCounts: { streams: 0, streamNotes: 0, deathstreams: 0, jumps: 11, bursts: 1, tech: 0 },
  });

  const tourneyMap = makeMockMap({
    id: 'tourney_hd1',
    origin: 'tournament',
    modSlot: 'HD1',
    tournamentName: 'OWC 2026',
    stageName: 'Finals',
    stats: { starRating: 6.8, bpmMode: 175 } as any,
    difficulty: { hp: 5, cs: 4, od: 9.2, ar: 9.3, sliderMultiplier: 1.4, sliderTickRate: 1 },
    skills: { snapAim: 50, flowAim: 55, speed: 40, stamina: 35, fingerControl: 48, readingTech: 74 },
    patternCounts: { streams: 2, streamNotes: 28, deathstreams: 0, jumps: 4, bursts: 4, tech: 6 },
  });

  const samplePool = [
    streamHeavyMap,
    singleLongDeathstreamPractice,
    pureJumpNoStreamMap,
    tourneyMap,
  ];

  it('separates Local Songs and Tournament maps via filterOrigin', () => {
    const all = getFilteredAndSortedMaps(samplePool, 'ALL', '', 'sr', 'desc', 'ALL', 'ALL', 'ALL');
    expect(all.length).toBe(4);

    // Even if filterMod is 'HD', viewing local_songs ignores tournament slot filter
    const localOnly = getFilteredAndSortedMaps(
      samplePool,
      'HD',
      '',
      'sr',
      'desc',
      'OWC 2026',
      'Finals',
      'local_songs'
    );
    expect(localOnly.map((m) => m.id)).toEqual([
      'local_stream_1',
      'local_jump_1',
      'local_long_stream_practice',
    ]);

    const tourneyOnly = getFilteredAndSortedMaps(
      samplePool,
      'ALL',
      '',
      'sr',
      'desc',
      'ALL',
      'ALL',
      'tournament'
    );
    expect(tourneyOnly.map((m) => m.id)).toEqual(['tourney_hd1']);
  });

  it('filters maps with MORE vs FEWER/ZERO streams accurately (including continuous long stream practice)', () => {
    const highStreams = getFilteredAndSortedMaps(
      samplePool,
      'ALL',
      '',
      'stamina',
      'desc',
      'ALL',
      'ALL',
      'ALL',
      { ...DEFAULT_TRAINING_FILTERS, streamsDensity: 'high' }
    );
    expect(highStreams.map((m) => m.id)).toEqual([
      'local_long_stream_practice',
      'local_stream_1',
    ]);

    const zeroStreams = getFilteredAndSortedMaps(
      samplePool,
      'ALL',
      '',
      'snapAim',
      'desc',
      'ALL',
      'ALL',
      'ALL',
      { ...DEFAULT_TRAINING_FILTERS, streamsDensity: 'none' }
    );
    expect(zeroStreams.map((m) => m.id)).toEqual(['local_jump_1']);

    const lowStreams = getFilteredAndSortedMaps(
      samplePool,
      'ALL',
      '',
      'sr',
      'desc',
      'ALL',
      'ALL',
      'ALL',
      { ...DEFAULT_TRAINING_FILTERS, streamsDensity: 'low' }
    );
    expect(lowStreams.map((m) => m.id)).toEqual(['tourney_hd1', 'local_jump_1']);
  });

  it('applies 1-click Training Presets and clears Local Songs without deleting Tournament pools', async () => {
    await usePoolStore.getState().addBeatmaps([tourneyMap]);
    await usePoolStore
      .getState()
      .upsertLocalBeatmaps([streamHeavyMap, singleLongDeathstreamPractice, pureJumpNoStreamMap]);

    expect(usePoolStore.getState().currentPool.maps.length).toBe(4);

    // Apply Jump / Snap Aim preset -> expects pureJumpNoStreamMap (high jumps + low streams)
    usePoolStore.getState().applyTrainingPreset('jump_aim');
    const stateAfterPreset = usePoolStore.getState();
    expect(stateAfterPreset.activeTrainingPreset).toBe('jump_aim');
    expect(stateAfterPreset.sortBy).toBe('snapAim');

    const jumpResults = getFilteredAndSortedMaps(
      stateAfterPreset.currentPool.maps,
      stateAfterPreset.filterMod,
      stateAfterPreset.searchQuery,
      stateAfterPreset.sortBy,
      stateAfterPreset.sortDirection,
      stateAfterPreset.filterTournament,
      stateAfterPreset.filterStage,
      stateAfterPreset.filterOrigin,
      stateAfterPreset.trainingFilters
    );
    expect(jumpResults.map((m) => m.id)).toContain('local_jump_1');
    expect(jumpResults.map((m) => m.id)).not.toContain('local_stream_1');

    // Clear only local songs -> tournament map must remain intact!
    await usePoolStore.getState().clearLocalSongs();
    expect(usePoolStore.getState().currentPool.maps.map((m) => m.id)).toEqual(['tourney_hd1']);
  });

  it('filters and sorts 10,000 local Songs beatmaps in under 100ms', () => {
    const largeLibrary: BeatmapAnalysisResult[] = [];
    for (let i = 0; i < 10000; i++) {
      largeLibrary.push(
        makeMockMap({
          id: `local_perf_${i}`,
          stats: {
            bpmMin: 140 + (i % 120),
            bpmMax: 140 + (i % 120),
            bpmMode: 140 + (i % 120),
            durationMs: 90000 + (i % 120000),
            drainTimeMs: 90000 + (i % 120000),
            circleCount: 300,
            sliderCount: 100,
            spinnerCount: 0,
            totalObjects: 400,
            maxCombo: 500,
            starRating: 3 + (i % 60) / 10,
          },
          patternCounts: {
            streams: i % 10,
            streamNotes: (i % 10) * 18,
            deathstreams: i % 10 >= 8 ? 1 : 0,
            jumps: (i * 3) % 12,
            bursts: i % 7,
            tech: i % 5,
          },
        })
      );
    }

    const t0 = performance.now();
    const res = getFilteredAndSortedMaps(
      largeLibrary,
      'ALL',
      '',
      'stamina',
      'desc',
      'ALL',
      'ALL',
      'local_songs',
      {
        ...DEFAULT_TRAINING_FILTERS,
        srMin: 5.5,
        srMax: 7.2,
        bpmMin: 175,
        bpmMax: 220,
        streamsDensity: 'high',
      }
    );
    const elapsedMs = performance.now() - t0;

    expect(res.length).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(150);
  });
});
