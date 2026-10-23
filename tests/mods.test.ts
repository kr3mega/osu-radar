import { describe, it, expect } from 'vitest';
import {
  computeMapProperties,
  getPlaySpeed,
  toggleMod,
  setMod,
  getModFromSlot,
  transformOsuCoordY,
} from '../src/lib/osu-preview/mods';
import { parseBeatmapText, applyBeatmapCalculations } from '../src/lib/osu-preview/beatmap';
import { OsuMod } from '../src/lib/osu-preview/types';

describe('osu! Preview Mod System (Authentic osu_preview_extension Mechanism)', () => {
  const sampleBeatmapText = `osu file format v14

[General]
AudioFilename: audio.mp3
Mode: 0
StackLeniency: 0.7

[Difficulty]
HPDrainRate: 5
CircleSize: 4
OverallDifficulty: 8
ApproachRate: 9
SliderMultiplier: 1.4
SliderTickRate: 1

[TimingPoints]
0,500,4,2,0,100,1,0

[HitObjects]
100,100,1000,1,0
200,200,2000,1,0
300,300,3000,1,0
`;

  it('correctly calculates Nomod (default) radius, preempt, and fadein', () => {
    const beatmap = parseBeatmapText(sampleBeatmapText);
    const activeMods = new Set<OsuMod>();

    computeMapProperties(beatmap, activeMods);

    // CS 4: radius = 54.4 - 4.48 * 4 = 36.48
    expect(beatmap.radius).toBeCloseTo(36.48, 2);

    // AR 9: AR >= 5 -> preempt = 1200 - 750 * (9 - 5) / 5 = 600ms
    expect(beatmap.preempt).toBe(600);

    // AR 9: AR >= 5 -> fadein = 800 - 500 * (9 - 5) / 5 = 400ms
    expect(beatmap.fadein).toBe(400);

    expect(beatmap.fadeout).toBe(233);
  });

  it('correctly applies Hard Rock (HR) calculations (CS * 1.3, AR * 1.4)', () => {
    const beatmap = parseBeatmapText(sampleBeatmapText);
    const activeMods = new Set<OsuMod>(['hr']);

    computeMapProperties(beatmap, activeMods);

    // CS 4 * 1.3 = 5.2 -> radius = 54.4 - 4.48 * 5.2 = 31.104
    expect(beatmap.radius).toBeCloseTo(31.104, 2);
    expect(beatmap.radius).toBeLessThan(36.48); // HR makes circles smaller

    // AR 9 * 1.4 = 12.6 -> clamped to 10
    // AR 10 -> preempt = 1200 - 750 * (10 - 5) / 5 = 450ms
    expect(beatmap.preempt).toBe(450);

    // AR 10 -> fadein = 800 - 500 * (10 - 5) / 5 = 300ms
    expect(beatmap.fadein).toBe(300);
  });

  it('correctly applies Easy (EZ) calculations (CS * 0.5, AR * 0.5)', () => {
    const beatmap = parseBeatmapText(sampleBeatmapText);
    const activeMods = new Set<OsuMod>(['ez']);

    computeMapProperties(beatmap, activeMods);

    // CS 4 * 0.5 = 2 -> radius = 54.4 - 4.48 * 2 = 45.44
    expect(beatmap.radius).toBeCloseTo(45.44, 2);
    expect(beatmap.radius).toBeGreaterThan(36.48); // EZ makes circles larger

    // AR 9 * 0.5 = 4.5 (< 5)
    // AR < 5 -> preempt = 1200 + 600 * (5 - 4.5) / 5 = 1260ms
    expect(beatmap.preempt).toBe(1260);

    // AR < 5 -> fadein = 800 + 400 * (5 - 4.5) / 5 = 840ms
    expect(beatmap.fadein).toBe(840);
  });

  it('enforces strict mutual exclusivity between HR and EZ', () => {
    const mods = new Set<OsuMod>();

    // 1. Activate HR
    setMod(mods, 'hr', true);
    expect(mods.has('hr')).toBe(true);
    expect(mods.has('ez')).toBe(false);

    // 2. Activate EZ -> HR must be deactivated
    setMod(mods, 'ez', true);
    expect(mods.has('ez')).toBe(true);
    expect(mods.has('hr')).toBe(false);

    // 3. Activate HR again -> EZ must be deactivated
    toggleMod(mods, 'hr');
    expect(mods.has('hr')).toBe(true);
    expect(mods.has('ez')).toBe(false);

    // 4. Toggle HR off
    toggleMod(mods, 'hr');
    expect(mods.has('hr')).toBe(false);
    expect(mods.has('ez')).toBe(false);
  });

  it('enforces strict mutual exclusivity between DT and HT', () => {
    const mods = new Set<OsuMod>();

    // 1. Activate DT
    setMod(mods, 'dt', true);
    expect(mods.has('dt')).toBe(true);
    expect(mods.has('ht')).toBe(false);
    expect(getPlaySpeed(mods)).toBe(1.5);

    // 2. Activate HT -> DT must be deactivated
    setMod(mods, 'ht', true);
    expect(mods.has('ht')).toBe(true);
    expect(mods.has('dt')).toBe(false);
    expect(getPlaySpeed(mods)).toBe(0.75);

    // 3. Toggle DT -> HT must be deactivated
    toggleMod(mods, 'dt');
    expect(mods.has('dt')).toBe(true);
    expect(mods.has('ht')).toBe(false);
    expect(getPlaySpeed(mods)).toBe(1.5);

    // 4. Toggle DT off -> speed returns to 1.0
    toggleMod(mods, 'dt');
    expect(mods.has('dt')).toBe(false);
    expect(getPlaySpeed(mods)).toBe(1.0);
  });

  it('allows Hidden (HD) to combine with HR, DT, or EZ', () => {
    const mods = new Set<OsuMod>();

    setMod(mods, 'hd', true);
    setMod(mods, 'dt', true);
    expect(mods.has('hd')).toBe(true);
    expect(mods.has('dt')).toBe(true);
    expect(getPlaySpeed(mods)).toBe(1.5);

    setMod(mods, 'hr', true);
    expect(mods.has('hd')).toBe(true);
    expect(mods.has('hr')).toBe(true);
    expect(mods.has('ez')).toBe(false);
  });

  it('accurately flips Y coordinate for Hard Rock (384 - y)', () => {
    expect(transformOsuCoordY(0, true)).toBe(384);
    expect(transformOsuCoordY(384, true)).toBe(0);
    expect(transformOsuCoordY(192, true)).toBe(192);
    expect(transformOsuCoordY(100, true)).toBe(284);

    // Without Hard Rock
    expect(transformOsuCoordY(100, false)).toBe(100);
  });

  it('is completely idempotent: toggling mods repeatedly does NOT mutate hitobject coordinates', () => {
    const beatmap = parseBeatmapText(sampleBeatmapText);
    const initialCoords = beatmap.HitObjects.map((o) => ({ x: o.x, y: o.y }));

    const mods = new Set<OsuMod>();

    // Toggle mods 30 times
    for (let i = 0; i < 30; i++) {
      toggleMod(mods, 'hr');
      applyBeatmapCalculations(beatmap, mods);
      toggleMod(mods, 'ez');
      applyBeatmapCalculations(beatmap, mods);
      toggleMod(mods, 'dt');
      applyBeatmapCalculations(beatmap, mods);
      toggleMod(mods, 'hd');
      applyBeatmapCalculations(beatmap, mods);
    }

    // Coordinates must remain exactly unchanged (fixing the stacking mutation bug)
    beatmap.HitObjects.forEach((obj, idx) => {
      expect(obj.x).toBe(initialCoords[idx].x);
      expect(obj.y).toBe(initialCoords[idx].y);
    });
  });

  it('correctly maps tournament slot strings to corresponding OsuMod', () => {
    expect(getModFromSlot('NM1')).toBeNull();
    expect(getModFromSlot('HD1')).toBe('hd');
    expect(getModFromSlot('HR2')).toBe('hr');
    expect(getModFromSlot('DT3')).toBe('dt');
    expect(getModFromSlot('NC1')).toBe('dt');
    expect(getModFromSlot('EZ1')).toBe('ez');
    expect(getModFromSlot('HT1')).toBe('ht');
    expect(getModFromSlot('FL1')).toBe('fl');
    expect(getModFromSlot('TB')).toBeNull();
    expect(getModFromSlot(undefined)).toBeNull();
  });
});
