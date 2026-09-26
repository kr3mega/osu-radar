// Math and utility functions ported from TechnoZamb/osu-preview
export const mod = (a: number, n: number): number => ((a % n) + n) % n;

export const clamp = (min: number, n: number, max: number): number =>
  Math.min(max, Math.max(min, n));

export const lerp = (min: number, max: number, t: number): number =>
  (max - min) * t + min;

export const range = (
  low1: number,
  high1: number,
  low2: number,
  high2: number,
  t: number
): number => ((t - low1) / (high1 - low1)) * (high2 - low2) + low2;

export const rgb = (val: string | undefined | null): [number, number, number] | null => {
  if (!val) return null;
  const parts = val.split(',').map((x) => clamp(0, parseInt(x.trim(), 10), 255));
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return null;
  }
  return [parts[0], parts[1], parts[2]];
};

export const distance = (
  p1: { x: number; y: number } | [number, number],
  p2: { x: number; y: number } | [number, number]
): number => {
  const x1 = Array.isArray(p1) ? p1[0] : p1.x;
  const y1 = Array.isArray(p1) ? p1[1] : p1.y;
  const x2 = Array.isArray(p2) ? p2[0] : p2.x;
  const y2 = Array.isArray(p2) ? p2[1] : p2.y;
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
};

export const easingFunctions = {
  easeOut: (t: number): number => (1.5 * t) / (0.5 + t),
  easierOut: (t: number): number => (1.2 * t) / (0.2 + t),
  easeOut2: (t: number): number => Math.sin((t * Math.PI) / 2),
  linear: (t: number): number => t,
  easeIn: (t: number): number => t * t,
};
