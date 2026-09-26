/**
 * Faithful port of osu.Game.Graphics.OsuColour from ppy/osu
 * Source: https://github.com/ppy/osu/blob/master/osu.Game/Graphics/OsuColour.cs
 */

export const STAR_SPECTRUM: Array<{ stars: number; hex: string }> = [
  { stars: 0.1, hex: '#4290fb' },
  { stars: 1.25, hex: '#4fc0ff' },
  { stars: 2.0, hex: '#4fffd5' },
  { stars: 2.5, hex: '#7cff4f' },
  { stars: 3.3, hex: '#f6f05c' },
  { stars: 4.2, hex: '#ff8068' },
  { stars: 4.9, hex: '#ff4e6f' },
  { stars: 5.8, hex: '#c645b8' },
  { stars: 6.7, hex: '#6563de' },
  { stars: 7.7, hex: '#18158e' },
  { stars: 9.0, hex: '#000000' },
];

/**
 * Returns the canonical hex color for a given Star Rating from ppy/osu.
 */
export function getStarRatingColor(stars: number): string {
  if (stars < 0.1) return '#aaaaaa';
  for (let i = 0; i < STAR_SPECTRUM.length - 1; i++) {
    const curr = STAR_SPECTRUM[i];
    const next = STAR_SPECTRUM[i + 1];
    if (stars >= curr.stars && stars <= next.stars) {
      return curr.hex;
    }
  }
  return '#000000';
}

/**
 * Returns appropriate text color (dark or bright) for contrast on the star rating badge.
 */
export function getStarRatingTextColor(stars: number): string {
  if (stars < 6.5) return '#000000';
  if (stars < 9.0) return '#ffffff';
  return '#ffd966'; // Glowing gold for 9*+
}

/**
 * Official Tournament Mod Colors
 */
export const TOURNAMENT_MOD_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  NM: { bg: '#5975a4', text: '#ffffff', border: '#6c8ab8', glow: 'rgba(89, 117, 164, 0.4)' },
  HD: { bg: '#e5a100', text: '#000000', border: '#ffd400', glow: 'rgba(229, 161, 0, 0.4)' },
  HR: { bg: '#ff385c', text: '#ffffff', border: '#ff597a', glow: 'rgba(255, 56, 92, 0.4)' },
  DT: { bg: '#9b59b6', text: '#ffffff', border: '#b172cc', glow: 'rgba(155, 89, 182, 0.4)' },
  FM: { bg: '#2ecc71', text: '#000000', border: '#48e78a', glow: 'rgba(46, 204, 113, 0.4)' },
  TB: { bg: '#f39c12', text: '#000000', border: '#f5b041', glow: 'rgba(243, 156, 18, 0.4)' },
};
