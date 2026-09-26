import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { analyzeBeatmap } from '../src/engine/analyzer';
import { parseOsuBeatmap } from '../src/engine/parser';

describe('osuRadar Kinematic Engine & Beatmap Analyzer', () => {
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
    expect(result.skills.snapAim).toBeGreaterThan(60);
    expect(result.skills.snapAim).toBeGreaterThan(result.skills.stamina);
    expect(result.topSkills).toContain('snapAim');
    expect(result.timeline.length).toBeGreaterThan(0);
  });

  it('classifies stream_map with Speed / Stamina predominance', async () => {
    const result = await analyzeBeatmap(streamMapText, 'stream_map.osu');
    expect(result.skills.speed).toBeGreaterThan(50);
    expect(result.skills.stamina).toBeGreaterThan(50);
    expect(result.skills.speed).toBeGreaterThan(result.skills.flowAim);
    expect(result.topSkills.some((s) => s === 'speed' || s === 'stamina')).toBe(true);
  });

  it('detects high Reading & Tech in tech_map with SV shifts and complex sliders', async () => {
    const result = await analyzeBeatmap(techMapText, 'tech_map.osu');
    expect(result.skills.readingTech).toBeGreaterThan(30);
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
});
