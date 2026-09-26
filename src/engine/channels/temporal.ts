import { HitObject, TimingPoint } from '../types';

export interface TemporalObjectMetrics {
  deltaT: number;             // Time difference in ms with previous object
  snapping: string;           // "1/1", "1/2", "1/3", "1/4", "1/6", "1/8", or "other"
  isStreamSpeed: boolean;     // deltaT <= 83.33ms (>= 180 BPM 1/4)
  isHighSpeed: boolean;       // deltaT <= 62.5ms (>= 240 BPM 1/4)
  streamChainLength: number;  // Consecutive stream notes up to this object
}

export interface TemporalSummary {
  objectMetrics: TemporalObjectMetrics[];
  shannonEntropy: number;     // Rhythmic complexity indicator (Finger Control)
  streamRatio: number;        // Percentage of map spent in high-frequency tapping
  highSpeedRatio: number;     // Percentage of streams above 240+ BPM
  maxStreamLength: number;    // Longest uninterrupted stream in notes
  avgStreamBpm: number;
}

/**
 * Finds the active uninherited timing point (BPM definition) at a given timestamp.
 */
export function getActiveRedLine(time: number, timingPoints: TimingPoint[]): TimingPoint | undefined {
  let active: TimingPoint | undefined;
  for (const tp of timingPoints) {
    if (tp.uninherited && tp.time <= time) {
      active = tp;
    } else if (tp.uninherited && tp.time > time) {
      break;
    }
  }
  return active || timingPoints.find((tp) => tp.uninherited);
}

/**
 * Analyzes Channel 1: Temporal rhythm, intervals, streams, and Shannon entropy.
 */
export function analyzeTemporalChannel(
  hitObjects: HitObject[],
  timingPoints: TimingPoint[]
): TemporalSummary {
  if (hitObjects.length < 2) {
    return {
      objectMetrics: [],
      shannonEntropy: 0,
      streamRatio: 0,
      highSpeedRatio: 0,
      maxStreamLength: 0,
      avgStreamBpm: 0,
    };
  }

  const metrics: TemporalObjectMetrics[] = [];
  const deltaHistogram = new Map<number, number>();

  let currentStreamChain = 0;
  let maxStream = 0;
  let streamCount = 0;
  let highSpeedCount = 0;
  let streamBpmSum = 0;
  let streamBpmCount = 0;

  for (let i = 1; i < hitObjects.length; i++) {
    const prev = hitObjects[i - 1];
    const curr = hitObjects[i];
    const deltaT = Math.max(1, curr.time - prev.time);

    // Bucket into 10ms intervals for Shannon entropy
    const bucket = Math.round(deltaT / 10) * 10;
    deltaHistogram.set(bucket, (deltaHistogram.get(bucket) || 0) + 1);

    // Identify snapping using the active red line (BPM)
    const activeTp = getActiveRedLine(curr.time, timingPoints);
    const beatLength = activeTp ? Math.abs(activeTp.beatLength) : 300; // default 200 BPM (300ms)
    const ratio = deltaT / beatLength;

    let snapping = 'other';
    if (Math.abs(ratio - 1.0) < 0.12) snapping = '1/1';
    else if (Math.abs(ratio - 0.5) < 0.08) snapping = '1/2';
    else if (Math.abs(ratio - 0.333) < 0.06) snapping = '1/3';
    else if (Math.abs(ratio - 0.25) < 0.05) snapping = '1/4';
    else if (Math.abs(ratio - 0.166) < 0.04) snapping = '1/6';
    else if (Math.abs(ratio - 0.125) < 0.03) snapping = '1/8';

    // Stream detection: <= 83.33ms is 180+ BPM in 1/4 (or equivalent fast tapping)
    const isStreamSpeed = deltaT <= 85;
    const isHighSpeed = deltaT <= 63; // >= 240 BPM in 1/4

    if (isStreamSpeed) {
      currentStreamChain++;
      streamCount++;
      if (isHighSpeed) highSpeedCount++;

      // Estimated tapping BPM: 60,000 / (deltaT * 4)
      const instantBpm = 60000 / (deltaT * 4);
      streamBpmSum += instantBpm;
      streamBpmCount++;

      if (currentStreamChain > maxStream) {
        maxStream = currentStreamChain;
      }
    } else {
      currentStreamChain = 0;
    }

    metrics.push({
      deltaT,
      snapping,
      isStreamSpeed,
      isHighSpeed,
      streamChainLength: currentStreamChain,
    });
  }

  // Calculate Shannon Entropy: H(X) = - sum(p_i * log2(p_i))
  const totalDeltas = metrics.length;
  let shannonEntropy = 0;

  for (const count of deltaHistogram.values()) {
    const p = count / totalDeltas;
    if (p > 0) {
      shannonEntropy -= p * Math.log2(p);
    }
  }

  const streamRatio = totalDeltas > 0 ? streamCount / totalDeltas : 0;
  const highSpeedRatio = streamCount > 0 ? highSpeedCount / streamCount : 0;
  const avgStreamBpm = streamBpmCount > 0 ? streamBpmSum / streamBpmCount : 0;

  return {
    objectMetrics: metrics,
    shannonEntropy,
    streamRatio,
    highSpeedRatio,
    maxStreamLength: maxStream,
    avgStreamBpm,
  };
}
