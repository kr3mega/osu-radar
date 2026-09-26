import { HitObject } from '../types';

export interface AngularObjectMetrics {
  turnAngleDeg: number;       // Deflection angle between incoming and outgoing vector (0° = straight, 180° = turnaround)
  isSharpSnap: boolean;       // turnAngle >= 105° (requiring cursor halt and vector reversal)
  isFlowCurve: boolean;       // turnAngle <= 65° (smooth continuous trajectory conserving momentum)
}

export interface AngularSummary {
  objectMetrics: AngularObjectMetrics[];
  avgTurnAngle: number;
  snapRatio: number;          // Percentage of sharp deflection angles (Snap Aim indicator)
  flowRatio: number;          // Percentage of continuous flowing angles (Flow Aim indicator)
  snapStrainWeight: number;   // Weight combined with velocity
  flowStrainWeight: number;   // Weight combined with velocity
}

/**
 * Analyzes Channel 3: Angular kinematics between consecutive triplets P(n-1) -> P(n) -> P(n+1).
 * Distinguishes between Snap Aim (hard reversals/sharp corners) and Flow Aim (circular/arc continuation).
 */
export function analyzeAngularChannel(hitObjects: HitObject[]): AngularSummary {
  if (hitObjects.length < 3) {
    return {
      objectMetrics: [],
      avgTurnAngle: 0,
      snapRatio: 0,
      flowRatio: 0,
      snapStrainWeight: 0,
      flowStrainWeight: 0,
    };
  }

  const metrics: AngularObjectMetrics[] = [];
  let totalAngle = 0;
  let snapCount = 0;
  let flowCount = 0;
  let snapWeightedSum = 0;
  let flowWeightedSum = 0;

  for (let i = 1; i < hitObjects.length - 1; i++) {
    const pPrev = hitObjects[i - 1];
    const pCurr = hitObjects[i];
    const pNext = hitObjects[i + 1];

    const uX = pCurr.x - pPrev.x;
    const uY = pCurr.y - pPrev.y;
    const vX = pNext.x - pCurr.x;
    const vY = pNext.y - pCurr.y;

    const lenU = Math.sqrt(uX * uX + uY * uY);
    const lenV = Math.sqrt(vX * vX + vY * vY);

    let turnAngle = 0;

    // If both movements have noticeable distance (> 8px)
    if (lenU > 8 && lenV > 8) {
      const dot = (uX * vX + uY * vY) / (lenU * lenV);
      const clampedDot = Math.max(-1, Math.min(1, dot));
      // Deflection/turn angle: 0° is straight forward, 180° is total reversal
      turnAngle = Math.acos(clampedDot) * (180 / Math.PI);
    }

    const deltaT = Math.max(1, pNext.time - pCurr.time);
    const vel = lenV / deltaT; // px/ms

    // Sharp snap: sharp turn (> 100°) with high velocity
    const isSharpSnap = turnAngle >= 100;
    // Flow curve: gentle sweeping turn (< 65°) maintaining momentum
    const isFlowCurve = turnAngle <= 65 && lenU > 20 && lenV > 20;

    if (isSharpSnap) {
      snapCount++;
      // High velocity + sharp reversal = massive snap strain
      snapWeightedSum += vel * (turnAngle / 180);
    }

    if (isFlowCurve) {
      flowCount++;
      // High velocity + smooth flow = flow aim strain
      flowWeightedSum += vel * (1 - turnAngle / 180);
    }

    totalAngle += turnAngle;
    metrics.push({
      turnAngleDeg: turnAngle,
      isSharpSnap,
      isFlowCurve,
    });
  }

  const count = metrics.length;
  const avgTurnAngle = count > 0 ? totalAngle / count : 0;
  const snapRatio = count > 0 ? snapCount / count : 0;
  const flowRatio = count > 0 ? flowCount / count : 0;

  return {
    objectMetrics: metrics,
    avgTurnAngle,
    snapRatio,
    flowRatio,
    snapStrainWeight: count > 0 ? (snapWeightedSum / count) * 100 : 0,
    flowStrainWeight: count > 0 ? (flowWeightedSum / count) * 100 : 0,
  };
}
