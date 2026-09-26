import { BeatmapDifficulty, BeatmapMetadata, HitObject, TimingPoint } from './types';

export interface ParsedBeatmapRaw {
  metadata: BeatmapMetadata;
  difficulty: BeatmapDifficulty;
  timingPoints: TimingPoint[];
  hitObjects: HitObject[];
  rawText: string;
}

/**
 * High-performance client-side .osu format parser.
 * Extracts hitobjects, timing points, difficulty settings, and metadata.
 */
export function parseOsuBeatmap(text: string): ParsedBeatmapRaw {
  const lines = text.split(/\r?\n/);
  let currentSection = '';

  const metadata: BeatmapMetadata = {
    title: '',
    artist: '',
    creator: '',
    version: '',
  };

  const difficulty: BeatmapDifficulty = {
    hp: 5,
    cs: 5,
    od: 5,
    ar: 5,
    sliderMultiplier: 1.4,
    sliderTickRate: 1,
  };

  const timingPoints: TimingPoint[] = [];
  const hitObjects: HitObject[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line || line.startsWith('//')) {
      continue;
    }

    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.slice(1, -1);
      continue;
    }

    if (currentSection === 'General') {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        if (key === 'AudioFilename') metadata.audioFilename = value;
      }
    } else if (currentSection === 'Metadata') {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();

        if (key === 'Title') metadata.title = value;
        else if (key === 'TitleUnicode') metadata.titleUnicode = value;
        else if (key === 'Artist') metadata.artist = value;
        else if (key === 'ArtistUnicode') metadata.artistUnicode = value;
        else if (key === 'Creator') metadata.creator = value;
        else if (key === 'Version') metadata.version = value;
        else if (key === 'Source') metadata.source = value;
        else if (key === 'Tags') metadata.tags = value.split(' ').filter(Boolean);
        else if (key === 'BeatmapID') metadata.beatmapId = parseInt(value, 10) || undefined;
        else if (key === 'BeatmapSetID') metadata.beatmapSetId = parseInt(value, 10) || undefined;
      }
    } else if (currentSection === 'Difficulty') {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.slice(0, colonIdx).trim();
        const val = parseFloat(line.slice(colonIdx + 1).trim());

        if (key === 'HPDrainRate') difficulty.hp = val;
        else if (key === 'CircleSize') difficulty.cs = val;
        else if (key === 'OverallDifficulty') difficulty.od = val;
        else if (key === 'ApproachRate') difficulty.ar = val;
        else if (key === 'SliderMultiplier') difficulty.sliderMultiplier = val;
        else if (key === 'SliderTickRate') difficulty.sliderTickRate = val;
      }
    } else if (currentSection === 'TimingPoints') {
      const parts = line.split(',');
      if (parts.length >= 2) {
        const time = parseFloat(parts[0]);
        const beatLength = parseFloat(parts[1]);
        const meter = parts.length > 2 ? parseInt(parts[2], 10) || 4 : 4;
        const uninherited = parts.length > 6 ? parts[6].trim() === '1' : beatLength > 0;

        if (!isNaN(time) && !isNaN(beatLength)) {
          timingPoints.push({
            time,
            beatLength,
            meter,
            uninherited,
          });
        }
      }
    } else if (currentSection === 'HitObjects') {
      const parts = line.split(',');
      if (parts.length >= 5) {
        const x = parseFloat(parts[0]);
        const y = parseFloat(parts[1]);
        const time = parseFloat(parts[2]);
        const typeBits = parseInt(parts[3], 10);

        if (isNaN(x) || isNaN(y) || isNaN(time) || isNaN(typeBits)) {
          continue;
        }

        const isCircle = (typeBits & 1) !== 0;
        const isSlider = (typeBits & 2) !== 0;
        const isSpinner = (typeBits & 8) !== 0;

        if (isCircle) {
          hitObjects.push({
            x,
            y,
            time,
            type: 'circle',
          });
        } else if (isSlider) {
          const curveData = parts[5] || '';
          const curveParts = curveData.split('|');
          const curveType = curveParts[0] || 'L';
          const points: Array<{ x: number; y: number }> = [{ x, y }];

          for (let p = 1; p < curveParts.length; p++) {
            const coords = curveParts[p].split(':');
            if (coords.length === 2) {
              const px = parseFloat(coords[0]);
              const py = parseFloat(coords[1]);
              if (!isNaN(px) && !isNaN(py)) {
                points.push({ x: px, y: py });
              }
            }
          }

          const repeats = parts.length > 6 ? parseInt(parts[6], 10) || 1 : 1;
          const pixelLength = parts.length > 7 ? parseFloat(parts[7]) || 0 : 0;

          hitObjects.push({
            x,
            y,
            time,
            type: 'slider',
            curveType,
            points,
            repeats,
            pixelLength,
          });
        } else if (isSpinner) {
          const endTime = parts.length > 5 ? parseFloat(parts[5]) || time : time;
          hitObjects.push({
            x,
            y,
            time,
            endTime,
            type: 'spinner',
          });
        }
      }
    }
  }

  // Fallback for metadata if missing
  if (!metadata.title) metadata.title = 'Unknown Title';
  if (!metadata.artist) metadata.artist = 'Unknown Artist';
  if (!metadata.creator) metadata.creator = 'Unknown Mapper';
  if (!metadata.version) metadata.version = 'Normal';

  // Sort timing points and hit objects by time
  timingPoints.sort((a, b) => a.time - b.time);
  hitObjects.sort((a, b) => a.time - b.time);

  return {
    metadata,
    difficulty,
    timingPoints,
    hitObjects,
    rawText: text,
  };
}
