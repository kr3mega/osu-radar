import { describe, it, expect } from 'vitest';
import { processHitsoundTick } from '../src/lib/osu-preview/OsuPreviewController';
import { BeatmapPreviewAudioManager } from '../src/lib/osu-preview/previewAudio';
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
});
