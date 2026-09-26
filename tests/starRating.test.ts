import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseOsuBeatmap } from '../src/engine/parser';
import { calculateStarRating } from '../src/engine/starRating';

describe('calculateStarRating', () => {
  const jumpMapText = fs.readFileSync(path.join(__dirname, 'fixtures', 'jump_map.osu'), 'utf-8');
  const streamMapText = fs.readFileSync(path.join(__dirname, 'fixtures', 'stream_map.osu'), 'utf-8');
  const techMapText = fs.readFileSync(path.join(__dirname, 'fixtures', 'tech_map.osu'), 'utf-8');

  it('calculates star ratings accurately for fixture beatmaps', () => {
    const jump = parseOsuBeatmap(jumpMapText);
    const jumpSr = calculateStarRating(jump.hitObjects, jump.difficulty, jump.timingPoints);
    expect(jumpSr.starRating).toBeGreaterThan(4.0);
    expect(jumpSr.aimStars).toBeGreaterThan(jumpSr.speedStars);

    const stream = parseOsuBeatmap(streamMapText);
    const streamSr = calculateStarRating(stream.hitObjects, stream.difficulty, stream.timingPoints);
    expect(streamSr.starRating).toBeGreaterThan(3.0);
    expect(streamSr.speedStars).toBeGreaterThan(streamSr.aimStars);

    const tech = parseOsuBeatmap(techMapText);
    const techSr = calculateStarRating(tech.hitObjects, tech.difficulty, tech.timingPoints);
    expect(techSr.starRating).toBeGreaterThanOrEqual(1.0);
  });
});
