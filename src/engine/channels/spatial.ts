import { HitObject } from '../types';

export interface SpatialObjectMetrics {
  deltaD: number;         // Euclidean distance in pixels
  velocity: number;       // px / ms
  isJump: boolean;        // deltaD >= 180px
  isSpacedStream: boolean;// deltaD >= 85px with high tapping speed
}

export interface SpatialSummary {
  objectMetrics: SpatialObjectMetrics[];
  avgDistance: number;
  maxDistance: number;
  p95Distance: number;
  avgVelocity: number;
  maxVelocity: number;
  jumpCount: number;
}

/**
 * Analyzes Channel 2: Spatial Euclidean distance, cursor speed, and jump spacing.
 */
export function analyzeSpatialChannel(hitObjects: HitObject[]): SpatialSummary {
  if (hitObjects.length < 2) {
    return {
      objectMetrics: [],
      avgDistance: 0,
      maxDistance: 0,
      p95Distance: 0,
      avgVelocity: 0,
      maxVelocity: 0,
      jumpCount: 0,
    };
  }

  const metrics: SpatialObjectMetrics[] = [];
  const distances: number[] = [];
  let totalDist = 0;
  let maxDist = 0;
  let totalVel = 0;
  let maxVel = 0;
  let jumpCount = 0;

  for (let i = 1; i < hitObjects.length; i++) {
    const prev = hitObjects[i - 1];
    const curr = hitObjects[i];

    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const deltaD = Math.sqrt(dx * dx + dy * dy);
    const deltaT = Math.max(1, curr.time - prev.time);
    const velocity = deltaD / deltaT; // px/ms

    const isJump = deltaD >= 180;
    const isSpacedStream = deltaD >= 80 && deltaT <= 85;

    if (isJump) jumpCount++;
    totalDist += deltaD;
    totalVel += velocity;
    distances.push(deltaD);

    if (deltaD > maxDist) maxDist = deltaD;
    if (velocity > maxVel) maxVel = velocity;

    metrics.push({
      deltaD,
      velocity,
      isJump,
      isSpacedStream,
    });
  }

  distances.sort((a, b) => a - b);
  const p95Index = Math.min(distances.length - 1, Math.floor(distances.length * 0.95));
  const p95Distance = distances[p95Index] || 0;

  const count = metrics.length;
  const avgDistance = count > 0 ? totalDist / count : 0;
  const avgVelocity = count > 0 ? totalVel / count : 0;

  return {
    objectMetrics: metrics,
    avgDistance,
    maxDistance: maxDist,
    p95Distance,
    avgVelocity,
    maxVelocity: maxVel,
    jumpCount,
  };
}
