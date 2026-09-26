import { clamp } from './functions';
import { PreviewHitObject } from './types';

export class HitObject implements PreviewHitObject {
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

  curveType?: string;
  curvePoints?: Array<{ x: number; y: number }>;
  slides?: number;
  pixelLength?: number;
  edgeSounds?: number[];
  edgeSets?: number[][];
  beatLength?: number;
  duration?: number;
  endTime: number;

  combo?: number;
  comboIndex?: number;
  hitSample?: [number, number, number, number, string];

  constructor(obj: string[] | any[], index: number = 0) {
    if (!obj || !Array.isArray(obj) || obj.length < 4) {
      throw new TypeError(`HitObject #${index}: Invalid raw array`);
    }

    const validateInt = (val: any) => {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? 0 : parsed;
    };
    const validateFloat = (val: any) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    };

    this.x = validateInt(obj[0]);
    this.y = validateInt(obj[1]);
    this.time = validateInt(obj[2]);
    this.type = validateInt(obj[3]);
    this.hitSounds = obj.length > 4 ? validateInt(obj[4]) : 0;
    this.StackCount = 0;

    this.isHitCircle = !!(this.type & 1);
    this.isSlider = !!(this.type & 2);
    this.isSpinner = !!(this.type & 8);
    this.isNewCombo = !!(this.type & 4);

    const parseHitSample = (idx: number) => {
      const samples = obj[idx]?.toString()?.split(':');
      if (!samples || samples.length === 0) {
        this.hitSample = [0, 0, 0, 0, ''];
      } else {
        this.hitSample = [
          validateInt(samples[0]),
          validateInt(samples[1]),
          validateInt(samples[2]),
          clamp(0, validateInt(samples[3]), 100),
          samples[4] || '',
        ];
      }
    };

    if (this.isSlider) {
      const rawCurve = (obj[5] || '').toString();
      const curveParts = rawCurve.split('|');
      this.curveType = curveParts[0] || 'L';
      this.curvePoints = [];

      for (let i = 1; i < curveParts.length; i++) {
        const coords = curveParts[i].split(':');
        if (coords.length === 2) {
          const px = parseFloat(coords[0]);
          const py = parseFloat(coords[1]);
          if (!isNaN(px) && !isNaN(py)) {
            this.curvePoints.push({ x: px, y: py });
          }
        }
      }

      this.slides = obj.length > 6 ? Math.max(1, validateInt(obj[6])) : 1;
      this.pixelLength = obj.length > 7 ? validateFloat(obj[7]) : 0;

      // Edge sounds and sets
      const edgeSoundParts = (obj[8] || '').toString().split('|');
      this.edgeSounds = [];
      for (let i = 0; i <= this.slides; i++) {
        this.edgeSounds.push(validateInt(edgeSoundParts[i] ?? 0));
      }

      const edgeSetParts = (obj[9] || '').toString().split('|');
      this.edgeSets = [];
      for (let i = 0; i <= this.slides; i++) {
        const setCoord = (edgeSetParts[i] ?? '0:0').toString().split(':');
        this.edgeSets.push([validateInt(setCoord[0]), validateInt(setCoord[1])]);
      }

      this.duration = 0;
      this.endTime = this.time;
      parseHitSample(10);
    } else if (this.isSpinner) {
      this.endTime = obj.length > 5 ? validateInt(obj[5]) : this.time;
      this.duration = this.endTime - this.time;
      parseHitSample(6);
    } else {
      this.endTime = this.time;
      parseHitSample(5);
    }
  }
}
