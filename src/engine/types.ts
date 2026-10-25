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
  backgroundFilename?: string;
  previewTime?: number;
  mode?: number; // 0 = osu!standard, 1 = taiko, 2 = catch, 3 = mania
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
  stream: number;        // 0 to 100: Continuous stream density and volume
  burst: number;         // 0 to 100: Rapid short burst tapping (3-7 notes)
  fingerControl: number; // 0 to 100: Rhythmic complexity, 1/3, 1/4, 1/6 mixes, temporal Shannon entropy
  accuracy: number;      // 0 to 100: Rhythm precision, timing tightness and OD scale
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

export interface PatternCounts {
  streams: number;      // stream + spaced_stream + deathstream sections
  streamNotes: number;  // total notes in stream sections
  deathstreams: number; // 32+ note continuous stream sections
  jumps: number;        // snap_jumps + flow_aim sections
  bursts: number;       // 3-8 note burst sections
  tech: number;         // sv_spike + rhythm_switch + choke_point sections
}

export type BeatmapOrigin = 'tournament' | 'local_songs' | 'lazer';

export interface BeatmapAnalysisResult {
  id: string; // Hash or unique id
  fileName: string;
  metadata: BeatmapMetadata;
  difficulty: BeatmapDifficulty;
  stats: BeatmapStats;
  skills: SkillAttributes;
  timeline: StrainPoint[];
  patterns?: import('./patterns').DetectedPattern[];
  patternCounts?: PatternCounts;
  hitObjects?: HitObject[];
  rawText?: string;
  audioBlob?: Blob;
  audioUrl?: string;
  topSkills: Array<keyof SkillAttributes>;
  modSlot?: string; // "NM1", "HD2", "HR1", "DT1", "FM1", "TB"
  tournamentName?: string; // e.g. "6WC 2026", "OWC 2025"
  stageName?: string;      // e.g. "Grand Finals", "Finals", "Qualifiers"
  origin?: BeatmapOrigin;  // 'tournament' | 'local_songs' | 'lazer'
  localClient?: 'stable' | 'lazer'; // osu! client flavour for local beatmaps
  localOsuPath?: string;   // Local osu! Songs / Lazer CAS .osu file path
  localAudioPath?: string; // Local audio file path
  localBgPath?: string;    // Local background image path
  fileMtimeMs?: number;    // File last modified timestamp for incremental sync
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
