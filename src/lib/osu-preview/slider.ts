import { mod, lerp } from './functions';
import { FACTORIALS_LUT } from './factorials';
import { PreviewHitObject } from './types';

export interface ViewportTransform {
  toPixelsX: (val: number) => number;
  toPixelsY: (val: number) => number;
  margins: [number, number];
  bezierSegmentMaxLengthSqrd: number;
}

const bakedPaths: Map<PreviewHitObject, Array<[Array<[number, number]>, number[]]>> = new Map();

export function clearBakedSliderPaths(): void {
  bakedPaths.clear();
}

/**
 * Calculates and optionally draws the slider path up to a given length (in pixels).
 * Returns [x, y, angle, flipped]
 */
export function strokeSlider(
  obj: PreviewHitObject,
  length: number,
  draw: boolean = true,
  bufferCtx?: CanvasRenderingContext2D,
  transform?: ViewportTransform,
  isHardRock: boolean = false
): [number, number, number, boolean?] {
  if (draw && length === 0) {
    return [obj.x, obj.y, 0];
  }

  const toPxX = transform?.toPixelsX ?? ((x) => x);
  const toPxY = transform?.toPixelsY ?? ((y) => (isHardRock ? 384 - y : y));
  const margins = transform?.margins ?? [0, 0];
  const maxSegSqrd = transform?.bezierSegmentMaxLengthSqrd ?? 100;

  // 1. Linear slider
  if (obj.curveType === 'L' || !obj.curvePoints || obj.curvePoints.length === 0) {
    let actualLength = 0;
    let prevLength = 0;
    let prevObj: { x: number; y: number } = { x: obj.x, y: obj.y };
    const points = obj.curvePoints || [];

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const segDist = Math.sqrt((point.x - prevObj.x) ** 2 + (point.y - prevObj.y) ** 2);
      actualLength += segDist;

      if (actualLength > length) {
        const ratio = (length - prevLength) / Math.max(0.0001, actualLength - prevLength);
        const curX = prevObj.x + (point.x - prevObj.x) * ratio;
        const curY = prevObj.y + (point.y - prevObj.y) * ratio;
        if (draw && bufferCtx) {
          bufferCtx.lineTo(toPxX(curX) + margins[0], toPxY(curY) + margins[1]);
          return [curX, curY, Math.atan2(point.y - prevObj.y, point.x - prevObj.x)];
        } else {
          return [curX, curY, Math.atan2(point.y - prevObj.y, point.x - prevObj.x)];
        }
      } else {
        if (draw && bufferCtx) {
          bufferCtx.lineTo(toPxX(point.x) + margins[0], toPxY(point.y) + margins[1]);
        }
      }

      prevObj = point;
      prevLength = actualLength;
    }

    if (actualLength < length && points.length > 0) {
      const point = points[points.length - 1];
      prevObj = points.length > 1 ? points[points.length - 2] : { x: obj.x, y: obj.y };
      const segDist = Math.sqrt((point.x - prevObj.x) ** 2 + (point.y - prevObj.y) ** 2);
      prevLength = actualLength - segDist;
      const ratio = (length - prevLength) / Math.max(0.0001, actualLength - prevLength);
      const curX = prevObj.x + (point.x - prevObj.x) * ratio;
      const curY = prevObj.y + (point.y - prevObj.y) * ratio;
      if (draw && bufferCtx) {
        bufferCtx.lineTo(toPxX(curX) + margins[0], toPxY(curY) + margins[1]);
      }
      return [curX, curY, Math.atan2(point.y - prevObj.y, point.x - prevObj.x)];
    }

    const lastPoint = points.length > 0 ? points[points.length - 1] : { x: obj.x, y: obj.y };
    return [lastPoint.x, lastPoint.y, Math.atan2(lastPoint.y - obj.y, lastPoint.x - obj.x)];
  }

  // 2. Perfect circle (Circumscribed circle through 3 points)
  else if (obj.curveType === 'P' && obj.curvePoints.length === 2) {
    const a = { x: obj.x, y: obj.y };
    const b = obj.curvePoints[0];
    const c = obj.curvePoints[1];

    const x1 = 2 * (a.x - b.x) || 0.00001;
    const y1 = 2 * (a.y - b.y);
    const z1 = a.x * a.x + a.y * a.y - b.x * b.x - b.y * b.y;
    const x2 = 2 * (a.x - c.x);
    const y2 = 2 * (a.y - c.y);
    const z2 = a.x * a.x + a.y * a.y - c.x * c.x - c.y * c.y;

    const denom = y2 - (x2 * y1) / x1 || 0.00001;
    const cy = (z2 - (x2 * z1) / x1) / denom;
    const cx = (z1 - y1 * cy) / x1;

    const r = Math.sqrt((a.x - cx) ** 2 + (a.y - cy) ** 2);
    const angleA = Math.atan2(a.y - cy, a.x - cx);
    let angleC = Math.atan2(c.y - cy, c.x - cx);
    const det = determinant([
      [a.x, a.y, 1],
      [b.x, b.y, 1],
      [c.x, c.y, 1],
    ]);

    // If collinear, fall back to linear
    if (Math.abs(det) < 0.00001) {
      obj.curveType = 'L';
      return strokeSlider(obj, length, draw, bufferCtx, transform, isHardRock);
    }

    const arcLength =
      r * (det < 0 ? mod(angleA - angleC, 2 * Math.PI) : mod(angleC - angleA, 2 * Math.PI));
    let xIncr: number | null = null;
    let yIncr: number | null = null;

    if (arcLength > length) {
      angleC = angleA + (length / r) * (det > 0 ? 1 : -1);
    } else {
      const slope = 1 / Math.tan(angleC);
      xIncr =
        Math.sqrt((length - arcLength) ** 2 / (1 + slope * slope)) * (angleC < 0 ? -1 : 1);
      yIncr = xIncr * slope * (angleC < Math.PI ? -1 : 1);
    }

    if (draw && bufferCtx) {
      bufferCtx.arc(
        toPxX(cx) + margins[0],
        toPxY(cy) + margins[1],
        toPxX(r),
        angleA * (isHardRock ? -1 : 1),
        angleC * (isHardRock ? -1 : 1),
        ((det < 0 ? 1 : 0) + (isHardRock ? 1 : 0)) % 2 === 1
      );

      if (xIncr !== null && yIncr !== null) {
        bufferCtx.lineTo(
          toPxX(c.x + xIncr) + margins[0],
          toPxY(c.y + yIncr) + margins[1]
        );
      }
    } else {
      if (xIncr !== null && yIncr !== null) {
        return [c.x + xIncr, c.y + yIncr, Math.atan2(yIncr, xIncr)];
      } else {
        const endP = [cx + Math.cos(angleC) * r, cy + Math.sin(angleC) * r];
        const flipped = det < 0 ? angleA < 0 : angleA > 0;
        return [
          endP[0],
          endP[1],
          Math.atan2(endP[1] - cy, endP[0] - cx) + (Math.PI / 2) * (det > 0 ? 1 : -1),
          flipped,
        ];
      }
    }
  }

  // 3. Composite Bézier curve (B) or Multi-point circle (P with > 2 points)
  else if (obj.curveType === 'B' || (obj.curveType === 'P' && obj.curvePoints.length > 2)) {
    const controlPoints = [{ x: obj.x, y: obj.y }, ...obj.curvePoints];
    let pointsBuffer = [controlPoints[0]];

    let actualLength = 0;
    let prevLength = 0;
    let prevObj: { x: number; y: number } = { x: obj.x, y: obj.y };

    for (let i = 1; i <= controlPoints.length; i++) {
      if (
        i === controlPoints.length ||
        (controlPoints[i].x === controlPoints[i - 1].x &&
          controlPoints[i].y === controlPoints[i - 1].y)
      ) {
        if (pointsBuffer.length === 2) {
          const point = pointsBuffer[1];
          actualLength += Math.sqrt((point.x - prevObj.x) ** 2 + (point.y - prevObj.y) ** 2);

          if (actualLength > length) {
            const ratio = (length - prevLength) / Math.max(0.0001, actualLength - prevLength);
            const curX = prevObj.x + (point.x - prevObj.x) * ratio;
            const curY = prevObj.y + (point.y - prevObj.y) * ratio;
            if (draw && bufferCtx) {
              bufferCtx.lineTo(toPxX(curX) + margins[0], toPxY(curY) + margins[1]);
              return [curX, curY, Math.atan2(point.y - prevObj.y, point.x - prevObj.x)];
            } else {
              return [curX, curY, Math.atan2(point.y - prevObj.y, point.x - prevObj.x)];
            }
          } else {
            if (draw && bufferCtx) {
              bufferCtx.lineTo(toPxX(point.x) + margins[0], toPxY(point.y) + margins[1]);
            }
          }

          prevObj = point;
          prevLength = actualLength;
        } else if (pointsBuffer.length > 2) {
          let baked = bakedPaths.get(obj);
          if (!baked) {
            baked = [];
            bakedPaths.set(obj, baked);
          }

          let cache = baked[i];
          if (!cache) {
            cache = baked[i] = bezierPoints(pointsBuffer, maxSegSqrd);
          }
          const [points, lengths] = cache;

          for (let j = 0; j < points.length; j++) {
            if (actualLength + lengths[j] > length) {
              const prevP = points[j - 1] ?? [pointsBuffer[0].x, pointsBuffer[0].y];
              const prevL = lengths[j - 1] ?? 0;
              const ratio = (length - (prevL + actualLength)) / Math.max(0.0001, lengths[j] - prevL);
              const curX = lerp(prevP[0], points[j][0], ratio);
              const curY = lerp(prevP[1], points[j][1], ratio);

              if (draw && bufferCtx) {
                bufferCtx.lineTo(toPxX(curX) + margins[0], toPxY(curY) + margins[1]);
                return [curX, curY, Math.atan2(points[j][1] - prevP[1], points[j][0] - prevP[0])];
              } else {
                return [curX, curY, Math.atan2(points[j][1] - prevP[1], points[j][0] - prevP[0])];
              }
            } else {
              if (draw && bufferCtx) {
                bufferCtx.lineTo(toPxX(points[j][0]) + margins[0], toPxY(points[j][1]) + margins[1]);
              }
            }
          }

          const lastP = points[points.length - 1];
          prevObj = { x: lastP[0], y: lastP[1] };
          actualLength += lengths[lengths.length - 1];
          prevLength = actualLength;
        }

        pointsBuffer = [];
      }

      if (i < controlPoints.length) {
        pointsBuffer.push(controlPoints[i]);
      }
    }

    if (!draw && obj.curvePoints.length > 0) {
      const last = obj.curvePoints[obj.curvePoints.length - 1];
      return [last.x, last.y, 0];
    }
  }

  return [obj.x, obj.y, 0];
}

export function getFollowPosition(
  obj: PreviewHitObject,
  length: number,
  isHardRock: boolean = false
): [number, number, number, boolean?] {
  return strokeSlider(obj, length, false, undefined, undefined, isHardRock);
}

export function getSliderTicks(
  obj: PreviewHitObject,
  sliderTickRate: number,
  includeEdge: boolean = false
): number[] {
  const ticks: number[] = [];
  if (!obj.beatLength || !obj.duration || sliderTickRate <= 0) return ticks;

  const tickInterval = obj.beatLength / sliderTickRate;
  for (let i = tickInterval; i < obj.duration; i += tickInterval) {
    if (
      i <
      (includeEdge
        ? obj.duration - obj.beatLength / 32
        : obj.duration - obj.beatLength / sliderTickRate / 4 - 0.001)
    ) {
      ticks.push(i);
    }
  }
  return ticks;
}

function bezierPoints(
  points: Array<{ x: number; y: number }>,
  maxSegSqrd: number,
  start: number = 0,
  end: number = 1
): [Array<[number, number]>, number[]] {
  const arr: Array<[number, number]> = [];
  const lengths: number[] = [];

  const _subdivide = (s: number, e: number, minDivs: number) => {
    const startP = bezierAt(points, s);
    const endP = bezierAt(points, e);
    const lengthSq = (startP[0] - endP[0]) ** 2 + (startP[1] - endP[1]) ** 2;

    if (minDivs > 0 || lengthSq > maxSegSqrd) {
      _subdivide(s, (s + e) / 2, minDivs - 1);
      _subdivide((s + e) / 2, e, minDivs - 1);
    } else {
      arr.push(endP);
      lengths.push((lengths[lengths.length - 1] ?? 0) + Math.sqrt(lengthSq));
    }
  };

  _subdivide(start, end, 2);
  return [arr, lengths];
}

function bezierAt(points: Array<{ x: number; y: number }>, t: number): [number, number] {
  let rx = 0;
  let ry = 0;
  const n = points.length - 1;
  for (let i = 0; i <= n; i++) {
    const b = bernstain(i, n, t);
    rx += points[i].x * b;
    ry += points[i].y * b;
  }
  return [rx, ry];
}

function bernstain(i: number, n: number, t: number): number {
  return (fact(n) / (fact(i) * fact(n - i))) * Math.pow(t, i) * Math.pow(1 - t, n - i);
}

function fact(n: number): number {
  if (n <= 1) return 1;
  return FACTORIALS_LUT[n] || 1;
}

function determinant(m: number[][]): number {
  if (m.length === 1) return m[0][0];
  if (m.length === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
  return m[0].reduce(
    (r, e, i) =>
      r +
      (-1) ** (i + 2) *
        e *
        determinant(m.slice(1).map((c) => c.filter((_, j) => i !== j))),
    0
  );
}
