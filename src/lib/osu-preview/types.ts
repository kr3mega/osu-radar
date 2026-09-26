export type OsuMod = 'ez' | 'hr' | 'ht' | 'dt' | 'hd' | 'fl';

export interface HitSampleData {
  0: number; // normalSet
  1: number; // additionSet
  2: number; // index
  3: number; // volume
  4?: string; // customFileName
}

export interface PreviewHitObject {
  x: number;
  y: number;
  time: number;
  type: number;
  hitSounds: number;
  StackCount: number;

  isHitCircle: boolean;
  isSlider: boolean;
  isSpinner: boolean;
  isNewCombo: boolean;

  // Slider specific
  curveType?: 'L' | 'P' | 'B' | 'C' | string;
  curvePoints?: Array<{ x: number; y: number }>;
  slides?: number;
  pixelLength?: number;
  edgeSounds?: number[];
  edgeSets?: number[][];
  beatLength?: number;
  duration?: number;
  endTime: number;

  // Combo
  combo?: number;
  comboIndex?: number;

  // Hit sample
  hitSample?: [number, number, number, number, string];
}

export interface SkinIniColours {
  SliderBorder?: string;
  SliderTrackOverride?: string | false;
  Combo1?: string;
  Combo2?: string;
  Combo3?: string;
  Combo4?: string;
  Combo5?: string;
  Combo6?: string;
  Combo7?: string;
  Combo8?: string;
  [key: string]: string | false | undefined;
}

export interface SkinIniGeneral {
  AllowSliderBallTint?: string;
  SliderBallFlip?: string;
  CursorCenter?: string;
  CursorRotate?: string;
  CursorTrailRotate?: string;
  LayeredHitSounds?: string;
}

export interface SkinIniFonts {
  HitCirclePrefix?: string;
  HitCircleOverlap?: number;
}

export interface SkinIni {
  General: SkinIniGeneral;
  Colours: SkinIniColours;
  Fonts: SkinIniFonts;
  combos: Array<[number, number, number]>;
}

export interface OsuSkin {
  ini: SkinIni;
  isOldSpinner: boolean;
  isLongerCursorTrail: boolean;
  LayeredHitSounds: number;

  // Sprites
  hitcircle: HTMLCanvasElement[];
  hitcircleoverlay: HTMLImageElement | HTMLCanvasElement;
  sliderstartcircle: HTMLCanvasElement[];
  sliderstartcircleoverlay: HTMLImageElement | HTMLCanvasElement;
  sliderendcircle: HTMLCanvasElement[];
  sliderendcircleoverlay: HTMLImageElement | HTMLCanvasElement;
  approachcircle: HTMLCanvasElement[];
  sliderfollowcircle: HTMLImageElement | HTMLCanvasElement;
  sliderscorepoint: HTMLImageElement | HTMLCanvasElement;
  reversearrow: HTMLImageElement | HTMLCanvasElement;
  sliderb: HTMLCanvasElement[][];
  sliderbNd?: HTMLCanvasElement;
  sliderbSpec?: HTMLCanvasElement;
  isDefaultSliderBall?: boolean;
  followpoint: HTMLImageElement[];
  cursor: HTMLImageElement;
  cursormiddle?: HTMLImageElement;
  cursortrail: HTMLImageElement;

  // Digits
  [key: `default-${number}`]: HTMLImageElement;

  // Spinners
  spinnerApproachcircle?: HTMLImageElement;
  spinnerClear?: HTMLImageElement;
  spinnerBackground?: HTMLCanvasElement[];
  spinnerCircle?: HTMLImageElement;
  spinnerMetre?: HTMLImageElement;
  spinnerGlow?: HTMLCanvasElement[];
  spinnerBottom?: HTMLImageElement;
  spinnerTop?: HTMLImageElement;
  spinnerMiddle2?: HTMLImageElement;
  spinnerMiddle?: HTMLImageElement;
}

export interface PreviewBeatmap {
  General: {
    AudioFilename?: string;
    StackLeniency?: number;
    Mode?: number;
  };
  Difficulty: {
    HPDrainRate: number;
    CircleSize: number;
    OverallDifficulty: number;
    ApproachRate: number;
    SliderMultiplier: number;
    SliderTickRate: number;
  };
  TimingPoints: Array<[number, number, number, number, number, number, boolean, number]>;
  Colours?: Record<string, string>;
  Events?: Array<[string | number, string | number, string]>;
  HitObjects: PreviewHitObject[];
  HitObjects_drawOrder: PreviewHitObject[];
  radius: number;
  preempt: number;
  fadein: number;
  fadeout: number;
  duration: number;
  backgroundPicture?: HTMLImageElement;
}
