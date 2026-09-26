import { HitObject, TimingPoint } from './types';
import { formatTimestamp } from './strains';

export type PatternType =
  | 'deathstream'
  | 'stream'
  | 'spaced_stream'
  | 'burst'
  | 'snap_jumps'
  | 'flow_aim'
  | 'sv_spike'
  | 'rhythm_switch'
  | 'choke_point';

export type PatternSeverity = 'low' | 'medium' | 'high' | 'extreme';

export interface DetectedPattern {
  id: string;
  type: PatternType;
  label: string;
  startTimeMs: number;
  endTimeMs: number;
  startTimestamp: string; // "01:24"
  endTimestamp: string;   // "01:29"
  osuEditorTimestamp: string; // "01:24:500"
  severity: PatternSeverity;
  noteCount: number;
  description: string;
  metrics: {
    bpm?: number;
    maxDistancePx?: number;
    avgVelocity?: number;
    svMultiplier?: number;
  };
}

/**
 * Format milliseconds to precise osu! editor timestamp "MM:SS:mmm"
 */
export function formatOsuEditorTimestamp(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor(Math.max(0, ms) % 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${millis.toString().padStart(3, '0')}`;
}

/**
 * Detects discrete mechanical patterns (streams, jumps, SV shifts, bursts, choke points)
 * with exact timestamps across the beatmap timeline.
 */
export function detectBeatmapPatterns(
  hitObjects: HitObject[],
  timingPoints: TimingPoint[]
): DetectedPattern[] {
  if (hitObjects.length < 3) return [];

  const patterns: DetectedPattern[] = [];
  let patternIdCounter = 1;

  // 1. Detect Streams and Bursts (Fast tapping sequences with deltaT <= 85ms)
  let streamStartIndex = -1;
  let streamDistances: number[] = [];

  for (let i = 1; i < hitObjects.length; i++) {
    const prev = hitObjects[i - 1];
    const curr = hitObjects[i];
    const dt = Math.max(1, curr.time - prev.time);
    const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);

    const isFast = dt <= 85; // >= 180 BPM in 1/4

    if (isFast) {
      if (streamStartIndex === -1) {
        streamStartIndex = i - 1;
        streamDistances = [dist];
      } else {
        streamDistances.push(dist);
      }
    } else {
      // Stream chain ended, evaluate what it was
      if (streamStartIndex !== -1) {
        const chainLength = i - streamStartIndex;
        const startObj = hitObjects[streamStartIndex];
        const endObj = hitObjects[i - 1];
        const durationMs = endObj.time - startObj.time;
        const avgDt = durationMs / Math.max(1, chainLength - 1);
        const tappingBpm = Math.round(60000 / (avgDt * 4));

        const avgDist = streamDistances.reduce((a, b) => a + b, 0) / streamDistances.length;
        const isSpaced = avgDist > 80;

        if (chainLength >= 16) {
          // Deathstream (16+ notes)
          patterns.push({
            id: `pattern-${patternIdCounter++}`,
            type: 'deathstream',
            label: `Deathstream ${tappingBpm} BPM (${chainLength} notas)`,
            startTimeMs: startObj.time,
            endTimeMs: endObj.time,
            startTimestamp: formatTimestamp(startObj.time),
            endTimestamp: formatTimestamp(endObj.time),
            osuEditorTimestamp: formatOsuEditorTimestamp(startObj.time),
            severity: tappingBpm >= 220 || chainLength >= 24 ? 'extreme' : 'high',
            noteCount: chainLength,
            description: `Sequência contínua de ${chainLength} notas a ${tappingBpm} BPM sem pausa para descanso.`,
            metrics: { bpm: tappingBpm, maxDistancePx: Math.max(...streamDistances) },
          });
        } else if (chainLength >= 8) {
          // Normal Stream (8 - 15 notes)
          patterns.push({
            id: `pattern-${patternIdCounter++}`,
            type: isSpaced ? 'spaced_stream' : 'stream',
            label: isSpaced
              ? `Spaced Stream ${tappingBpm} BPM (${chainLength} notas)`
              : `Stream ${tappingBpm} BPM (${chainLength} notas)`,
            startTimeMs: startObj.time,
            endTimeMs: endObj.time,
            startTimestamp: formatTimestamp(startObj.time),
            endTimestamp: formatTimestamp(endObj.time),
            osuEditorTimestamp: formatOsuEditorTimestamp(startObj.time),
            severity: isSpaced ? 'extreme' : 'medium',
            noteCount: chainLength,
            description: isSpaced
              ? `Stream espaçada de alta velocidade de cursor (${avgDist.toFixed(0)}px por nota) a ${tappingBpm} BPM.`
              : `Stream padrão de ${chainLength} notas a ${tappingBpm} BPM.`,
            metrics: { bpm: tappingBpm, maxDistancePx: Math.max(...streamDistances) },
          });
        } else if (chainLength >= 3) {
          // Burst (3 - 7 notes)
          patterns.push({
            id: `pattern-${patternIdCounter++}`,
            type: 'burst',
            label: `Burst ${chainLength}x (${tappingBpm} BPM)`,
            startTimeMs: startObj.time,
            endTimeMs: endObj.time,
            startTimestamp: formatTimestamp(startObj.time),
            endTimestamp: formatTimestamp(endObj.time),
            osuEditorTimestamp: formatOsuEditorTimestamp(startObj.time),
            severity: 'low',
            noteCount: chainLength,
            description: `Burst curto de ${chainLength} notas a ${tappingBpm} BPM.`,
            metrics: { bpm: tappingBpm },
          });
        }

        streamStartIndex = -1;
        streamDistances = [];
      }
    }
  }

  // Flush remaining stream if it reached the end of the map
  if (streamStartIndex !== -1) {
    const chainLength = hitObjects.length - streamStartIndex;
    const startObj = hitObjects[streamStartIndex];
    const endObj = hitObjects[hitObjects.length - 1];
    const durationMs = endObj.time - startObj.time;
    const avgDt = durationMs / Math.max(1, chainLength - 1);
    const tappingBpm = Math.round(60000 / (avgDt * 4));
    const avgDist = streamDistances.length > 0 ? streamDistances.reduce((a, b) => a + b, 0) / streamDistances.length : 0;
    const isSpaced = avgDist > 80;

    if (chainLength >= 16) {
      patterns.push({
        id: `pattern-${patternIdCounter++}`,
        type: 'deathstream',
        label: `Deathstream ${tappingBpm} BPM (${chainLength} notas)`,
        startTimeMs: startObj.time,
        endTimeMs: endObj.time,
        startTimestamp: formatTimestamp(startObj.time),
        endTimestamp: formatTimestamp(endObj.time),
        osuEditorTimestamp: formatOsuEditorTimestamp(startObj.time),
        severity: tappingBpm >= 220 || chainLength >= 24 ? 'extreme' : 'high',
        noteCount: chainLength,
        description: `Sequência contínua de ${chainLength} notas a ${tappingBpm} BPM sem pausa para descanso.`,
        metrics: { bpm: tappingBpm, maxDistancePx: streamDistances.length > 0 ? Math.max(...streamDistances) : 0 },
      });
    } else if (chainLength >= 8) {
      patterns.push({
        id: `pattern-${patternIdCounter++}`,
        type: isSpaced ? 'spaced_stream' : 'stream',
        label: isSpaced
          ? `Spaced Stream ${tappingBpm} BPM (${chainLength} notas)`
          : `Stream ${tappingBpm} BPM (${chainLength} notas)`,
        startTimeMs: startObj.time,
        endTimeMs: endObj.time,
        startTimestamp: formatTimestamp(startObj.time),
        endTimestamp: formatTimestamp(endObj.time),
        osuEditorTimestamp: formatOsuEditorTimestamp(startObj.time),
        severity: isSpaced ? 'extreme' : 'medium',
        noteCount: chainLength,
        description: isSpaced
          ? `Stream espaçada de alta velocidade de cursor (${avgDist.toFixed(0)}px por nota) a ${tappingBpm} BPM.`
          : `Stream padrão de ${chainLength} notas a ${tappingBpm} BPM.`,
        metrics: { bpm: tappingBpm, maxDistancePx: streamDistances.length > 0 ? Math.max(...streamDistances) : 0 },
      });
    } else if (chainLength >= 3) {
      patterns.push({
        id: `pattern-${patternIdCounter++}`,
        type: 'burst',
        label: `Burst ${chainLength}x (${tappingBpm} BPM)`,
        startTimeMs: startObj.time,
        endTimeMs: endObj.time,
        startTimestamp: formatTimestamp(startObj.time),
        endTimestamp: formatTimestamp(endObj.time),
        osuEditorTimestamp: formatOsuEditorTimestamp(startObj.time),
        severity: 'low',
        noteCount: chainLength,
        description: `Burst curto de ${chainLength} notas a ${tappingBpm} BPM.`,
        metrics: { bpm: tappingBpm },
      });
    }
  }

  // 2. Detect Snap Jump Sections (consecutive large jumps with sharp turn angles)
  let jumpStartIndex = -1;
  let jumpCount = 0;
  let maxJumpDist = 0;

  for (let i = 1; i < hitObjects.length; i++) {
    const pPrev = hitObjects[i - 1];
    const pCurr = hitObjects[i];

    const dist = Math.hypot(pCurr.x - pPrev.x, pCurr.y - pPrev.y);
    const dt = Math.max(1, pCurr.time - pPrev.time);

    // Jump condition: spacing >= 170px with 1/2 beat cadence (dt between 90ms and 260ms)
    const isJump = dist >= 170 && dt >= 90 && dt <= 260;

    if (isJump) {
      if (jumpStartIndex === -1) {
        jumpStartIndex = i - 1;
        jumpCount = 1;
        maxJumpDist = dist;
      } else {
        jumpCount++;
        if (dist > maxJumpDist) maxJumpDist = dist;
      }
    } else {
      if (jumpStartIndex !== -1) {
        if (jumpCount >= 4) {
          const startObj = hitObjects[jumpStartIndex];
          const endObj = hitObjects[i - 1];

          patterns.push({
            id: `pattern-${patternIdCounter++}`,
            type: 'snap_jumps',
            label: `Seção de Jumps (${jumpCount} notas, máx ${Math.round(maxJumpDist)}px)`,
            startTimeMs: startObj.time,
            endTimeMs: endObj.time,
            startTimestamp: formatTimestamp(startObj.time),
            endTimestamp: formatTimestamp(endObj.time),
            osuEditorTimestamp: formatOsuEditorTimestamp(startObj.time),
            severity: maxJumpDist >= 250 ? 'extreme' : 'high',
            noteCount: jumpCount,
            description: `Sequência de ${jumpCount} saltos amplos com espaçamento de até ${Math.round(maxJumpDist)}px exigindo mira de alta aceleração.`,
            metrics: { maxDistancePx: Math.round(maxJumpDist) },
          });
        }
        jumpStartIndex = -1;
        jumpCount = 0;
        maxJumpDist = 0;
      }
    }
  }

  // Flush remaining jump sequence if reached the end of the map
  if (jumpStartIndex !== -1 && jumpCount >= 4) {
    const startObj = hitObjects[jumpStartIndex];
    const endObj = hitObjects[hitObjects.length - 1];

    patterns.push({
      id: `pattern-${patternIdCounter++}`,
      type: 'snap_jumps',
      label: `Seção de Jumps (${jumpCount} notas, máx ${Math.round(maxJumpDist)}px)`,
      startTimeMs: startObj.time,
      endTimeMs: endObj.time,
      startTimestamp: formatTimestamp(startObj.time),
      endTimestamp: formatTimestamp(endObj.time),
      osuEditorTimestamp: formatOsuEditorTimestamp(startObj.time),
      severity: maxJumpDist >= 250 ? 'extreme' : 'high',
      noteCount: jumpCount,
      description: `Sequência de ${jumpCount} saltos amplos com espaçamento de até ${Math.round(maxJumpDist)}px exigindo mira de alta aceleração.`,
      metrics: { maxDistancePx: Math.round(maxJumpDist) },
    });
  }

  // 3. Detect Slider Velocity (SV) Shifts
  // Check timing points with notable multiplier shifts
  for (let i = 1; i < timingPoints.length; i++) {
    const prevTp = timingPoints[i - 1];
    const currTp = timingPoints[i];

    if (!currTp.uninherited) {
      const prevSv = prevTp.uninherited ? 1.0 : Math.min(10, Math.max(0.1, -100 / prevTp.beatLength));
      const currSv = Math.min(10, Math.max(0.1, -100 / currTp.beatLength));
      const deltaSv = Math.abs(currSv - prevSv);

      if (deltaSv >= 0.4) {
        patterns.push({
          id: `pattern-${patternIdCounter++}`,
          type: 'sv_spike',
          label: `Mudança de SV (${prevSv.toFixed(1)}x → ${currSv.toFixed(1)}x)`,
          startTimeMs: currTp.time,
          endTimeMs: currTp.time + 1000,
          startTimestamp: formatTimestamp(currTp.time),
          endTimestamp: formatTimestamp(currTp.time + 1000),
          osuEditorTimestamp: formatOsuEditorTimestamp(currTp.time),
          severity: deltaSv >= 0.8 ? 'high' : 'medium',
          noteCount: 1,
          description: `Variação abrupta na velocidade dos sliders de ${prevSv.toFixed(1)}x para ${currSv.toFixed(1)}x, exigindo leitura dinâmica.`,
          metrics: { svMultiplier: Math.round(currSv * 10) / 10 },
        });
      }
    }
  }

  // Sort all patterns chronologically
  patterns.sort((a, b) => a.startTimeMs - b.startTimeMs);

  return patterns;
}
