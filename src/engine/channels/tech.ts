import { HitObject, TimingPoint } from '../types';

export interface TechSummary {
  svVariance: number;             // Standard deviation / shifts of Slider Velocity (Tech indicator)
  avgSliderCurvature: number;     // Ratio of curve length to straight distance
  complexSliderRatio: number;     // Proportion of non-linear/curved sliders
  visualDensity: number;          // Maximum concurrently visible objects based on AR TimePreempt
  overlapRatio: number;           // Objects overlapping spatially with asynchronous timing
  techIndex: number;              // Consolidated Tech & Reading score factor (0 to 100)
}

/**
 * Calculates AR TimePreempt in milliseconds.
 */
export function calculatePreempt(ar: number): number {
  if (ar < 5) {
    return 1200 + (600 * (5 - ar)) / 5;
  }
  return 1200 - (750 * (ar - 5)) / 5;
}

/**
 * Analyzes Channel 4: Slider Velocity shifts, slider curvature complexity, and visual reading density.
 */
export function analyzeTechChannel(
  hitObjects: HitObject[],
  timingPoints: TimingPoint[],
  ar: number
): TechSummary {
  const sliders = hitObjects.filter((obj) => obj.type === 'slider');
  const preempt = calculatePreempt(ar);

  // 1. Slider Velocity Dynamics (SV Changes)
  // Inherited timing points provide SV multiplier: multiplier = -100 / beatLength
  const svList: number[] = [];

  for (const tp of timingPoints) {
    if (!tp.uninherited) {
      const svMult = Math.min(10, Math.max(0.1, -100 / tp.beatLength));
      svList.push(svMult);
    }
  }

  let svVariance = 0;
  if (svList.length > 1) {
    const mean = svList.reduce((a, b) => a + b, 0) / svList.length;
    const sqDiffs = svList.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
    svVariance = Math.sqrt(sqDiffs / svList.length);
  }

  // 2. Slider Curvature Complexity
  let complexSliderCount = 0;
  let totalCurvatureRatio = 0;

  for (const s of sliders) {
    if (s.points && s.points.length > 1 && s.pixelLength && s.pixelLength > 0) {
      const start = s.points[0];
      const end = s.points[s.points.length - 1];
      const straightDist = Math.max(1, Math.hypot(end.x - start.x, end.y - start.y));
      const curvatureRatio = s.pixelLength / straightDist;

      totalCurvatureRatio += curvatureRatio;
      if (curvatureRatio > 1.35 || s.points.length > 2) {
        complexSliderCount++;
      }
    } else {
      totalCurvatureRatio += 1.0;
    }
  }

  const avgSliderCurvature = sliders.length > 0 ? totalCurvatureRatio / sliders.length : 1.0;
  const complexSliderRatio = sliders.length > 0 ? complexSliderCount / sliders.length : 0;

  // 3. Visual Reading Density (Overlapping objects within AR Preempt window)
  let maxConcurrentVisible = 0;
  let overlapCount = 0;

  for (let i = 0; i < hitObjects.length; i++) {
    const current = hitObjects[i];
    let concurrent = 1;

    for (let j = i + 1; j < hitObjects.length; j++) {
      const next = hitObjects[j];
      if (next.time - current.time <= preempt) {
        concurrent++;
        const dist = Math.hypot(next.x - current.x, next.y - current.y);
        // Overlap: objects closer than 35px appearing within the preempt window
        if (dist < 35) {
          overlapCount++;
        }
      } else {
        break;
      }
    }

    if (concurrent > maxConcurrentVisible) {
      maxConcurrentVisible = concurrent;
    }
  }

  const overlapRatio = hitObjects.length > 0 ? overlapCount / hitObjects.length : 0;

  // Consolidated tech score index
  // High SV variance + high slider curvature + high overlap / reading complexity
  const techIndex = Math.min(
    100,
    Math.round(
      svVariance * 18 +
      (avgSliderCurvature - 1) * 35 +
      complexSliderRatio * 30 +
      overlapRatio * 35 +
      (ar < 8 ? (8 - ar) * 4 : 0)
    )
  );

  return {
    svVariance,
    avgSliderCurvature,
    complexSliderRatio,
    visualDensity: maxConcurrentVisible,
    overlapRatio,
    techIndex,
  };
}
