import { HitObject, SkillAttributes, StrainPoint, TimingPoint } from './types';
import { calculatePreempt } from './channels/tech';

export interface RollingWindowResult {
  timeline: StrainPoint[];
  skills: SkillAttributes;
}

/**
 * Format milliseconds to MM:SS display format.
 */
export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Top-Strain Integration formula with exponential decay:
 * S = sum(strain_k * decay^(k - 1))
 */
export function integrateTopStrains(strains: number[], decay: number = 0.95): number {
  if (strains.length === 0) return 0;
  const sorted = [...strains].sort((a, b) => b - a);
  let total = 0;
  let weight = 1.0;

  for (let i = 0; i < sorted.length; i++) {
    total += sorted[i] * weight;
    weight *= decay;
    if (weight < 0.001) break; // Negligible tail
  }

  return total;
}

/**
 * Calculates continuous difficulty timeline using rolling time windows (2.0s with 50% overlap).
 * Aggregates peak strains into sincere, calibrated 0-100 skill scores.
 */
export function calculateRollingStrains(
  hitObjects: HitObject[],
  _timingPoints: TimingPoint[],
  ar: number,
  windowSizeMs: number = 2000,
  stepMs: number = 1000
): RollingWindowResult {
  if (hitObjects.length === 0) {
    return {
      timeline: [],
      skills: {
        snapAim: 0,
        flowAim: 0,
        speed: 0,
        stamina: 0,
        fingerControl: 0,
        readingTech: 0,
      },
    };
  }

  const startTime = hitObjects[0].time;
  const endTime = hitObjects[hitObjects.length - 1].time;

  const snapSeries: number[] = [];
  const flowSeries: number[] = [];
  const speedSeries: number[] = [];
  const staminaSeries: number[] = [];
  const fingerSeries: number[] = [];
  const techSeries: number[] = [];
  const timeline: StrainPoint[] = [];

  const preempt = calculatePreempt(ar);

  let currentWindowStart = startTime;

  while (currentWindowStart <= endTime) {
    const currentWindowEnd = currentWindowStart + windowSizeMs;

    // Filter hitobjects inside this temporal window
    const windowObjects: HitObject[] = [];
    for (let i = 0; i < hitObjects.length; i++) {
      const obj = hitObjects[i];
      if (obj.time >= currentWindowStart && obj.time < currentWindowEnd) {
        windowObjects.push(obj);
      } else if (obj.time >= currentWindowEnd) {
        break;
      }
    }

    let snapLocal = 0;
    let flowLocal = 0;
    let speedLocal = 0;
    let staminaLocal = 0;
    let fingerLocal = 0;
    let techLocal = 0;

    if (windowObjects.length >= 2) {
      const deltasT: number[] = [];
      let consecutiveFastNotes = 0;

      for (let j = 1; j < windowObjects.length; j++) {
        const p1 = windowObjects[j - 1];
        const p2 = windowObjects[j];

        const dt = Math.max(1, p2.time - p1.time);
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const vel = dist / dt; // px/ms
        deltasT.push(dt);

        // Turn angle if 3 points exist
        let turnAngle = 0;
        if (j >= 2) {
          const p0 = windowObjects[j - 2];
          const uX = p1.x - p0.x;
          const uY = p1.y - p0.y;
          const vX = p2.x - p1.x;
          const vY = p2.y - p1.y;
          const lenU = Math.hypot(uX, uY);
          const lenV = Math.hypot(vX, vY);
          if (lenU > 5 && lenV > 5) {
            const dot = (uX * vX + uY * vY) / (lenU * lenV);
            turnAngle = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
          }
        }

        // 1. Snap Aim vs Flow Aim
        // Snap Aim: requires genuine jump spacing (> 50px) and fast motion
        if (turnAngle >= 90 && dist > 50) {
          snapLocal += vel * (dist / 110) * 1.4;
        } else if (turnAngle <= 60 && dist > 30) {
          // Flow Aim: continuous speed along smooth arc
          flowLocal += vel * (dist / 100);
        } else if (dist > 70) {
          // Neutral wide jumps
          snapLocal += vel * (dist / 140) * 0.9;
        }

        // 2. Speed & Stamina: true stream tapping (dt <= 95ms is >= 158 BPM 1/4)
        if (dt <= 95) {
          consecutiveFastNotes++;
          const sf = Math.pow(95 / Math.max(30, dt), 1.6);
          speedLocal += sf * 1.5;

          // Stamina: exponential scaling for sustained high-frequency tapping
          if (consecutiveFastNotes > 6) {
            staminaLocal += (consecutiveFastNotes - 5) * sf * 1.1;
          }
        } else {
          consecutiveFastNotes = 0;
        }

        // 3. Tech: complex multi-point sliders or visual overlapping stacks
        if (p2.type === 'slider' && p2.pixelLength && p2.points && p2.points.length >= 4) {
          const straight = Math.hypot(
            p2.points[p2.points.length - 1].x - p2.points[0].x,
            p2.points[p2.points.length - 1].y - p2.points[0].y
          );
          if (straight > 0 && p2.pixelLength / straight > 1.6) {
            techLocal += 3.0 * (p2.pixelLength / straight);
          }
        }

        // Visual overlap reading gimmick (stacked notes under approach circle)
        if (dist < 25 && dt > 140 && dt < preempt * 0.7) {
          techLocal += 2.0;
        }
      }

      // 4. Finger Control: rhythm variations in fast tapping bursts (dt <= 240ms)
      if (deltasT.length >= 3) {
        for (let k = 1; k < deltasT.length; k++) {
          const dt1 = deltasT[k - 1];
          const dt2 = deltasT[k];
          // Only triggers if at least one note is fast tapping
          if (dt1 <= 240 || dt2 <= 240) {
            const ratio = Math.max(dt1, dt2) / Math.min(dt1, dt2);
            // Non-uniform snapping: 1/4 to 1/3, 1/4 to 1/2, or syncopated off-beat
            if (ratio >= 1.28 && ratio <= 2.5) {
              const tappingSpeed = 220 / Math.min(dt1, dt2);
              fingerLocal += Math.pow(ratio - 1, 1.2) * tappingSpeed * 1.6;
            }
          }
        }
      }
    }

    snapSeries.push(snapLocal);
    flowSeries.push(flowLocal);
    speedSeries.push(speedLocal);
    staminaSeries.push(staminaLocal);
    fingerSeries.push(fingerLocal);
    techSeries.push(techLocal);

    const totalStrain = snapLocal + flowLocal + speedLocal + staminaLocal + fingerLocal + techLocal;

    timeline.push({
      timeMs: currentWindowStart,
      timestamp: formatTimestamp(currentWindowStart),
      totalStrain: Math.round(totalStrain * 10) / 10,
      snapStrain: Math.round(snapLocal * 10) / 10,
      flowStrain: Math.round(flowLocal * 10) / 10,
      speedStrain: Math.round(speedLocal * 10) / 10,
      staminaStrain: Math.round(staminaLocal * 10) / 10,
      fingerStrain: Math.round(fingerLocal * 10) / 10,
      techStrain: Math.round(techLocal * 10) / 10,
    });

    currentWindowStart += stepMs;
  }

  // Aggregate with Top-Strain Integration (exponential decay 0.95)
  const rawSnap = integrateTopStrains(snapSeries);
  const rawFlow = integrateTopStrains(flowSeries);
  const rawSpeed = integrateTopStrains(speedSeries);
  const rawStamina = integrateTopStrains(staminaSeries);
  const rawFinger = integrateTopStrains(fingerSeries);
  const rawTech = integrateTopStrains(techSeries);

  // Normalization to 0-100 scale using sincere power-law scaling against peak 10★ benchmarks
  const normalize = (val: number, refMax: number): number => {
    if (val <= 0) return 0;
    const ratio = Math.min(1.2, val / refMax);
    const score = Math.pow(ratio, 0.88) * 100;
    return Math.min(100, Math.max(0, Math.round(score * 10) / 10));
  };

  const skills: SkillAttributes = {
    snapAim: normalize(rawSnap, 850),
    flowAim: normalize(rawFlow, 750),
    speed: normalize(rawSpeed, 800),
    stamina: normalize(rawStamina, 950),
    fingerControl: normalize(rawFinger, 600),
    readingTech: normalize(rawTech, 650),
  };

  return {
    timeline,
    skills,
  };
}
