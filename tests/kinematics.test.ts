import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { analyzeBeatmap } from '../src/engine/analyzer';
import { parseOsuBeatmap } from '../src/engine/parser';
import { detectBeatmapPatterns } from '../src/engine/patterns';
import { HitObject, TimingPoint } from '../src/engine/types';

describe('osuSkills Kinematic Engine & Beatmap Analyzer', () => {
  const jumpMapText = fs.readFileSync(path.join(__dirname, 'fixtures', 'jump_map.osu'), 'utf-8');
  const streamMapText = fs.readFileSync(path.join(__dirname, 'fixtures', 'stream_map.osu'), 'utf-8');
  const techMapText = fs.readFileSync(path.join(__dirname, 'fixtures', 'tech_map.osu'), 'utf-8');

  it('correctly parses .osu metadata, difficulty, and hitobjects', () => {
    const parsed = parseOsuBeatmap(jumpMapText);
    expect(parsed.metadata.title).toBe('Jump Training Showcase');
    expect(parsed.metadata.version).toBe('NM1 Jump Fixture');
    expect(parsed.difficulty.cs).toBe(4);
    expect(parsed.difficulty.ar).toBe(9.5);
    expect(parsed.hitObjects.length).toBe(24);
  });

  it('classifies jump_map with Snap Aim predominance', async () => {
    const result = await analyzeBeatmap(jumpMapText, 'jump_map.osu');
    expect(result.skills.snapAim).toBeGreaterThan(25);
    expect(result.skills.snapAim).toBeGreaterThan(result.skills.stamina);
    expect(result.topSkills).toContain('snapAim');
    expect(result.timeline.length).toBeGreaterThan(0);
  });

  it('classifies stream_map with Speed / Stamina predominance', async () => {
    const result = await analyzeBeatmap(streamMapText, 'stream_map.osu');
    expect(result.skills.speed).toBeGreaterThan(12);
    expect(result.skills.speed).toBeGreaterThan(result.skills.flowAim);
    expect(result.topSkills.some((s) => s === 'speed' || s === 'stamina')).toBe(true);
  });

  it('detects high Reading & Tech in tech_map with SV shifts and complex sliders', async () => {
    const result = await analyzeBeatmap(techMapText, 'tech_map.osu');
    expect(result.patterns!.some((p) => p.type === 'sv_spike')).toBe(true);
    expect(result.stats.sliderCount).toBeGreaterThan(0);
  });

  it('extracts continuous timeline strain points with valid timestamps', async () => {
    const result = await analyzeBeatmap(jumpMapText, 'jump_map.osu');
    expect(result.timeline.length).toBeGreaterThan(0);
    expect(result.timeline[0].timestamp).toMatch(/^\d{2}:\d{2}$/);
    expect(typeof result.timeline[0].totalStrain).toBe('number');
  });

  it('detects discrete patterns with exact timestamps and editor formats', async () => {
    const jumpResult = await analyzeBeatmap(jumpMapText, 'jump_map.osu');
    expect(jumpResult.patterns).toBeDefined();
    expect(jumpResult.patterns!.length).toBeGreaterThan(0);
    expect(jumpResult.patterns!.some((p) => p.type === 'snap_jumps')).toBe(true);

    const streamResult = await analyzeBeatmap(streamMapText, 'stream_map.osu');
    expect(streamResult.patterns).toBeDefined();
    expect(streamResult.patterns!.some((p) => p.type === 'deathstream' || p.type === 'stream')).toBe(true);
    const streamPattern = streamResult.patterns!.find((p) => p.type === 'deathstream' || p.type === 'stream')!;
    expect(streamPattern.startTimestamp).toMatch(/^\d{2}:\d{2}$/);
    expect(streamPattern.osuEditorTimestamp).toMatch(/^\d{2}:\d{2}:\d{3}$/);
    expect(streamPattern.metrics.bpm).toBeGreaterThan(150);

    const techResult = await analyzeBeatmap(techMapText, 'tech_map.osu');
    expect(techResult.patterns).toBeDefined();
    expect(techResult.patterns!.some((p) => p.type === 'sv_spike')).toBe(true);
  });

  it('detects bursts, streams, and Insane-spacing jumps on lower base-BPM / DT maps (e.g. 115 BPM base -> 173 BPM DT)', () => {
    // 115.38 BPM base -> beatLength = 520ms (1/4 = 130ms, 1/2 = 260ms)
    const timingPoints: TimingPoint[] = [
      { time: 0, beatLength: 520, meter: 4, uninherited: true },
    ];

    const hitObjects: HitObject[] = [
      // 5-note 1/4 burst at 130ms intervals
      { x: 100, y: 100, time: 1000, type: 'circle' },
      { x: 120, y: 100, time: 1130, type: 'circle' },
      { x: 140, y: 100, time: 1260, type: 'circle' },
      { x: 160, y: 100, time: 1390, type: 'circle' },
      { x: 180, y: 100, time: 1520, type: 'circle' },
      // 5-note 1/2 Insane jumps (~145px spacing) at 260ms intervals
      { x: 100, y: 200, time: 2500, type: 'circle' },
      { x: 245, y: 200, time: 2760, type: 'circle' },
      { x: 100, y: 200, time: 3020, type: 'circle' },
      { x: 245, y: 200, time: 3280, type: 'circle' },
      { x: 100, y: 200, time: 3540, type: 'circle' },
    ];

    const patterns = detectBeatmapPatterns(hitObjects, timingPoints, 1.5);
    expect(patterns.length).toBeGreaterThanOrEqual(2);
    expect(patterns.some((p) => p.type === 'burst')).toBe(true);
    expect(patterns.some((p) => p.type === 'snap_jumps')).toBe(true);

    const burst = patterns.find((p) => p.type === 'burst')!;
    expect(burst.metrics.bpm).toBe(173); // 115.38 * 1.5 = 173 BPM with DT
  });
});
