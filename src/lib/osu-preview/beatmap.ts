import { clamp, distance } from './functions';
import { HitObject } from './HitObject';
import { PreviewBeatmap, PreviewHitObject, OsuMod } from './types';
import { getFollowPosition } from './slider';

export function parseBeatmapText(
  text: string,
  activeMods: Set<OsuMod> = new Set()
): PreviewBeatmap {
  const result: PreviewBeatmap = {
    General: {
      AudioFilename: '',
      StackLeniency: 0.7,
      Mode: 0,
    },
    Difficulty: {
      HPDrainRate: 5,
      CircleSize: 5,
      OverallDifficulty: 5,
      ApproachRate: 5,
      SliderMultiplier: 1.4,
      SliderTickRate: 1,
    },
    TimingPoints: [],
    Colours: {},
    Events: [],
    HitObjects: [],
    HitObjects_drawOrder: [],
    radius: 32,
    preempt: 1200,
    fadein: 800,
    fadeout: 240,
    duration: 0,
  };

  const lines = text.split('\n');
  let currentCategory = '';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line || line.startsWith('//')) continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      currentCategory = line.slice(1, -1).trim();
      continue;
    }

    switch (currentCategory) {
      case 'General': {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join(':').trim();
          if (key === 'AudioFilename') result.General.AudioFilename = val;
          else if (key === 'StackLeniency') result.General.StackLeniency = parseFloat(val) || 0.7;
          else if (key === 'Mode') result.General.Mode = parseInt(val, 10) || 0;
        }
        break;
      }
      case 'Difficulty': {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parseFloat(parts[1].trim());
          if (key === 'HPDrainRate') result.Difficulty.HPDrainRate = val;
          else if (key === 'CircleSize') result.Difficulty.CircleSize = val;
          else if (key === 'OverallDifficulty') result.Difficulty.OverallDifficulty = val;
          else if (key === 'ApproachRate') result.Difficulty.ApproachRate = val;
          else if (key === 'SliderMultiplier') result.Difficulty.SliderMultiplier = val;
          else if (key === 'SliderTickRate') result.Difficulty.SliderTickRate = val;
        }
        break;
      }
      case 'TimingPoints': {
        const parts = line.split(',');
        if (parts.length >= 2) {
          const time = parseFloat(parts[0]);
          const beatLength = parseFloat(parts[1]);
          const meter = parts.length > 2 ? parseInt(parts[2], 10) || 4 : 4;
          const sampleSet = parts.length > 3 ? parseInt(parts[3], 10) || 0 : 0;
          const sampleIndex = parts.length > 4 ? parseInt(parts[4], 10) || 0 : 0;
          const volume = parts.length > 5 ? parseInt(parts[5], 10) || 100 : 100;
          const uninherited = parts.length > 6 ? parts[6].trim() === '1' : beatLength > 0;
          const effects = parts.length > 7 ? parseInt(parts[7], 10) || 0 : 0;

          if (!isNaN(time) && !isNaN(beatLength)) {
            result.TimingPoints.push([
              time,
              beatLength,
              meter,
              sampleSet,
              sampleIndex,
              volume,
              uninherited,
              effects,
            ]);
          }
        }
        break;
      }
      case 'Colours': {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join(':').trim();
          if (result.Colours) {
            result.Colours[key] = val;
          }
        }
        break;
      }
      case 'Events': {
        const parts = line.split(',');
        if (parts.length >= 3) {
          result.Events?.push([parts[0].trim(), parts[1].trim(), parts[2].trim()]);
        }
        break;
      }
      case 'HitObjects': {
        const parts = line.split(',');
        if (parts.length >= 4) {
          try {
            const obj = new HitObject(parts, result.HitObjects.length);
            result.HitObjects.push(obj);
          } catch {
            // skip malformed hitobject
          }
        }
        break;
      }
    }
  }

  // Pre-calculate properties, combos, slider durations, and stacking
  applyBeatmapCalculations(result, activeMods);

  return result;
}

export function applyBeatmapCalculations(
  beatmap: PreviewBeatmap,
  activeMods: Set<OsuMod> = new Set()
): void {
  // Sort timing points by time
  beatmap.TimingPoints.sort((a, b) => a[0] - b[0]);

  // Radius (CS)
  const isEZ = activeMods.has('ez');
  const isHR = activeMods.has('hr');
  const effectiveCS = clamp(0, beatmap.Difficulty.CircleSize * (isEZ ? 0.5 : isHR ? 1.3 : 1), 10);
  beatmap.radius = 54.4 - 4.48 * effectiveCS;

  // AR, Preempt, FadeIn
  const effectiveAR = clamp(0, beatmap.Difficulty.ApproachRate * (isEZ ? 0.5 : isHR ? 1.4 : 1), 10);
  if (effectiveAR < 5) {
    beatmap.preempt = 1200 + (600 * (5 - effectiveAR)) / 5;
    beatmap.fadein = 800 + (400 * (5 - effectiveAR)) / 5;
  } else if (effectiveAR === 5) {
    beatmap.preempt = 1200;
    beatmap.fadein = 800;
  } else {
    beatmap.preempt = 1200 - (750 * (effectiveAR - 5)) / 5;
    beatmap.fadein = 800 - (500 * (effectiveAR - 5)) / 5;
  }
  beatmap.fadeout = 233;

  // Calculate combo numbers and slider durations
  let currentCombo = 1;
  let comboIndex = -1;
  let inheritedTPIndex = -1;
  let uninheritedTPIndex = 0;
  let tpIndex = 0;
  const sliders: PreviewHitObject[] = [];
  let first = true;

  beatmap.HitObjects_drawOrder = [...beatmap.HitObjects];

  for (let i = 0; i < beatmap.HitObjects_drawOrder.length; i++) {
    const obj = beatmap.HitObjects_drawOrder[i];

    // Find current active timing point
    while (
      tpIndex < beatmap.TimingPoints.length &&
      beatmap.TimingPoints[tpIndex][0] <= obj.time
    ) {
      if (beatmap.TimingPoints[tpIndex][6]) {
        // uninherited
        uninheritedTPIndex = tpIndex;
        inheritedTPIndex = -1;
      } else {
        inheritedTPIndex = tpIndex;
      }
      tpIndex++;
    }
    tpIndex = Math.max(tpIndex - 1, 0);

    if (!obj.isSpinner && (first || obj.isNewCombo)) {
      currentCombo = 1;
      comboIndex += 1;
      if (i > 0 && !(beatmap.HitObjects_drawOrder[i - 1].type & 8)) {
        comboIndex += ((16 & obj.type) + (32 & obj.type) + (64 & obj.type)) >> 4;
      }
    }

    if (obj.isSlider) {
      const activeUninherited = beatmap.TimingPoints[uninheritedTPIndex] || [0, 500];
      const activeInherited = inheritedTPIndex !== -1 ? beatmap.TimingPoints[inheritedTPIndex] : null;

      obj.beatLength = activeUninherited[1] || 500;
      const svMultiplier =
        activeInherited && activeInherited[1] < 0 ? -100 / activeInherited[1] : 1;
      const pixelsPerBeat = beatmap.Difficulty.SliderMultiplier * 100 * svMultiplier;

      obj.duration = ((obj.pixelLength || 0) / Math.max(1, pixelsPerBeat)) * obj.beatLength;
      obj.endTime = obj.time + obj.duration * (obj.slides || 1);

      beatmap.HitObjects_drawOrder.splice(i, 1);
      sliders.push(obj);
      i--;
    }

    obj.combo = currentCombo;
    obj.comboIndex = Math.max(0, comboIndex);
    currentCombo++;

    first = false;
    if (obj.isSpinner) {
      first = true;
    }
  }

  // Re-insert sliders into HitObjects_drawOrder sorted by end time
  sliders.sort((a, b) => a.time + (a.duration || 0) - (b.time + (b.duration || 0)));
  for (const slider of sliders) {
    let idx = beatmap.HitObjects_drawOrder.length - 1;
    while (
      idx >= 0 &&
      slider.time + (slider.duration || 0) < beatmap.HitObjects_drawOrder[idx].time
    ) {
      idx--;
    }
    beatmap.HitObjects_drawOrder.splice(idx + 1, 0, slider);
  }

  // Duration
  const lastObj = beatmap.HitObjects[beatmap.HitObjects.length - 1];
  beatmap.duration = lastObj ? Math.max(1000, lastObj.endTime + 1500) : 1000;

  // Object stacking
  applyObjectStacking(beatmap);
}

function applyObjectStacking(beatmap: PreviewBeatmap): void {
  const stackOffset = beatmap.radius / 10;
  const STACK_LENIENCY = 3;
  const stackLeniencyFactor = beatmap.General.StackLeniency ?? 0.7;

  for (let i = beatmap.HitObjects.length - 1; i > 0; i--) {
    let n = i;
    let objectI = beatmap.HitObjects[i];

    if (objectI.StackCount !== 0 || objectI.isSpinner) continue;

    if (objectI.isHitCircle) {
      while (--n >= 0) {
        const objectN = beatmap.HitObjects[n];
        if (objectN.isSpinner) continue;

        const objectNEndTime = objectN.isSlider
          ? objectN.time + (objectN.duration || 0) * (objectN.slides || 1)
          : objectN.time;

        if (objectI.time - beatmap.preempt * stackLeniencyFactor > objectNEndTime) {
          break;
        }

        if (objectN.isSlider) {
          const rawEnd =
            (objectN.slides || 1) % 2
              ? getFollowPosition(objectN, objectN.pixelLength || 0)
              : [objectN.x, objectN.y];
          const endPos: [number, number] = [rawEnd[0], rawEnd[1]];

          if (distance(endPos, [objectI.x, objectI.y]) < STACK_LENIENCY) {
            const offset = objectI.StackCount - objectN.StackCount + 1;
            for (let j = n + 1; j <= i; j++) {
              if (
                distance(endPos, [beatmap.HitObjects[j].x, beatmap.HitObjects[j].y]) <
                STACK_LENIENCY
              ) {
                beatmap.HitObjects[j].StackCount -= offset;
              }
            }
            break;
          }
        }

        if (distance([objectN.x, objectN.y], [objectI.x, objectI.y]) < STACK_LENIENCY) {
          objectN.StackCount = objectI.StackCount + 1;
          objectI = objectN;
        }
      }
    } else if (objectI.isSlider) {
      while (--n >= 0) {
        const objectN = beatmap.HitObjects[n];
        if (objectN.isSpinner) continue;

        if (objectI.time - beatmap.preempt * stackLeniencyFactor > objectN.time) {
          break;
        }

        const rawComp =
          objectN.isSlider && (objectN.slides || 1) % 2
            ? getFollowPosition(objectN, objectN.pixelLength || 0)
            : [objectN.x, objectN.y];
        const compPos: [number, number] = [rawComp[0], rawComp[1]];

        if (distance(compPos, [objectI.x, objectI.y]) < STACK_LENIENCY) {
          objectN.StackCount = objectI.StackCount + 1;
          objectI = objectN;
        }
      }
    }
  }

  for (const obj of beatmap.HitObjects) {
    if (obj.StackCount !== 0) {
      obj.x -= stackOffset * obj.StackCount;
      obj.y -= stackOffset * obj.StackCount;
    }
  }
}

/**
 * Ensures valid .osu raw text is available for any BeatmapAnalysisResult.
 */
export function getOrReconstructBeatmapText(map: any): string {
  if (map.rawText && typeof map.rawText === 'string' && map.rawText.length > 50) {
    return map.rawText;
  }

  const diff = map.difficulty || {
    hp: 5,
    cs: 5,
    od: 5,
    ar: 5,
    sliderMultiplier: 1.4,
    sliderTickRate: 1,
  };

  const meta = map.metadata || {
    title: 'Unknown',
    artist: 'Unknown',
    creator: 'Unknown',
    version: 'Normal',
  };

  const lines: string[] = [
    'osu file format v14',
    '',
    '[General]',
    'AudioFilename: audio.mp3',
    'AudioLeadIn: 0',
    'Mode: 0',
    'StackLeniency: 0.7',
    '',
    '[Metadata]',
    `Title:${meta.title || 'Unknown'}`,
    `Artist:${meta.artist || 'Unknown'}`,
    `Creator:${meta.creator || 'Unknown'}`,
    `Version:${meta.version || 'Normal'}`,
    '',
    '[Difficulty]',
    `HPDrainRate:${diff.hp ?? 5}`,
    `CircleSize:${diff.cs ?? 5}`,
    `OverallDifficulty:${diff.od ?? 5}`,
    `ApproachRate:${diff.ar ?? 5}`,
    `SliderMultiplier:${diff.sliderMultiplier ?? 1.4}`,
    `SliderTickRate:${diff.sliderTickRate ?? 1}`,
    '',
    '[TimingPoints]',
    '0,500,4,2,0,100,1,0',
    '',
    '[HitObjects]',
  ];

  if (Array.isArray(map.hitObjects)) {
    for (const ho of map.hitObjects) {
      if (ho.type === 'slider' && ho.points && ho.points.length > 1) {
        const curvePointsStr = ho.points.slice(1).map((p: any) => `${Math.round(p.x)}:${Math.round(p.y)}`).join('|');
        const curveType = ho.curveType || 'L';
        const curveData = `${curveType}|${curvePointsStr}`;
        const repeats = ho.repeats || 1;
        const pixelLen = ho.pixelLength || 100;
        lines.push(`${Math.round(ho.x)},${Math.round(ho.y)},${Math.round(ho.time)},2,0,${curveData},${repeats},${pixelLen}`);
      } else if (ho.type === 'spinner') {
        const end = ho.endTime || ho.time + 1000;
        lines.push(`${Math.round(ho.x)},${Math.round(ho.y)},${Math.round(ho.time)},8,0,${Math.round(end)}`);
      } else {
        lines.push(`${Math.round(ho.x)},${Math.round(ho.y)},${Math.round(ho.time)},1,0`);
      }
    }
  }

  return lines.join('\n');
}

