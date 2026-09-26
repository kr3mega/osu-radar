export type HitObjectType = 'circle' | 'slider' | 'spinner';

export interface HitObject {
  x: number;
  y: number;
  time: number; // in milliseconds
  type: HitObjectType;
  endTime?: number;
  curveType?: string;
  points?: Array<{ x: number; y: number }>;
  repeats?: number;
  pixelLength?: number;
}

export interface BeatmapMetadata {
  title: string;
  titleUnicode?: string;
  artist: string;
  artistUnicode?: string;
  creator: string;
  version: string; // Difficulty name
  source?: string;
  tags?: string[];
  beatmapId?: number;
  beatmapSetId?: number;
  audioFilename?: string;
}

export interface BeatmapDifficulty {
  hp: number;
  cs: number;
  od: number;
  ar: number;
  sliderMultiplier: number;
  sliderTickRate: number;
}

export interface TimingPoint {
  time: number;
  beatLength: number; // positive = uninherited (ms per beat), negative = inherited (-100 / SV multiplier)
  meter: number;
  uninherited: boolean;
}

export interface SkillAttributes {
  snapAim: number;       // 0 to 100: Jumps, sharp acute angles (θ < 60°), rapid deceleration/acceleration
  flowAim: number;       // 0 to 100: Smooth obtuse angles (θ > 120°), circular flow, spaced streams
  speed: number;         // 0 to 100: High raw tapping frequency (200-260+ BPM 1/4 streams, short bursts)
  stamina: number;       // 0 to 100: Long continuous stream density without breaks (> 32+ objects)
  fingerControl: number; // 0 to 100: Rhythmic complexity, 1/3, 1/4, 1/6 mixes, temporal Shannon entropy
  readingTech: number;   // 0 to 100: SV shifts, complex sliders, spatial overlap (low spacing + high time delta)
}

export interface StrainPoint {
  timeMs: number;
  timestamp: string; // "MM:SS"
  totalStrain: number;
  snapStrain: number;
  flowStrain: number;
  speedStrain: number;
  staminaStrain: number;
  fingerStrain: number;
  techStrain: number;
}

export interface BeatmapStats {
  bpmMin: number;
  bpmMax: number;
  bpmMode: number;
  durationMs: number;
  drainTimeMs: number;
  circleCount: number;
  sliderCount: number;
  spinnerCount: number;
  totalObjects: number;
  maxCombo: number;
  starRating: number;
}

export interface BeatmapAnalysisResult {
  id: string; // Hash or unique id
  fileName: string;
  metadata: BeatmapMetadata;
  difficulty: BeatmapDifficulty;
  stats: BeatmapStats;
  skills: SkillAttributes;
  timeline: StrainPoint[];
  patterns?: import('./patterns').DetectedPattern[];
  hitObjects?: HitObject[];
  rawText?: string;
  audioBlob?: Blob;
  audioUrl?: string;
  topSkills: Array<keyof SkillAttributes>;
  modSlot?: string; // "NM1", "HD2", "HR1", "DT1", "FM1", "TB"
  calculatedAt: number;
}

export interface Mappool {
  id: string;
  name: string;
  stage?: string; // e.g. "Round of 16", "Semifinals", "Grand Finals"
  description?: string;
  createdAt: number;
  updatedAt: number;
  maps: BeatmapAnalysisResult[];
}
