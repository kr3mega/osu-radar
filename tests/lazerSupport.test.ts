import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  detectDefaultOsuLazerDir,
  getLazerDirectoryCandidates,
  getLazerStorageFilePath,
  isPathInsideLazerRoots,
  parseLazerRealmFileMap,
  readLocalLazerBatch,
  scanOsuLazerDirectory,
} from '../src/server/localLazerPlugin';
import {
  buildOsuLazerUrl,
  buildOsuStableUrl,
  getModFromSlot,
  toggleMod,
  setMod,
} from '../src/lib/osu-preview/mods';
import {
  getFilteredAndSortedMaps,
  usePoolStore,
} from '../src/store/usePoolStore';
import { BeatmapAnalysisResult } from '../src/engine/types';

function makeMockBeatmap(overrides: Partial<BeatmapAnalysisResult> & { id: string }): BeatmapAnalysisResult {
  return {
    id: overrides.id,
    fileName: overrides.fileName || `${overrides.id}.osu`,
    origin: overrides.origin || 'local_songs',
    localClient: overrides.localClient,
    modSlot: overrides.modSlot || 'LOCAL',
    tournamentName: overrides.tournamentName,
    stageName: overrides.stageName,
    localOsuPath: overrides.localOsuPath,
    localAudioPath: overrides.localAudioPath,
    localBgPath: overrides.localBgPath,
    metadata: {
      title: 'Lazer Test Beatmap',
      artist: 'Lazer Artist',
      creator: 'Mapper',
      version: 'Extra',
      beatmapId: 1001,
      beatmapSetId: 2002,
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
      starRating: 5.8,
      ...overrides.stats,
    },
    skills: {
      snapAim: 45,
      flowAim: 35,
      speed: 40,
      stamina: 30,
      stream: 35,
      burst: 38,
      fingerControl: 25,
      accuracy: 40,
      readingTech: 20,
      ...overrides.skills,
    },
    timeline: overrides.timeline || [],
    topSkills: ['snapAim', 'speed'],
    calculatedAt: Date.now(),
  };
}

describe('osu!lazer Support & Native Architecture Port', () => {
  let tempLazerDir: string;
  let tempFilesDir: string;
  let tempRealmPath: string;

  beforeEach(() => {
    tempLazerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osu-lazer-test-'));
    tempFilesDir = path.join(tempLazerDir, 'files');
    tempRealmPath = path.join(tempLazerDir, 'client.realm');
    fs.mkdirSync(tempFilesDir, { recursive: true });

    usePoolStore.setState({
      currentPool: {
        id: 'test_pool',
        name: 'Test Pool',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        maps: [],
      },
      filterOrigin: 'ALL',
      filterMod: 'ALL',
      filterTournament: 'ALL',
      filterStage: 'ALL',
      trainingFilters: undefined,
      prioritizedSkills: [],
      selectedMapId: null,
    });
  });

  describe('Storage & Content-Addressed Hash Resolution', () => {
    it('resolves CAS paths correctly in the files/<c0>/<c0c1>/<hash> hierarchy', () => {
      const hash = '00266af28903c7a76c7950762df57750b14f4011a239b87203187fa16c2f0132';
      const resolved = getLazerStorageFilePath(tempLazerDir, hash);
      const expected = path.join(tempFilesDir, '0', '00', hash);
      expect(resolved).toBe(expected);
    });

    it('handles uppercase and trimmed hashes safely', () => {
      const hash = '  00266AF28903C7A76C7950762DF57750B14F4011A239B87203187FA16C2F0132  ';
      const resolved = getLazerStorageFilePath(tempLazerDir, hash);
      const expected = path.join(tempFilesDir, '0', '00', hash.trim().toLowerCase());
      expect(resolved).toBe(expected);
    });

    it('rejects invalid or malformed hashes', () => {
      expect(getLazerStorageFilePath(tempLazerDir, 'invalid-hash')).toBe('');
      expect(getLazerStorageFilePath(tempLazerDir, '')).toBe('');
    });

    it('enforces path traversal boundaries outside osu!lazer directory', () => {
      const authorized = new Set([path.resolve(tempLazerDir)]);
      const valid = path.join(tempFilesDir, '0', '00', '00266af28903c7a76c7950762df57750b14f4011a239b87203187fa16c2f0132');
      const malicious = path.join(tempLazerDir, '..', 'windows', 'system32', 'cmd.exe');

      expect(isPathInsideLazerRoots(valid, authorized)).toBe(true);
      expect(isPathInsideLazerRoots(malicious, authorized)).toBe(false);
      expect(isPathInsideLazerRoots('', authorized)).toBe(false);
    });
  });

  describe('Directory Detection across Operating Systems', () => {
    it('returns candidate paths including APPDATA and user home', () => {
      const candidates = getLazerDirectoryCandidates();
      expect(candidates.length).toBeGreaterThan(0);
      if (process.env.APPDATA) {
        expect(candidates).toContain(path.join(process.env.APPDATA, 'osu'));
      }
    });

    it('detects an existing osu!lazer directory with files and realm database', async () => {
      fs.writeFileSync(tempRealmPath, 'T-DB-REALM-TEST');
      const b0 = path.join(tempFilesDir, '0');
      fs.mkdirSync(b0, { recursive: true });

      const info = await detectDefaultOsuLazerDir();
      expect(info).toBeDefined();
      expect(typeof info.detectedPath).toBe('string');
      expect(typeof info.exists).toBe('boolean');
    });
  });

  describe('Realm String Parser & Asset Mapping', () => {
    it('parses SHA256 hashes and associated filenames from realm binary data', () => {
      const dummyOsuHash = '00266af28903c7a76c7950762df57750b14f4011a239b87203187fa16c2f0132';
      const dummyAudioHash = '90841fb3e9312c703af8256140d38e76b9bf6b471b0e03efab8c0dd0a1cfa155';
      const dummyBgHash = '7e54d877ff53c825045ddd4cffec5df16fc426c9e4f73f1458649e01d62b1a8f';

      const realmContent = `T-DB test header
AAAA   A${dummyOsuHash}   Artist - Title [Insane].osu
AAAA   A${dummyAudioHash}   audio.mp3
AAAA   A${dummyBgHash}   bg.jpg
`;
      fs.writeFileSync(tempRealmPath, realmContent, 'utf8');

      const map = parseLazerRealmFileMap(tempRealmPath);
      expect(map.get('artist - title [insane].osu')).toBe(dummyOsuHash);
      expect(map.get('audio.mp3')).toBe(dummyAudioHash);
      expect(map.get('bg.jpg')).toBe(dummyBgHash);
    });

    it('returns an empty map gracefully when client.realm is missing or invalid', () => {
      const map = parseLazerRealmFileMap(path.join(tempLazerDir, 'non_existent.realm'));
      expect(map.size).toBe(0);
    });
  });

  describe('Lazer File Scanner & Batch Reader', () => {
    it('scans files/ directory and extracts .osu beatmaps', async () => {
      const osuHash = '00266af28903c7a76c7950762df57750b14f4011a239b87203187fa16c2f0132';
      const bucketDir = path.join(tempFilesDir, '0', '00');
      fs.mkdirSync(bucketDir, { recursive: true });

      const beatmapContent = `osu file format v14

[General]
AudioFilename: audio.mp3
Mode: 0

[Metadata]
Title:Lazer Test Song
Artist:Lazer Test Artist
Creator:Mapper
Version:Expert

[Difficulty]
HPDrainRate:5
CircleSize:4
OverallDifficulty:8
ApproachRate:9.2
SliderMultiplier:1.4
SliderTickRate:1

[Events]
0,0,"bg.jpg",0,0

[HitObjects]
256,192,1000,1,0,0:0:0:0:
300,200,1500,1,0,0:0:0:0:
`;
      const osuFile = path.join(bucketDir, osuHash);
      fs.writeFileSync(osuFile, beatmapContent, 'utf8');

      const result = await scanOsuLazerDirectory(tempLazerDir);
      expect(result.beatmapCount).toBe(1);
      expect(result.entries[0].hash).toBe(osuHash);
      expect(result.entries[0].osuPath).toBe(osuFile);
    });

    it('batch reads .osu files and pairs with resolved audio & background paths', async () => {
      const osuHash = '00266af28903c7a76c7950762df57750b14f4011a239b87203187fa16c2f0132';
      const audioHash = '90841fb3e9312c703af8256140d38e76b9bf6b471b0e03efab8c0dd0a1cfa155';
      const bgHash = '7e54d877ff53c825045ddd4cffec5df16fc426c9e4f73f1458649e01d62b1a8f';

      const bucketOsu = path.join(tempFilesDir, '0', '00');
      const bucketAudio = path.join(tempFilesDir, '9', '90');
      const bucketBg = path.join(tempFilesDir, '7', '7e');

      fs.mkdirSync(bucketOsu, { recursive: true });
      fs.mkdirSync(bucketAudio, { recursive: true });
      fs.mkdirSync(bucketBg, { recursive: true });

      const osuPath = path.join(bucketOsu, osuHash);
      const audioPath = path.join(bucketAudio, audioHash);
      const bgPath = path.join(bucketBg, bgHash);

      fs.writeFileSync(audioPath, 'AUDIO_BYTES');
      fs.writeFileSync(bgPath, 'BG_BYTES');

      const realmContent = `
AAAA   A${osuHash}   test.osu
AAAA   A${audioHash}   audio.mp3
AAAA   A${bgHash}   bg.jpg
`;
      fs.writeFileSync(tempRealmPath, realmContent, 'utf8');

      const beatmapContent = `osu file format v14
[General]
AudioFilename: audio.mp3
[Events]
0,0,"bg.jpg",0,0
`;
      fs.writeFileSync(osuPath, beatmapContent, 'utf8');

      const batch = await readLocalLazerBatch(
        [{ osuPath, hash: osuHash }],
        tempLazerDir,
        new Set([path.resolve(tempLazerDir)])
      );

      expect(batch.length).toBe(1);
      expect(batch[0].localAudioPath).toBe(audioPath);
      expect(batch[0].localBgPath).toBe(bgPath);
      expect(batch[0].text).toContain('AudioFilename: audio.mp3');
    });
  });

  describe('osu!lazer Protocol & URL Generation', () => {
    it('generates correct osulazer:// and osu:// URLs for beatmaps and beatmapsets', () => {
      expect(buildOsuLazerUrl(123456)).toBe('osulazer://b/123456');
      expect(buildOsuLazerUrl(undefined, 78910)).toBe('osulazer://s/78910');
      expect(buildOsuLazerUrl()).toBe('osulazer://');

      expect(buildOsuStableUrl(123456)).toBe('osu://b/123456');
      expect(buildOsuStableUrl(undefined, 78910)).toBe('osu://s/78910');
      expect(buildOsuStableUrl()).toBe('osu://');
    });
  });

  describe('Lazer Mod Mappings & Preview Integrations', () => {
    it('derives Lazer-specific mods CL, DA, and MR from slot names', () => {
      expect(getModFromSlot('CL1')).toBe('cl');
      expect(getModFromSlot('DA')).toBe('da');
      expect(getModFromSlot('MR')).toBe('mr');
    });

    it('toggles and sets Lazer mods without conflicting standard mods', () => {
      const activeMods = new Set<any>(['hd', 'dt']);
      expect(toggleMod(activeMods, 'cl')).toBe(true);
      expect(activeMods.has('cl')).toBe(true);
      expect(activeMods.has('hd')).toBe(true);
      expect(activeMods.has('dt')).toBe(true);

      setMod(activeMods, 'da', true);
      expect(activeMods.has('da')).toBe(true);

      setMod(activeMods, 'cl', false);
      expect(activeMods.has('cl')).toBe(false);
    });
  });

  describe('Pool Store: Separation and Selective Filtering of Stable vs Lazer', () => {
    it('separates osu!stable, osu!lazer, and tournament mappools in filterOrigin', () => {
      const stableMap = makeMockBeatmap({
        id: 'stable_1',
        origin: 'local_songs',
        localClient: 'stable',
        localOsuPath: 'C:\\osu!\\Songs\\123\\diff.osu',
      });
      const lazerMap = makeMockBeatmap({
        id: 'lazer_1',
        origin: 'lazer',
        localClient: 'lazer',
        localOsuPath: 'C:\\AppData\\Roaming\\osu\\files\\0\\00\\hash',
      });
      const tourneyMap = makeMockBeatmap({
        id: 'tourney_1',
        origin: 'tournament',
        tournamentName: 'OWC 2026',
        modSlot: 'NM1',
      });

      const allMaps = [stableMap, lazerMap, tourneyMap];

      // 1. ALL
      const all = getFilteredAndSortedMaps(allMaps, 'ALL', '', 'sr', 'desc', 'ALL', 'ALL', 'ALL');
      expect(all.length).toBe(3);

      // 2. All Local (both Stable + Lazer)
      const localAll = getFilteredAndSortedMaps(allMaps, 'ALL', '', 'sr', 'desc', 'ALL', 'ALL', 'local_songs');
      expect(localAll.length).toBe(2);
      expect(localAll.map((m) => m.id)).toEqual(['stable_1', 'lazer_1']);

      // 3. Stable only
      const stableOnly = getFilteredAndSortedMaps(allMaps, 'ALL', '', 'sr', 'desc', 'ALL', 'ALL', 'stable');
      expect(stableOnly.length).toBe(1);
      expect(stableOnly[0].id).toBe('stable_1');

      // 4. Lazer only
      const lazerOnly = getFilteredAndSortedMaps(allMaps, 'ALL', '', 'sr', 'desc', 'ALL', 'ALL', 'lazer');
      expect(lazerOnly.length).toBe(1);
      expect(lazerOnly[0].id).toBe('lazer_1');

      // 5. Tournament only
      const tourneyOnly = getFilteredAndSortedMaps(allMaps, 'ALL', '', 'sr', 'desc', 'ALL', 'ALL', 'tournament');
      expect(tourneyOnly.length).toBe(1);
      expect(tourneyOnly[0].id).toBe('tourney_1');
    });

    it('selectively clears only Lazer maps or only Stable maps without deleting tournament pools', async () => {
      const stableMap = makeMockBeatmap({
        id: 'stable_map_1',
        origin: 'local_songs',
        localClient: 'stable',
        localOsuPath: 'C:\\osu!\\Songs\\123\\diff.osu',
      });
      const lazerMap = makeMockBeatmap({
        id: 'lazer_map_1',
        origin: 'lazer',
        localClient: 'lazer',
        localOsuPath: 'C:\\AppData\\Roaming\\osu\\files\\0\\00\\hash',
      });
      const tourneyMap = makeMockBeatmap({
        id: 'tourney_map_1',
        origin: 'tournament',
        tournamentName: '6WC 2026',
        modSlot: 'HD1',
      });

      usePoolStore.setState({
        currentPool: {
          id: 'test',
          name: 'Pool',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          maps: [stableMap, lazerMap, tourneyMap],
        },
      });

      // Clear only Lazer
      await usePoolStore.getState().clearLocalSongs('lazer');
      let current = usePoolStore.getState().currentPool.maps;
      expect(current.some((m) => m.id === 'lazer_map_1')).toBe(false);
      expect(current.some((m) => m.id === 'stable_map_1')).toBe(true);
      expect(current.some((m) => m.id === 'tourney_map_1')).toBe(true);

      // Clear only Stable
      await usePoolStore.getState().clearLocalSongs('stable');
      current = usePoolStore.getState().currentPool.maps;
      expect(current.some((m) => m.id === 'stable_map_1')).toBe(false);
      expect(current.some((m) => m.id === 'tourney_map_1')).toBe(true);
    });
  });
});
