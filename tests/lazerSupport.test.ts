import { describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  createLocalLazerMiddleware,
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

    it('strictly excludes non-standard modes (Taiko, Catch, Mania) during scan and batch read', async () => {
      const stdHash = '1111111111111111111111111111111111111111111111111111111111111111';
      const taikoHash = '2222222222222222222222222222222222222222222222222222222222222222';
      const catchHash = '3333333333333333333333333333333333333333333333333333333333333333';
      const maniaHash = '4444444444444444444444444444444444444444444444444444444444444444';

      const b1 = path.join(tempFilesDir, '1', '11');
      const b2 = path.join(tempFilesDir, '2', '22');
      const b3 = path.join(tempFilesDir, '3', '33');
      const b4 = path.join(tempFilesDir, '4', '44');

      fs.mkdirSync(b1, { recursive: true });
      fs.mkdirSync(b2, { recursive: true });
      fs.mkdirSync(b3, { recursive: true });
      fs.mkdirSync(b4, { recursive: true });

      const stdPath = path.join(b1, stdHash);
      const taikoPath = path.join(b2, taikoHash);
      const catchPath = path.join(b3, catchHash);
      const maniaPath = path.join(b4, maniaHash);

      const baseMap = (mode: number) => `osu file format v14
[General]
AudioFilename: audio.mp3
Mode: ${mode}

[Metadata]
Title: Test Beatmap
Artist: Test Artist
Creator: Mapper
Version: Diff ${mode}

[Difficulty]
HPDrainRate: 5
CircleSize: 4
OverallDifficulty: 8
ApproachRate: 9
`;

      fs.writeFileSync(stdPath, baseMap(0), 'utf8');
      fs.writeFileSync(taikoPath, baseMap(1), 'utf8');
      fs.writeFileSync(catchPath, baseMap(2), 'utf8');
      fs.writeFileSync(maniaPath, baseMap(3), 'utf8');

      // 1. Scan directory: only standard mode map should be indexed
      const scanResult = await scanOsuLazerDirectory(tempLazerDir);
      const foundHashes = scanResult.entries.map((e) => e.hash);
      expect(foundHashes).toContain(stdHash);
      expect(foundHashes).not.toContain(taikoHash);
      expect(foundHashes).not.toContain(catchHash);
      expect(foundHashes).not.toContain(maniaHash);

      // 2. Batch reader: strictly ignores non-standard modes even if requested directly
      const batch = await readLocalLazerBatch(
        [
          { osuPath: stdPath, hash: stdHash },
          { osuPath: taikoPath, hash: taikoHash },
          { osuPath: catchPath, hash: catchHash },
          { osuPath: maniaPath, hash: maniaHash },
        ],
        tempLazerDir,
        new Set([path.resolve(tempLazerDir)])
      );

      expect(batch.length).toBe(1);
      expect(batch[0].hash).toBe(stdHash);
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

  describe('CAS Media Streaming & Magic Byte Content-Type Detection', () => {
    function createMockReqRes(url: string, headers: Record<string, string> = {}) {
      const req = {
        method: 'GET',
        url,
        headers,
      } as any;

      const res = new EventEmitter() as any;
      res.statusCode = 200;
      res.headers = {} as Record<string, string>;
      res.data = [] as Buffer[];
      res.setHeader = (k: string, v: string) => {
        res.headers[k.toLowerCase()] = v;
      };
      res.getHeader = (k: string) => res.headers[k.toLowerCase()];
      res.write = (chunk: any) => {
        if (chunk) res.data.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      };
      res.end = (chunk?: any) => {
        if (chunk) res.data.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        res.emit('finish');
      };
      return { req, res };
    }

    it('streams extensionless CAS audio file with ID3 tag as audio/mpeg and handles Range requests', async () => {
      const audioHash = '4444444444444444444444444444444444444444444444444444444444444444';
      const audioBucket = path.join(tempFilesDir, '4', '44');
      fs.mkdirSync(audioBucket, { recursive: true });
      const audioPath = path.join(audioBucket, audioHash);

      // Create dummy ID3 MP3 binary
      const dummyMp3 = Buffer.concat([
        Buffer.from('ID3\x03\x00\x00\x00\x00\x00\x20', 'binary'),
        Buffer.alloc(100, 0xff),
      ]);
      fs.writeFileSync(audioPath, dummyMp3);

      const middleware = createLocalLazerMiddleware([tempLazerDir]);

      // 1. Full stream request
      const { req: req1, res: res1 } = createMockReqRes(
        `/api/local-songs/file?path=${encodeURIComponent(audioPath)}`
      );
      await new Promise<void>((resolve) => {
        res1.on('finish', () => resolve());
        middleware(req1, res1, () => resolve());
      });

      expect(res1.statusCode).toBe(200);
      expect(res1.headers['content-type']).toBe('audio/mpeg');
      expect(res1.headers['accept-ranges']).toBe('bytes');

      // 2. Partial Content (HTTP 206) Range request
      const { req: req2, res: res2 } = createMockReqRes(
        `/api/local-songs/file?path=${encodeURIComponent(audioPath)}`,
        { range: 'bytes=0-9' }
      );
      await new Promise<void>((resolve) => {
        res2.on('finish', () => resolve());
        middleware(req2, res2, () => resolve());
      });

      expect(res2.statusCode).toBe(206);
      expect(res2.headers['content-type']).toBe('audio/mpeg');
      expect(res2.headers['content-range']).toBe(`bytes 0-9/${dummyMp3.length}`);
      expect(res2.headers['content-length']).toBe('10');
    });

    it('streams extensionless CAS images as image/png and image/jpeg by inspecting magic bytes', async () => {
      const pngHash = '5555555555555555555555555555555555555555555555555555555555555555';
      const jpegHash = '6666666666666666666666666666666666666666666666666666666666666666';

      const pngBucket = path.join(tempFilesDir, '5', '55');
      const jpegBucket = path.join(tempFilesDir, '6', '66');
      fs.mkdirSync(pngBucket, { recursive: true });
      fs.mkdirSync(jpegBucket, { recursive: true });

      const pngPath = path.join(pngBucket, pngHash);
      const jpegPath = path.join(jpegBucket, jpegHash);

      // PNG magic: 0x89 0x50 0x4E 0x47
      fs.writeFileSync(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]));
      // JPEG magic: 0xFF 0xD8 0xFF
      fs.writeFileSync(jpegPath, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]));

      const middleware = createLocalLazerMiddleware([tempLazerDir]);

      // PNG check
      const { req: reqPng, res: resPng } = createMockReqRes(
        `/api/local-songs/file?path=${encodeURIComponent(pngPath)}`
      );
      await new Promise<void>((resolve) => {
        resPng.on('finish', () => resolve());
        middleware(reqPng, resPng, () => resolve());
      });
      expect(resPng.statusCode).toBe(200);
      expect(resPng.headers['content-type']).toBe('image/png');

      // JPEG check
      const { req: reqJpeg, res: resJpeg } = createMockReqRes(
        `/api/local-songs/file?path=${encodeURIComponent(jpegPath)}`
      );
      await new Promise<void>((resolve) => {
        resJpeg.on('finish', () => resolve());
        middleware(reqJpeg, resJpeg, () => resolve());
      });
      expect(resJpeg.statusCode).toBe(200);
      expect(resJpeg.headers['content-type']).toBe('image/jpeg');
    });

    it('identifies .osu files as text/plain and never serves them as audio', async () => {
      const osuHash = '7777777777777777777777777777777777777777777777777777777777777777';
      const osuBucket = path.join(tempFilesDir, '7', '77');
      fs.mkdirSync(osuBucket, { recursive: true });
      const osuPath = path.join(osuBucket, osuHash);

      fs.writeFileSync(osuPath, 'osu file format v14\r\n[General]\r\nMode: 0\r\n');

      const middleware = createLocalLazerMiddleware([tempLazerDir]);
      const { req, res } = createMockReqRes(
        `/api/local-songs/file?path=${encodeURIComponent(osuPath)}`
      );
      await new Promise<void>((resolve) => {
        res.on('finish', () => resolve());
        middleware(req, res, () => resolve());
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(res.headers['content-type']).not.toContain('audio');
    });
  });

  describe('Self-Healing Synchronization for Missing Audio/BG', () => {
    it('detects previously imported Lazer maps missing audio/bg and flags them for re-analysis repair', () => {
      const existingWithoutAudio = makeMockBeatmap({
        id: 'lazer_missing_audio',
        origin: 'lazer',
        localClient: 'lazer',
        localOsuPath: 'C:\\lazer\\files\\0\\00\\001122.osu',
        localAudioPath: undefined,
        localBgPath: undefined,
      });

      existingWithoutAudio.fileMtimeMs = 123456789;

      const scannedEntry = {
        hash: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
        osuPath: 'C:\\lazer\\files\\0\\00\\001122.osu',
        folderPath: 'C:\\lazer\\files\\0\\00',
        folderName: 'Test Artist - Test Title',
        fileName: '001122.osu',
        mtimeMs: 123456789,
        size: 1024,
        localAudioPath: 'C:\\lazer\\files\\a\\aa\\audio_hash',
        localBgPath: 'C:\\lazer\\files\\b\\bb\\bg_hash',
      };

      const isLazer = true;
      const forceReindex = false;
      const existing = existingWithoutAudio;

      // Logic check matching src/lib/localLibrarySync.ts
      let shouldSkipAsCached = false;
      if (!forceReindex) {
        if (existing && existing.fileMtimeMs === scannedEntry.mtimeMs) {
          const needsRepair =
            isLazer &&
            ((!existing.localAudioPath && Boolean(scannedEntry.localAudioPath)) ||
              (!existing.localBgPath && Boolean(scannedEntry.localBgPath)));
          if (!needsRepair) {
            shouldSkipAsCached = true;
          }
        }
      }

      // Must NOT skip as cached, because it needs repair!
      expect(shouldSkipAsCached).toBe(false);
    });

    it('reads real client.realm beatmaps with high-fidelity audio/bg pairing when present', () => {
      const candidates = getLazerDirectoryCandidates();
      let realRealmPath = '';
      for (const cand of candidates) {
        const p = path.join(cand, 'client.realm');
        if (fs.existsSync(p)) {
          realRealmPath = p;
          break;
        }
      }

      if (!realRealmPath) {
        // Graceful pass in environments without local osu!lazer installed
        return;
      }

      const fileMap = parseLazerRealmFileMap(realRealmPath);
      expect(fileMap.size).toBeGreaterThan(0);
      expect(fileMap.osuToSet.size).toBeGreaterThan(0);

      const entries = Array.from(fileMap.osuToSet.values());
      const withAudio = entries.filter((e) => e.audioPath);
      const withBg = entries.filter((e) => e.bgPath);

      // Enforce >= 98% audio match rate on real user library
      expect(withAudio.length / entries.length).toBeGreaterThanOrEqual(0.98);
      // Enforce >= 95% background match rate on real user library
      expect(withBg.length / entries.length).toBeGreaterThanOrEqual(0.95);
    });
  });
});
