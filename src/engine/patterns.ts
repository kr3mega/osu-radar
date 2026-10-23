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
 * Infers a fallback beatLength (ms per 1/1 beat) from HitObject intervals when TimingPoints are missing.
 */
function inferBeatLengthFromObjects(hitObjects: HitObject[]): number {
  const deltas: number[] = [];
  for (let i = 1; i < hitObjects.length; i++) {
    const dt = hitObjects[i].time - hitObjects[i - 1].time;
    if (dt >= 40 && dt <= 600) {
      deltas.push(dt);
    }
  }
  if (deltas.length === 0) return 350; // ~171 BPM fallback
  deltas.sort((a, b) => a - b);
  // 25th percentile typically corresponds to 1/2 or 1/4 beat subdivision
  const p25 = deltas[Math.floor(deltas.length * 0.25)];
  if (p25 <= 145) return p25 * 4;
  return p25 * 2;
}

/**
 * Returns the active uninherited beatLength (ms per beat) at timeMs.
 */
function getBeatLengthAt(
  timeMs: number,
  uninheritedTps: TimingPoint[],
  fallbackBeatLength: number
): number {
  if (uninheritedTps.length === 0) return fallbackBeatLength;
  let active = uninheritedTps[0].beatLength;
  for (let i = 0; i < uninheritedTps.length; i++) {
    if (uninheritedTps[i].time <= timeMs) {
      active = uninheritedTps[i].beatLength;
    } else {
      break;
    }
  }
  return active > 0 ? active : fallbackBeatLength;
}

/**
 * Detects discrete mechanical patterns (streams, bursts, snap jumps, flow aim,
 * SV shifts, rhythm switches, and choke points) with exact timestamps across the beatmap timeline.
 * Rhythm-relative thresholds adapt to the active TimingPoint's BPM so low/mid-BPM and DT maps
 * never fail detection.
 */
export function detectBeatmapPatterns(
  hitObjects: HitObject[],
  timingPoints: TimingPoint[],
  rateMultiplier: number = 1.0
): DetectedPattern[] {
  if (hitObjects.length < 3) return [];

  const patterns: DetectedPattern[] = [];
  let patternIdCounter = 1;
  const safeRate = rateMultiplier > 0 ? rateMultiplier : 1.0;

  const uninheritedTps = timingPoints
    .filter((tp) => tp.uninherited && tp.beatLength > 0)
    .sort((a, b) => a.time - b.time);
  const fallbackBeatLength = inferBeatLengthFromObjects(hitObjects);

  // 1. Detect Streams and Bursts (1/4 or fast 1/3 tapping sequences relative to local BPM)
  let streamStartIndex = -1;
  let streamDistances: number[] = [];

  const emitStreamOrBurst = (startIdx: number, endIdxInclusive: number, distances: number[]) => {
    const chainLength = endIdxInclusive - startIdx + 1;
    if (chainLength < 3) return;

    const startObj = hitObjects[startIdx];
    const endObj = hitObjects[endIdxInclusive];
    const durationMs = Math.max(1, endObj.time - startObj.time);
    const avgDt = durationMs / Math.max(1, chainLength - 1);
    const tappingBpm = Math.round((60000 / (avgDt * 4)) * safeRate);

    const avgDist =
      distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : 0;
    const maxDist = distances.length > 0 ? Math.max(...distances) : 0;
    const isSpaced = avgDist > 75;

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
        severity: tappingBpm >= 210 || chainLength >= 24 ? 'extreme' : 'high',
        noteCount: chainLength,
        description: `Sequência contínua de ${chainLength} notas a ${tappingBpm} BPM sem pausa para descanso.`,
        metrics: { bpm: tappingBpm, maxDistancePx: Math.round(maxDist) },
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
        severity: isSpaced ? 'extreme' : tappingBpm >= 200 ? 'high' : 'medium',
        noteCount: chainLength,
        description: isSpaced
          ? `Stream espaçada de alta velocidade de cursor (${avgDist.toFixed(0)}px por nota) a ${tappingBpm} BPM.`
          : `Stream padrão de ${chainLength} notas a ${tappingBpm} BPM.`,
        metrics: { bpm: tappingBpm, maxDistancePx: Math.round(maxDist) },
      });
    } else {
      patterns.push({
        id: `pattern-${patternIdCounter++}`,
        type: 'burst',
        label: `Burst ${chainLength}x (${tappingBpm} BPM)`,
        startTimeMs: startObj.time,
        endTimeMs: endObj.time,
        startTimestamp: formatTimestamp(startObj.time),
        endTimestamp: formatTimestamp(endObj.time),
        osuEditorTimestamp: formatOsuEditorTimestamp(startObj.time),
        severity: chainLength >= 5 && tappingBpm >= 200 ? 'medium' : 'low',
        noteCount: chainLength,
        description: `Burst curto de ${chainLength} notas em 1/4 a ${tappingBpm} BPM.`,
        metrics: { bpm: tappingBpm, maxDistancePx: Math.round(maxDist) },
      });
    }
  };

  for (let i = 1; i < hitObjects.length; i++) {
    const prev = hitObjects[i - 1];
    const curr = hitObjects[i];
    const dt = Math.max(1, curr.time - prev.time);
    const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);

    const localBeatLength = getBeatLengthAt(curr.time, uninheritedTps, fallbackBeatLength);
    // 1/4 beat at local BPM with 18% tolerance (clamped between 95ms and 165ms so 110–240+ BPM all work)
    const streamMaxDt = Math.min(165, Math.max(95, (localBeatLength / 4) * 1.18));
    const isFast = dt <= streamMaxDt && prev.type !== 'spinner' && curr.type !== 'spinner';

    if (isFast) {
      if (streamStartIndex === -1) {
        streamStartIndex = i - 1;
        streamDistances = [dist];
      } else {
        streamDistances.push(dist);
      }
    } else if (streamStartIndex !== -1) {
      emitStreamOrBurst(streamStartIndex, i - 1, streamDistances);
      streamStartIndex = -1;
      streamDistances = [];
    }
  }

  if (streamStartIndex !== -1) {
    emitStreamOrBurst(streamStartIndex, hitObjects.length - 1, streamDistances);
  }

  // 2. Detect Snap Jump Sections & Flow Aim Sections
  let jumpStartIndex = -1;
  let jumpCount = 0;
  let maxJumpDist = 0;

  let flowStartIndex = -1;
  let flowCount = 0;
  let flowTotalDist = 0;

  const emitSnapJumps = (startIdx: number, endIdxInclusive: number, count: number, maxDist: number) => {
    if (count < 3 || maxDist < 135) return;
    const startObj = hitObjects[startIdx];
    const endObj = hitObjects[endIdxInclusive];
    patterns.push({
      id: `pattern-${patternIdCounter++}`,
      type: 'snap_jumps',
      label: `Seção de Jumps (${count + 1} notas, máx ${Math.round(maxDist)}px)`,
      startTimeMs: startObj.time,
      endTimeMs: endObj.time,
      startTimestamp: formatTimestamp(startObj.time),
      endTimestamp: formatTimestamp(endObj.time),
      osuEditorTimestamp: formatOsuEditorTimestamp(startObj.time),
      severity: maxDist >= 230 ? 'extreme' : maxDist >= 175 ? 'high' : 'medium',
      noteCount: count + 1,
      description: `Sequência de ${count + 1} saltos amplos com espaçamento de até ${Math.round(maxDist)}px exigindo mira de alta aceleração.`,
      metrics: { maxDistancePx: Math.round(maxDist) },
    });
  };

  const emitFlowAim = (startIdx: number, endIdxInclusive: number, count: number, totalDist: number) => {
    if (count < 5) return;
    const startObj = hitObjects[startIdx];
    const endObj = hitObjects[endIdxInclusive];
    const avgDist = Math.round(totalDist / count);
    patterns.push({
      id: `pattern-${patternIdCounter++}`,
      type: 'flow_aim',
      label: `Flow Aim (${count + 1} notas, média ${avgDist}px)`,
      startTimeMs: startObj.time,
      endTimeMs: endObj.time,
      startTimestamp: formatTimestamp(startObj.time),
      endTimestamp: formatTimestamp(endObj.time),
      osuEditorTimestamp: formatOsuEditorTimestamp(startObj.time),
      severity: avgDist >= 115 ? 'high' : 'medium',
      noteCount: count + 1,
      description: `Sequência fluida de ${count + 1} objetos espaçados (${avgDist}px em média) exigindo controle contínuo de cursor.`,
      metrics: { maxDistancePx: avgDist },
    });
  };

  for (let i = 1; i < hitObjects.length; i++) {
    const pPrev = hitObjects[i - 1];
    const pCurr = hitObjects[i];

    const dist = Math.hypot(pCurr.x - pPrev.x, pCurr.y - pPrev.y);
    const rawDt = Math.max(1, pCurr.time - pPrev.time);
    // When jumping out of a slider, measure from slider release if shorter
    const effectiveDt =
      pPrev.type === 'slider' && pPrev.endTime && pPrev.endTime < pCurr.time
        ? Math.max(1, pCurr.time - pPrev.endTime)
        : rawDt;

    const localBeatLength = getBeatLengthAt(pCurr.time, uninheritedTps, fallbackBeatLength);
    const streamMaxDt = Math.min(165, Math.max(95, (localBeatLength / 4) * 1.18));
    const jumpMaxDt = Math.min(440, Math.max(280, (localBeatLength / 2) * 1.35));

    const isSnapJump =
      dist >= 120 &&
      rawDt > streamMaxDt * 0.85 &&
      (rawDt <= jumpMaxDt || effectiveDt <= jumpMaxDt);

    if (isSnapJump) {
      if (jumpStartIndex === -1) {
        jumpStartIndex = i - 1;
        jumpCount = 1;
        maxJumpDist = dist;
      } else {
        jumpCount++;
        if (dist > maxJumpDist) maxJumpDist = dist;
      }
    } else if (jumpStartIndex !== -1) {
      emitSnapJumps(jumpStartIndex, i - 1, jumpCount, maxJumpDist);
      jumpStartIndex = -1;
      jumpCount = 0;
      maxJumpDist = 0;
    }

    const isFlowStep =
      dist >= 70 &&
      dist < 165 &&
      (rawDt <= jumpMaxDt || effectiveDt <= jumpMaxDt) &&
      pPrev.type !== 'spinner' &&
      pCurr.type !== 'spinner';

    if (isFlowStep && !isSnapJump) {
      if (flowStartIndex === -1) {
        flowStartIndex = i - 1;
        flowCount = 1;
        flowTotalDist = dist;
      } else {
        flowCount++;
        flowTotalDist += dist;
      }
    } else if (flowStartIndex !== -1) {
      emitFlowAim(flowStartIndex, i - 1, flowCount, flowTotalDist);
      flowStartIndex = -1;
      flowCount = 0;
      flowTotalDist = 0;
    }
  }

  if (jumpStartIndex !== -1) {
    emitSnapJumps(jumpStartIndex, hitObjects.length - 1, jumpCount, maxJumpDist);
  }
  if (flowStartIndex !== -1) {
    emitFlowAim(flowStartIndex, hitObjects.length - 1, flowCount, flowTotalDist);
  }

  // 3. Detect Slider Velocity (SV) Shifts
  for (let i = 1; i < timingPoints.length; i++) {
    const prevTp = timingPoints[i - 1];
    const currTp = timingPoints[i];

    if (!currTp.uninherited) {
      const prevSv = prevTp.uninherited
        ? 1.0
        : Math.min(10, Math.max(0.1, -100 / prevTp.beatLength));
      const currSv = Math.min(10, Math.max(0.1, -100 / currTp.beatLength));
      const deltaSv = Math.abs(currSv - prevSv);

      if (deltaSv >= 0.25) {
        patterns.push({
          id: `pattern-${patternIdCounter++}`,
          type: 'sv_spike',
          label: `Mudança de SV (${prevSv.toFixed(1)}x → ${currSv.toFixed(1)}x)`,
          startTimeMs: currTp.time,
          endTimeMs: currTp.time + 1000,
          startTimestamp: formatTimestamp(currTp.time),
          endTimestamp: formatTimestamp(currTp.time + 1000),
          osuEditorTimestamp: formatOsuEditorTimestamp(currTp.time),
          severity: deltaSv >= 0.7 ? 'high' : 'medium',
          noteCount: 1,
          description: `Variação abrupta na velocidade dos sliders de ${prevSv.toFixed(1)}x para ${currSv.toFixed(1)}x, exigindo leitura dinâmica.`,
          metrics: { svMultiplier: Math.round(currSv * 10) / 10 },
        });
      }
    }
  }

  // 4. Detect Rhythm Switches (Finger Control transitions between 1/4, 1/3, and 1/2 subdivisions)
  let lastRhythmSwitchEnd = -5000;
  for (let i = 1; i + 5 < hitObjects.length; i++) {
    const startObj = hitObjects[i - 1];
    if (startObj.time < lastRhythmSwitchEnd + 2500) continue;

    const localBeat = getBeatLengthAt(startObj.time, uninheritedTps, fallbackBeatLength);
    let switches = 0;
    let prevSnap = 0;
    let validWindow = true;

    for (let k = i; k <= i + 5; k++) {
      const dt = hitObjects[k].time - hitObjects[k - 1].time;
      if (dt <= 20 || dt > localBeat * 0.9) {
        validWindow = false;
        break;
      }
      const ratio = localBeat / dt; // ~4 for 1/4, ~3 for 1/3, ~2 for 1/2
      const snap = ratio >= 3.5 ? 4 : ratio >= 2.6 ? 3 : 2;
      if (prevSnap !== 0 && snap !== prevSnap) {
        switches++;
      }
      prevSnap = snap;
    }

    if (validWindow && switches >= 3) {
      const endObj = hitObjects[i + 5];
      const localBpm = Math.round((60000 / localBeat) * safeRate);
      patterns.push({
        id: `pattern-${patternIdCounter++}`,
        type: 'rhythm_switch',
        label: `Troca de Ritmo / Finger Control (${localBpm} BPM)`,
        startTimeMs: startObj.time,
        endTimeMs: endObj.time,
        startTimestamp: formatTimestamp(startObj.time),
        endTimestamp: formatTimestamp(endObj.time),
        osuEditorTimestamp: formatOsuEditorTimestamp(startObj.time),
        severity: switches >= 4 ? 'high' : 'medium',
        noteCount: 7,
        description: `Alternância rápida entre subdivisões rítmicas (1/2 e 1/4) exigindo precisão de finger control.`,
        metrics: { bpm: localBpm },
      });
      lastRhythmSwitchEnd = endObj.time;
    }
  }

  // 5. Detect Choke Points (Peak mechanical intensity windows across the beatmap)
  if (hitObjects.length >= 12) {
    const windowMs = 4000;
    const stepMs = 2000;
    const firstTime = hitObjects[0].time;
    const lastTime = hitObjects[hitObjects.length - 1].time;
    const windows: Array<{ startMs: number; endMs: number; score: number; count: number; maxDist: number }> = [];

    for (let t = firstTime; t + windowMs <= lastTime; t += stepMs) {
      let score = 0;
      let count = 0;
      let maxDist = 0;
      for (let i = 1; i < hitObjects.length; i++) {
        const curr = hitObjects[i];
        if (curr.time < t) continue;
        if (curr.time > t + windowMs) break;
        const prev = hitObjects[i - 1];
        const dt = Math.max(25, curr.time - prev.time);
        const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
        if (dist > maxDist) maxDist = dist;
        score += (dist + 40) / dt;
        count++;
      }
      if (count >= 6) {
        windows.push({ startMs: t, endMs: t + windowMs, score, count, maxDist });
      }
    }

    if (windows.length > 0) {
      const avgScore = windows.reduce((s, w) => s + w.score, 0) / windows.length;
      const sortedWindows = [...windows].sort((a, b) => b.score - a.score);
      const chosenChokes: typeof windows = [];

      for (const cand of sortedWindows) {
        if (chosenChokes.length >= 2) break;
        if (cand.score < avgScore * 1.45 && chosenChokes.length > 0) break;
        const overlaps = chosenChokes.some((c) => Math.abs(c.startMs - cand.startMs) < 8000);
        if (!overlaps) {
          chosenChokes.push(cand);
        }
      }

      for (const choke of chosenChokes) {
        patterns.push({
          id: `pattern-${patternIdCounter++}`,
          type: 'choke_point',
          label: `Pico de Tensão (${choke.count} notas em 4s)`,
          startTimeMs: choke.startMs,
          endTimeMs: choke.endMs,
          startTimestamp: formatTimestamp(choke.startMs),
          endTimestamp: formatTimestamp(choke.endMs),
          osuEditorTimestamp: formatOsuEditorTimestamp(choke.startMs),
          severity: choke.score >= avgScore * 1.8 ? 'extreme' : 'high',
          noteCount: choke.count,
          description: `Trecho de maior densidade mecânica combinada do mapa (${choke.count} notas, espaçamento máx ${Math.round(choke.maxDist)}px).`,
          metrics: { maxDistancePx: Math.round(choke.maxDist) },
        });
      }
    }
  }

  // Sort all patterns chronologically
  patterns.sort((a, b) => a.startTimeMs - b.startTimeMs);

  return patterns;
}
