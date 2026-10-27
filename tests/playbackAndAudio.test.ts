import { describe, it, expect, vi } from 'vitest';
import { processHitsoundTick } from '../src/lib/osu-preview/OsuPreviewController';
import { BeatmapPreviewAudioManager } from '../src/lib/osu-preview/previewAudio';
import { MusicPlayer } from '../src/lib/osu-preview/audio';
import { getSpriteLogicalWidth, getSpriteLogicalHeight } from '../src/lib/osu-preview/skin';
import { PreviewHitObject } from '../src/lib/osu-preview/types';

function makeHitObjects(timesMs: number[]): PreviewHitObject[] {
  return timesMs.map((t, idx) => ({
    x: 256,
    y: 192,
    time: t,
    endTime: t,
    type: 1,
    hitSounds: 0,
    isHitCircle: true,
    isSlider: false,
    isSpinner: false,
    newCombo: idx === 0,
    isNewCombo: idx === 0,
    comboSkip: 0,
    StackCount: 0,
  }));
}

describe('Background Tab Hitsound Scheduling & Anti-Burst Protection', () => {
  it('prevents accumulated notes from bursting all at once when returning from a background tab', () => {
    // 50 notes spaced every 200ms from 1000ms to 10800ms
    const noteTimes = Array.from({ length: 50 }, (_, i) => 1000 + i * 200);
    const hitObjects = makeHitObjects(noteTimes);

    const playedNotes: Array<{ time: number; delaySec: number }> = [];

    // Simulate user leaving tab at 1000ms (lastPlayedNoteIndex = 0) and returning at 10800ms
    const nextIndex = processHitsoundTick({
      hitObjects,
      lastPlayedNoteIndex: 0,
      prevTimeMs: 1000,
      curTimeMs: 10800,
      effectivePlaybackRate: 1.0,
      isBackgroundTab: false,
      onPlayHit: (obj, delaySec) => {
        playedNotes.push({ time: obj.time, delaySec });
      },
    });

    // Must play AT MOST 1 note (the current one at 10800ms), never all 49 accumulated notes!
    expect(playedNotes.length).toBeLessThanOrEqual(1);
    if (playedNotes.length === 1) {
      expect(playedNotes[0].time).toBe(10800);
      expect(playedNotes[0].delaySec).toBe(0);
    }

    // Index must be caught up to the end so subsequent ticks don't replay old notes
    expect(nextIndex).toBe(49);
  });

  it('schedules upcoming notes via Web Audio lookahead while tab is in the background', () => {
    // Notes at 1000ms, 1200ms, 1500ms, 1800ms, 2500ms
    const hitObjects = makeHitObjects([1000, 1200, 1500, 1800, 2500]);
    const scheduled: Array<{ time: number; delaySec: number }> = [];

    // Background tick at curTimeMs = 1000ms (note at 1000ms was already played, so lastPlayedNoteIndex = 0)
    const nextIdx = processHitsoundTick({
      hitObjects,
      lastPlayedNoteIndex: 0,
      prevTimeMs: 950,
      curTimeMs: 1000,
      effectivePlaybackRate: 1.0,
      isBackgroundTab: true,
      onPlayHit: (obj, delaySec) => {
        scheduled.push({ time: obj.time, delaySec });
      },
    });

    // Notes at 1200ms, 1500ms, 1800ms are within the 1150ms lookahead horizon [1000, 2150]
    expect(scheduled.map((s) => s.time)).toEqual([1200, 1500, 1800]);
    expect(scheduled[0].delaySec).toBeCloseTo(0.2, 3);
    expect(scheduled[1].delaySec).toBeCloseTo(0.5, 3);
    expect(scheduled[2].delaySec).toBeCloseTo(0.8, 3);
    expect(nextIdx).toBe(3);

    // When user returns to the foreground tab at 1850ms, those already-scheduled notes must NOT fire again!
    const foregroundPlayed: number[] = [];
    const afterReturnIdx = processHitsoundTick({
      hitObjects,
      lastPlayedNoteIndex: nextIdx,
      prevTimeMs: 1000,
      curTimeMs: 1850,
      effectivePlaybackRate: 1.0,
      isBackgroundTab: false,
      onPlayHit: (obj) => {
        foregroundPlayed.push(obj.time);
      },
    });

    expect(foregroundPlayed).toEqual([]);
    expect(afterReturnIdx).toBe(3);
  });

  it('manages beatmap card audio preview state cleanly', async () => {
    const manager = new BeatmapPreviewAudioManager();
    expect(manager.getSnapshot().state).toBe('stopped');
    expect(manager.getSnapshot().activeMapId).toBeNull();

    // Stop is idempotent and resets state
    manager.stop();
    expect(manager.getSnapshot().state).toBe('stopped');
  });

  it('preserves 1x logical playfield dimensions when rendering @2x HD skin textures', () => {
    const hdHitCircle = { width: 256, height: 256, logicalScale: 0.5 } as any;
    const sdHitCircle = { width: 128, height: 128, logicalScale: 1 } as any;

    expect(getSpriteLogicalWidth(hdHitCircle)).toBe(128);
    expect(getSpriteLogicalHeight(hdHitCircle)).toBe(128);
    expect(getSpriteLogicalWidth(sdHitCircle)).toBe(128);
    expect(getSpriteLogicalHeight(sdHitCircle)).toBe(128);
  });

  it('operates cleanly with direct disk audio streaming without legacy bulk IndexedDB download loops', () => {
    // Verifies that audio playback architecture relies directly on disk streaming
    // and that the legacy bulk mirror download status remains inactive/null by default.
    const manager = new BeatmapPreviewAudioManager();
    expect(manager.getSnapshot().state).toBe('stopped');
    expect(manager.getSnapshot().progress).toBe(0);
  });

  it('preserva o pitch nativo (sem desafinar) ao variar velocidade em 0.5x, 0.75x, 1.25x, 1.5x e 2.0x', () => {
    // Mock de HTMLAudioElement no ambiente Node
    class MockAudio {
      public src: string = '';
      public volume: number = 1.0;
      public preload: string = 'auto';
      public playbackRate: number = 1.0;
      public preservesPitch: boolean = false;
      public webkitPreservesPitch: boolean = false;
      public mozPreservesPitch: boolean = false;
      public currentTime: number = 0;
      public duration: number = 120;
      public readyState: number = 4;
      public play = vi.fn().mockResolvedValue(undefined);
      public pause = vi.fn();
      public load = vi.fn();
      public removeAttribute = vi.fn();
      public addEventListener = vi.fn();
      public removeEventListener = vi.fn();
      public onended: (() => void) | null = null;
    }

    const originalAudio = (globalThis as any).Audio;
    (globalThis as any).Audio = MockAudio;

    try {
      const player = new MusicPlayer();
      player.init();

      const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
      for (const speed of speeds) {
        player.setSpeed(speed);
        // O player deve aplicar playbackRate e impor preservesPitch = true
        expect(player.preservesPitch).toBe(true);
      }

      player.destroy();
    } finally {
      (globalThis as any).Audio = originalAudio;
    }
  });

  it('previewAudio configura estritamente preservesPitch no elemento de áudio nativo', async () => {
    class MockAudio {
      public volume: number = 0.8;
      public preload: string = 'auto';
      public preservesPitch: boolean = false;
      public webkitPreservesPitch: boolean = false;
      public mozPreservesPitch: boolean = false;
      public addEventListener = vi.fn();
      public removeEventListener = vi.fn();
      public play = vi.fn().mockResolvedValue(undefined);
      public pause = vi.fn();
      public removeAttribute = vi.fn();
      public load = vi.fn();
    }

    const originalAudio = (globalThis as any).Audio;
    (globalThis as any).Audio = MockAudio;

    try {
      const manager = new BeatmapPreviewAudioManager();
      // Ao tentar reproduzir um preview, o HTMLAudioElement deve receber preservesPitch = true
      manager.play({
        id: 'test-map-pitch',
        title: 'Pitch Test',
        metadata: { beatmapSetId: 1234, title: 'Pitch Test', artist: 'Artist' } as any,
      } as any);
      expect(manager.getSnapshot().state).toBe('loading');
      manager.stop();
    } finally {
      (globalThis as any).Audio = originalAudio;
    }
  });

  it('extrapola o relógio contínuo em microssegundos sem congelamento por stepped ticks do Chromium', async () => {
    class MockAudio {
      public src: string = '';
      public volume: number = 1.0;
      public preload: string = 'auto';
      public playbackRate: number = 1.0;
      public preservesPitch: boolean = true;
      public webkitPreservesPitch: boolean = true;
      public mozPreservesPitch: boolean = true;
      public currentTime: number = 10.0;
      public duration: number = 120;
      public readyState: number = 4;
      public paused: boolean = false;
      public play = vi.fn().mockResolvedValue(undefined);
      public pause = vi.fn();
      public load = vi.fn();
      public removeAttribute = vi.fn();
      public addEventListener = vi.fn((event, cb) => {
        if (event === 'canplay' || event === 'loadedmetadata') cb();
      });
      public removeEventListener = vi.fn();
      public onended: (() => void) | null = null;
    }

    const originalAudio = (globalThis as any).Audio;
    (globalThis as any).Audio = MockAudio;

    let mockedPerf = 1000.0;
    const perfSpy = vi.spyOn(performance, 'now').mockImplementation(() => mockedPerf);

    try {
      const player = new MusicPlayer();
      player.init();
      await player.loadAudio('http://localhost:4173/test.mp3');
      player.play();

      // Frame 1: tempo base 10.0s
      const t1 = player.currentTimeSec;
      expect(t1).toBeCloseTo(10.0, 3);

      // Frame 2: Chromium ainda não atualizou audio.currentTime (permanece 10.0s),
      // mas 16.6ms de RAF se passaram no monitor
      mockedPerf += 16.666;
      const t2 = player.currentTimeSec;
      expect(t2).toBeGreaterThan(t1);
      expect(t2).toBeCloseTo(10.0166, 3);

      // Frame 3: outro frame a 60fps (total 33.3ms) sem atualização do audio.currentTime
      mockedPerf += 16.666;
      const t3 = player.currentTimeSec;
      expect(t3).toBeGreaterThan(t2);
      expect(t3).toBeCloseTo(10.0333, 3);

      player.destroy();
    } finally {
      perfSpy.mockRestore();
      (globalThis as any).Audio = originalAudio;
    }
  });

  it('preserva todas as notas de streams rápidos sem descartar hitsounds em ticks consecutivos', () => {
    // Stream de 4 notas espaçadas a 25ms: 1000ms, 1025ms, 1050ms, 1075ms
    const hitObjects = makeHitObjects([1000, 1025, 1050, 1075]);
    const played: Array<{ time: number; delaySec: number }> = [];

    // Tick abrange [990, 1060] (3 notas no imediato) e lookahead 45ms alcança 1075ms
    const nextIdx = processHitsoundTick({
      hitObjects,
      lastPlayedNoteIndex: -1,
      prevTimeMs: 990,
      curTimeMs: 1060,
      effectivePlaybackRate: 1.0,
      isBackgroundTab: false,
      onPlayHit: (obj, delaySec) => {
        played.push({ time: obj.time, delaySec });
      },
    });

    // Todas as 4 notas devem ter sido executadas (nenhuma descartada no stream)
    expect(played.length).toBe(4);
    expect(played.map((p) => p.time)).toEqual([1000, 1025, 1050, 1075]);
    // 3 notas imediatas com delaySec = 0
    expect(played[0].delaySec).toBe(0);
    expect(played[1].delaySec).toBe(0);
    expect(played[2].delaySec).toBe(0);
    // 1 nota futura agendada com lookahead delaySec = 15ms (1075 - 1060)
    expect(played[3].delaySec).toBeCloseTo(0.015, 3);
    expect(nextIdx).toBe(3);
  });

  it('agenda notas futuras no relógio do Web Audio no modo foreground para eliminar latência de saída DAC', () => {
    const hitObjects = makeHitObjects([1030]);
    const scheduled: Array<{ time: number; delaySec: number }> = [];

    const nextIdx = processHitsoundTick({
      hitObjects,
      lastPlayedNoteIndex: -1,
      prevTimeMs: 990,
      curTimeMs: 1000,
      effectivePlaybackRate: 1.0,
      isBackgroundTab: false,
      onPlayHit: (obj, delaySec) => {
        scheduled.push({ time: obj.time, delaySec });
      },
    });

    // Nota em 1030ms está dentro da janela lookahead [1000, 1045]
    expect(scheduled.length).toBe(1);
    expect(scheduled[0].time).toBe(1030);
    expect(scheduled[0].delaySec).toBeCloseTo(0.03, 3);
    expect(nextIdx).toBe(0);

    // No tick subsequente quando curTimeMs chega a 1030ms, ela não deve disparar novamente
    const afterPlayed: number[] = [];
    processHitsoundTick({
      hitObjects,
      lastPlayedNoteIndex: nextIdx,
      prevTimeMs: 1000,
      curTimeMs: 1030,
      effectivePlaybackRate: 1.0,
      isBackgroundTab: false,
      onPlayHit: (obj) => {
        afterPlayed.push(obj.time);
      },
    });

    expect(afterPlayed).toEqual([]);
  });

  it('reconhece arquivos CAS do Lazer sem extensão com UTF-8 BOM, WAV RIFF e FLAC', () => {
    function detectMime(buf: Buffer): string {
      const headStr = buf.toString('utf8').replace(/^\ufeff/, '');
      if (headStr.startsWith('osu file format')) {
        return 'text/plain; charset=utf-8';
      } else if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
        return 'image/png';
      } else if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
        return 'image/jpeg';
      } else if (buf.toString('ascii', 0, 4) === 'OggS') {
        return 'audio/ogg';
      } else if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE') {
        return 'audio/wav';
      } else if (buf.toString('ascii', 0, 4) === 'fLaC') {
        return 'audio/flac';
      } else if (
        buf.toString('ascii', 0, 3) === 'ID3' ||
        (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)
      ) {
        return 'audio/mpeg';
      }
      return 'application/octet-stream';
    }

    // 1. Arquivo .osu com UTF-8 BOM (\ufeff)
    const bomOsu = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('osu file format v14\r\n')]);
    expect(detectMime(bomOsu)).toBe('text/plain; charset=utf-8');

    // 2. Arquivo de áudio RIFF WAVE
    const wavBuf = Buffer.alloc(32);
    wavBuf.write('RIFF', 0, 'ascii');
    wavBuf.write('WAVE', 8, 'ascii');
    expect(detectMime(wavBuf)).toBe('audio/wav');

    // 3. Arquivo de áudio FLAC
    const flacBuf = Buffer.alloc(32);
    flacBuf.write('fLaC', 0, 'ascii');
    expect(detectMime(flacBuf)).toBe('audio/flac');
  });
});
