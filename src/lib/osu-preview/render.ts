import { clamp, distance, easingFunctions, lerp, mod, range } from './functions';
import { strokeSlider, getFollowPosition, getSliderTicks, ViewportTransform } from './slider';
import { PreviewBeatmap, PreviewHitObject, OsuSkin, OsuMod } from './types';

export interface RenderOptions {
  BackgroundDim?: number;
  ShowCursor?: boolean;
  ShowGrid?: boolean;
  ShowKeyOverlay?: boolean;
}

function isDrawable(
  sprite: HTMLImageElement | HTMLCanvasElement | undefined | null
): boolean {
  if (!sprite) return false;
  if (sprite instanceof HTMLCanvasElement) return true;
  return (sprite as HTMLImageElement).complete && (sprite as HTMLImageElement).naturalWidth > 0;
}

export class OsuPreviewRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bufferCanvas: HTMLCanvasElement;
  private bufferCtx: CanvasRenderingContext2D;

  private canvasSize: [number, number] = [512, 384];
  private fieldSize: [number, number] = [512, 384];
  private margins: [number, number] = [0, 0];
  private minMargin: number = 20;

  private bezierSegmentMaxLengthSqrd: number = 100;
  private sliderGradientDivisions: number = 16;
  private trailIntervalMs: number = 16;
  private maxRPM: number = 477;

  // Key press counters
  private k1Pressed: boolean = false;
  private k2Pressed: boolean = false;
  private k1Count: number = 0;
  private k2Count: number = 0;
  private lastTappedObject: PreviewHitObject | null = null;
  private currentKey: 'k1' | 'k2' = 'k1';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context from canvas');
    this.ctx = ctx;

    this.bufferCanvas = document.createElement('canvas');
    const bufferCtx = this.bufferCanvas.getContext('2d');
    if (!bufferCtx) throw new Error('Could not get 2D context from bufferCanvas');
    this.bufferCtx = bufferCtx;

    this.resize();
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(320, rect.width || 640);
    const height = Math.max(240, rect.height || 480);

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.bufferCanvas.width = width * dpr;
    this.bufferCanvas.height = height * dpr;
    this.bufferCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.bufferCtx.scale(dpr, dpr);

    this.canvasSize = [width, height];

    if (width / height > 512 / 384) {
      this.fieldSize[1] = height - this.minMargin * 2;
      this.fieldSize[0] = (this.fieldSize[1] / 384) * 512;
      this.margins = [(width - this.fieldSize[0]) / 2, this.minMargin];
    } else {
      this.fieldSize[0] = width - this.minMargin * 2;
      this.fieldSize[1] = (this.fieldSize[0] / 512) * 384;
      this.margins = [this.minMargin, (height - this.fieldSize[1]) / 2];
    }

    const BEZIER_SEGMENT_MAX_LENGTH = 10;
    this.bezierSegmentMaxLengthSqrd =
      this.fieldSize[0] > this.fieldSize[1]
        ? ((BEZIER_SEGMENT_MAX_LENGTH / this.fieldSize[0]) * 512) ** 2
        : ((BEZIER_SEGMENT_MAX_LENGTH / this.fieldSize[1]) * 384) ** 2;
  }

  public toPixelsX(val: number): number {
    return (val / 512) * this.fieldSize[0];
  }

  public toPixelsY(val: number, isHardRock: boolean = false): number {
    return ((isHardRock ? 384 - val : val) / 512) * this.fieldSize[0];
  }

  private getTransform(isHardRock: boolean): ViewportTransform {
    return {
      toPixelsX: (v) => this.toPixelsX(v),
      toPixelsY: (v) => this.toPixelsY(v, isHardRock),
      margins: this.margins,
      bezierSegmentMaxLengthSqrd: this.bezierSegmentMaxLengthSqrd,
    };
  }

  /**
   * Main render frame
   */
  public render(
    time: number,
    beatmap: PreviewBeatmap,
    skin: OsuSkin,
    activeMods: Set<OsuMod> = new Set(),
    options: RenderOptions = {}
  ): void {
    const isHardRock = activeMods.has('hr');
    const isHidden = activeMods.has('hd');
    const bgDim = options.BackgroundDim ?? 0.85;
    const showCursor = options.ShowCursor ?? true;
    const showGrid = options.ShowGrid ?? false;
    const showKeyOverlay = options.ShowKeyOverlay ?? true;

    const ctx = this.ctx;
    const bufferCtx = this.bufferCtx;
    const transform = this.getTransform(isHardRock);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, this.canvasSize[0], this.canvasSize[1]);

    // 1. Draw Background
    if (beatmap.backgroundPicture && beatmap.backgroundPicture.complete) {
      ctx.drawImage(beatmap.backgroundPicture, 0, 0, this.canvasSize[0], this.canvasSize[1]);
    } else {
      // Sleek osu! Lazer dark gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, this.canvasSize[1]);
      bgGrad.addColorStop(0, '#0d0f14');
      bgGrad.addColorStop(1, '#05070a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, this.canvasSize[0], this.canvasSize[1]);
    }

    // 2. Dim Background
    ctx.fillStyle = `rgba(0, 0, 0, ${bgDim})`;
    ctx.fillRect(0, 0, this.canvasSize[0], this.canvasSize[1]);

    // 3. Playfield Border & Grid
    if (showGrid) {
      ctx.lineWidth = 1;
      for (let i = 0; i <= 16; i++) {
        ctx.strokeStyle = i === 8 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.moveTo((i * this.fieldSize[0]) / 16 + this.margins[0], this.margins[1]);
        ctx.lineTo(
          (i * this.fieldSize[0]) / 16 + this.margins[0],
          this.fieldSize[1] + this.margins[1]
        );
        ctx.stroke();
      }
      for (let i = 0; i <= 12; i++) {
        ctx.strokeStyle = i === 6 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.moveTo(this.margins[0], (i * this.fieldSize[1]) / 12 + this.margins[1]);
        ctx.lineTo(
          this.fieldSize[0] + this.margins[0],
          (i * this.fieldSize[1]) / 12 + this.margins[1]
        );
        ctx.stroke();
      }
    }

    // Playfield outer bounding box
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.strokeRect(this.margins[0], this.margins[1], this.fieldSize[0], this.fieldSize[1]);

    // 4. Follow Points
    this.drawFollowPoints(time, beatmap, skin, isHardRock);

    // 5. Draw HitObjects from last to first (proper depth ordering)
    let index = beatmap.HitObjects_drawOrder.length - 1;
    const approachQueue: PreviewHitObject[] = [];
    const followQueue: PreviewHitObject[] = [];

    while (index >= 0) {
      const obj = beatmap.HitObjects_drawOrder[index];
      const objEndTime = obj.isSlider
        ? obj.time + (obj.duration || 0) * (obj.slides || 1)
        : obj.isSpinner
        ? obj.endTime
        : obj.time;

      if (
        objEndTime + beatmap.fadeout < time ||
        obj.time - beatmap.preempt > time
      ) {
        index--;
        continue;
      }

      // SLIDER BODY
      if (obj.isSlider) {
        bufferCtx.globalCompositeOperation = 'source-over';
        bufferCtx.clearRect(0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
        bufferCtx.beginPath();

        let snake = 1;
        if (time < obj.time) {
          if (index === 0 || !isHidden) {
            approachQueue.push(obj);
          }
          ctx.globalAlpha = clamp(0, (time - (obj.time - beatmap.preempt)) / beatmap.fadein, 1);
          snake = clamp(0, (time - (obj.time - beatmap.preempt)) / beatmap.fadein, 0.5) * 2;
        } else {
          if (time < obj.time + (obj.duration || 0) * (obj.slides || 1) + 200) {
            followQueue.push(obj);
          }
          if (isHidden) {
            ctx.globalAlpha = easingFunctions.easeIn(
              clamp(0, (obj.endTime - time) / ((obj.duration || 1) * (obj.slides || 1)), 1)
            );
          } else {
            ctx.globalAlpha = clamp(
              0,
              (obj.time + (obj.duration || 0) * (obj.slides || 1) + beatmap.fadeout - time) /
                beatmap.fadeout,
              1
            );
          }
          snake = 1;
        }

        bufferCtx.moveTo(
          this.toPixelsX(obj.x) + this.margins[0],
          this.toPixelsY(obj.y, isHardRock) + this.margins[1]
        );
        strokeSlider(
          obj,
          (obj.pixelLength || 0) * snake,
          true,
          bufferCtx,
          transform,
          isHardRock
        );

        const diameter = ((beatmap.radius * 2) / 512) * this.fieldSize[0] * 0.8;
        bufferCtx.lineJoin = 'round';
        bufferCtx.lineCap = 'round';
        bufferCtx.globalAlpha = 1;

        // Slider Border
        bufferCtx.lineWidth = diameter * 1.15;
        bufferCtx.strokeStyle = `rgb(${skin.ini.Colours.SliderBorder || '255,255,255'})`;
        bufferCtx.stroke();

        // Destination-out inner cut
        bufferCtx.lineWidth = diameter;
        bufferCtx.globalCompositeOperation = 'destination-out';
        bufferCtx.strokeStyle = 'black';
        bufferCtx.stroke();

        ctx.drawImage(this.bufferCanvas, 0, 0);

        // Slider Inner Track
        const comboColor =
          skin.ini.combos[(obj.comboIndex || 0) % skin.ini.combos.length] || [255, 102, 170];
        const inner = comboColor.map((x) => clamp(61, range(0, 170, 61, 255, x), 255));
        const outer = comboColor.map((x) => x * 0.91);

        bufferCtx.clearRect(0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
        bufferCtx.globalCompositeOperation = 'source-over';

        for (let divs = this.sliderGradientDivisions, i = divs; i > 0; i--) {
          bufferCtx.lineWidth = (diameter * i) / divs;
          bufferCtx.strokeStyle = `rgb(${inner.map((x, j) => lerp(x, outer[j], i / divs)).join(',')})`;
          bufferCtx.stroke();
        }

        ctx.globalAlpha *= 0.75;
        ctx.drawImage(this.bufferCanvas, 0, 0);

        const slideN = Math.max(
          Math.floor((time - obj.time) / Math.max(1, obj.duration || 1)),
          0
        );
        const circleSprite =
          skin.sliderendcircle[(obj.comboIndex || 0) % skin.sliderendcircle.length];
        const overlaySprite = skin.sliderendcircleoverlay;

        const _drawEnd = (
          sprite: HTMLCanvasElement | HTMLImageElement,
          position: [number, number, number, boolean?],
          startTime: number
        ) => {
          const size = [
            (this.toPixelsX(beatmap.radius) / 64) * sprite.width,
            (this.toPixelsX(beatmap.radius) / 64) * sprite.height,
          ];
          ctx.globalAlpha = clamp(0, (time - startTime) / 150, 1);
          ctx.drawImage(
            sprite,
            this.toPixelsX(position[0]) + this.margins[0] - size[0] / 2,
            this.toPixelsY(position[1], isHardRock) + this.margins[1] - size[1] / 2,
            size[0],
            size[1]
          );
        };

        const slides = obj.slides || 1;
        if ((slideN < slides && slideN % 2 === 0) || slideN < slides - 1) {
          const position = getFollowPosition(obj, obj.pixelLength || 0, isHardRock);
          const startTime =
            obj.time +
            (obj.duration || 0) * (slideN === 0 || slideN % 2 ? slideN : slideN - 1) +
            (slideN === 0 ? -beatmap.preempt + beatmap.fadein / 2 : 0);
          if (circleSprite) _drawEnd(circleSprite, position, startTime);
          if (overlaySprite) _drawEnd(overlaySprite, position, startTime);
        }

        // Reverse Arrows
        if (slides > 1) {
          const reverse1 = slideN < slides - 1;
          const reverse2 = slideN < slides - 2;
          const arrowSprite = skin.reversearrow;

          if (isDrawable(arrowSprite)) {
            const arrowSize = [
              (this.toPixelsX(beatmap.radius) / 64) * arrowSprite.width,
              (this.toPixelsX(beatmap.radius) / 64) * arrowSprite.height,
            ];

            const _drawArrow = (
              pos: [number, number, number, boolean?],
              startTime: number,
              flip: boolean
            ) => {
              const scale =
                1 +
                (1 - easingFunctions.easeOut(mod((time - startTime) / (obj.beatLength || 500), 1))) *
                  0.3;
              ctx.globalAlpha = clamp(0, (time - startTime) / 150, 1);
              ctx.save();
              ctx.translate(
                this.toPixelsX(pos[0]) + this.margins[0],
                this.toPixelsY(pos[1], isHardRock) + this.margins[1]
              );
              ctx.rotate(pos[2] * (isHardRock ? -1 : 1) + (flip ? Math.PI : 0));
              ctx.drawImage(
                arrowSprite,
                (-arrowSize[0] / 2) * scale,
                (-arrowSize[1] / 2) * scale,
                arrowSize[0] * scale,
                arrowSize[1] * scale
              );
              ctx.restore();
            };

            if ((slideN % 2 === 0 && reverse1) || (slideN % 2 === 1 && reverse2)) {
              _drawArrow(
                getFollowPosition(obj, obj.pixelLength || 0, isHardRock),
                obj.time + (obj.duration || 0) * slideN,
                true
              );
            }
            if ((slideN % 2 === 0 && reverse2) || (slideN % 2 === 1 && reverse1)) {
              _drawArrow(getFollowPosition(obj, 0, isHardRock), obj.time + (obj.duration || 0) * slideN, false);
            }
          }
        }

        // Slider Ticks
        const ticks = getSliderTicks(obj, beatmap.Difficulty.SliderTickRate);
        const tickSprite = skin.sliderscorepoint;
        if (isDrawable(tickSprite)) {
          for (const tick of ticks) {
            const tickTime = obj.time + (slideN % 2 ? (obj.duration || 0) - tick : tick);
            if (time < tickTime) {
              const followPos = getFollowPosition(
                obj,
                (tick / Math.max(1, obj.duration || 1)) * (obj.pixelLength || 0),
                isHardRock
              );
              const tickSize = [
                ((this.toPixelsX(beatmap.radius) * 2) / 128) * tickSprite.width,
                ((this.toPixelsX(beatmap.radius) * 2) / 128) * tickSprite.height,
              ];
              ctx.globalAlpha = 0.9;
              ctx.drawImage(
                tickSprite,
                this.toPixelsX(followPos[0]) + this.margins[0] - tickSize[0] / 2,
                this.toPixelsY(followPos[1], isHardRock) + this.margins[1] - tickSize[1] / 2,
                tickSize[0],
                tickSize[1]
              );
            }
          }
        }
      }

      // HIT CIRCLE (Or Slider Head)
      if (obj.isHitCircle || obj.isSlider) {
        let circleSprite: HTMLCanvasElement | undefined;
        let overlaySprite: HTMLImageElement | HTMLCanvasElement;

        if (obj.isSlider) {
          circleSprite = skin.sliderstartcircle[(obj.comboIndex || 0) % skin.sliderstartcircle.length];
          overlaySprite = skin.sliderstartcircleoverlay;
        } else {
          circleSprite = skin.hitcircle[(obj.comboIndex || 0) % skin.hitcircle.length];
          overlaySprite = skin.hitcircleoverlay;
        }

        let circleScale = 1;
        if (time <= obj.time) {
          if (index === 0 || !isHidden) {
            approachQueue.push(obj);
          }
          ctx.globalAlpha = clamp(0, (time - (obj.time - beatmap.preempt)) / beatmap.fadein, 1);
          circleScale = 1;
        } else {
          ctx.globalAlpha = clamp(0, (obj.time + beatmap.fadeout - time) / beatmap.fadeout, 1);
          circleScale =
            1 +
            easingFunctions.easeOut(
              clamp(0, 1 - (obj.time + beatmap.fadeout - time) / beatmap.fadeout, 1)
            ) *
              0.35;
        }

        if (circleSprite) {
          const size = [
            ((this.toPixelsX(beatmap.radius) * 2) / 128) * circleSprite.width * circleScale,
            ((this.toPixelsX(beatmap.radius) * 2) / 128) * circleSprite.height * circleScale,
          ];
          ctx.drawImage(
            circleSprite,
            this.toPixelsX(obj.x) + this.margins[0] - size[0] / 2,
            this.toPixelsY(obj.y, isHardRock) + this.margins[1] - size[1] / 2,
            size[0],
            size[1]
          );
        }

        if (overlaySprite) {
          const size = [
            ((this.toPixelsX(beatmap.radius) * 2) / 128) * overlaySprite.width * circleScale,
            ((this.toPixelsX(beatmap.radius) * 2) / 128) * overlaySprite.height * circleScale,
          ];
          ctx.drawImage(
            overlaySprite,
            this.toPixelsX(obj.x) + this.margins[0] - size[0] / 2,
            this.toPixelsY(obj.y, isHardRock) + this.margins[1] - size[1] / 2,
            size[0],
            size[1]
          );
        }

        // Draw Combo Number
        if (time > obj.time && !isHidden) {
          ctx.globalAlpha = clamp(0, (obj.time + 60 - time) / 60, 1);
        }

        const comboStr = (obj.combo || 1).toString();
        const firstDigitSprite = (skin as any)[`default-${comboStr[0]}`];
        if (firstDigitSprite && firstDigitSprite.complete && firstDigitSprite.naturalWidth > 0) {
          const width = firstDigitSprite.width;
          const height = firstDigitSprite.height;
          const overlap = skin.ini.Fonts.HitCircleOverlap ?? -2;
          const totalWidth = width * comboStr.length - overlap * (comboStr.length - 1);
          const numberScale = (beatmap.radius / 80 / 512) * this.fieldSize[0];

          for (let c = 0; c < comboStr.length; c++) {
            const digitSprite = (skin as any)[`default-${comboStr[c]}`];
            if (digitSprite && digitSprite.complete) {
              const xPos =
                this.toPixelsX(obj.x) +
                this.margins[0] +
                (-totalWidth / 2 + (width - overlap) * c) * numberScale;
              const yPos =
                this.toPixelsY(obj.y, isHardRock) + this.margins[1] - (height / 2) * numberScale;
              ctx.drawImage(
                digitSprite,
                xPos,
                yPos,
                width * numberScale,
                height * numberScale
              );
            }
          }
        } else {
          // Fallback crisp font
          ctx.font = `bold ${Math.round(this.toPixelsX(beatmap.radius) * 0.8)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(
            comboStr,
            this.toPixelsX(obj.x) + this.margins[0],
            this.toPixelsY(obj.y, isHardRock) + this.margins[1]
          );
        }
      }

      index--;
    }

    // 6. Draw Approach Circles
    for (const obj of approachQueue) {
      const approachScale =
        1 + clamp(0, 1 - (time - (obj.time - beatmap.preempt)) / beatmap.preempt, 1) * 3;
      ctx.globalAlpha =
        (clamp(0, (time - (obj.time - beatmap.preempt)) / beatmap.fadein, 0.9) / 0.9) * 0.7;

      const tinted =
        skin.approachcircle[(obj.comboIndex || 0) % skin.approachcircle.length] ||
        skin.approachcircle[0];
      if (tinted) {
        const size = [
          (this.toPixelsX(beatmap.radius) / 64) * tinted.width * approachScale,
          (this.toPixelsX(beatmap.radius) / 64) * tinted.height * approachScale,
        ];
        ctx.drawImage(
          tinted,
          this.toPixelsX(obj.x) + this.margins[0] - size[0] / 2,
          this.toPixelsY(obj.y, isHardRock) + this.margins[1] - size[1] / 2,
          size[0],
          size[1]
        );
      }
    }

    // 7. Draw Active Slider Follow Circle & Ball
    for (const obj of followQueue) {
      const endTime = obj.time + (obj.duration || 0) * (obj.slides || 1);
      if (time < endTime) {
        const slideN = (time - obj.time) / Math.max(1, obj.duration || 1);
        const ratio = Math.floor(slideN) % 2 ? 1 - (slideN % 1) : slideN % 1;
        const followPos = getFollowPosition(
          obj,
          ratio * (obj.pixelLength || 0),
          isHardRock
        );

        // Follow circle
        const followCircleSprite = skin.sliderfollowcircle;
        if (isDrawable(followCircleSprite)) {
          const followScale =
            0.5 + easingFunctions.easeOut(clamp(0, (time - obj.time) / 150, 1)) * 0.5;
          const size = [
            (this.toPixelsX(beatmap.radius) / 64) * followCircleSprite.width * followScale,
            (this.toPixelsX(beatmap.radius) / 64) * followCircleSprite.height * followScale,
          ];
          ctx.globalAlpha = clamp(0, (time - obj.time) / 60, 1);
          ctx.drawImage(
            followCircleSprite,
            this.toPixelsX(followPos[0]) + this.margins[0] - size[0] / 2,
            this.toPixelsY(followPos[1], isHardRock) + this.margins[1] - size[1] / 2,
            size[0],
            size[1]
          );
        }

        // Slider Ball
        const sliderBallFrames = skin.sliderb;
        if (sliderBallFrames && sliderBallFrames.length > 0) {
          const ballSprite =
            sliderBallFrames[0][(obj.comboIndex || 0) % sliderBallFrames[0].length];
          if (ballSprite) {
            const ballSize = [
              (this.toPixelsX(beatmap.radius) / 64) * ballSprite.width,
              (this.toPixelsX(beatmap.radius) / 64) * ballSprite.height,
            ];
            ctx.globalAlpha = 1;
            ctx.save();
            ctx.translate(
              this.toPixelsX(followPos[0]) + this.margins[0],
              this.toPixelsY(followPos[1], isHardRock) + this.margins[1]
            );
            ctx.rotate(followPos[2] * (isHardRock ? -1 : 1));
            ctx.drawImage(ballSprite, -ballSize[0] / 2, -ballSize[1] / 2, ballSize[0], ballSize[1]);
            ctx.restore();
          }
        }
      }
    }

    // 8. Autoplay Bot Cursor & Cursortrail
    if (showCursor) {
      this.drawAutoplayCursor(time, beatmap, skin, isHardRock);
    }

    // 9. Key Overlay HUD
    if (showKeyOverlay) {
      this.drawKeyOverlay();
    }
  }

  private drawFollowPoints(
    time: number,
    beatmap: PreviewBeatmap,
    _skin: OsuSkin,
    isHardRock: boolean
  ): void {
    const ctx = this.ctx;
    for (let i = 1; i < beatmap.HitObjects.length; i++) {
      const obj = beatmap.HitObjects[i];
      const lastObj = beatmap.HitObjects[i - 1];

      if (obj.isSpinner || lastObj.isSpinner || obj.combo === 1) continue;

      const timeDiff = obj.time - lastObj.endTime;
      const startPoint: [number, number] = [obj.x, obj.y];
      let endPoint: [number, number] = [lastObj.x, lastObj.y];
      if (lastObj.isSlider) {
        const follow = getFollowPosition(
          lastObj,
          (lastObj.pixelLength || 0) * ((lastObj.slides || 1) % 2),
          isHardRock
        );
        endPoint = [follow[0], follow[1]];
      }

      const dist = distance(startPoint, endPoint);
      const separation = 32;

      for (let j = separation * 1.5; j < dist - separation; j += separation) {
        const animRatio = j / dist;
        const fadeOutTime = lastObj.endTime + animRatio * timeDiff;
        const fadeInTime = fadeOutTime - 800;

        if (time < fadeInTime || time > fadeOutTime + 400) continue;

        let alpha = 1;
        if (time < fadeOutTime) {
          alpha = clamp(0, (time - fadeInTime) / 400, 1);
        } else {
          alpha = 1 - clamp(0, (time - fadeOutTime) / 400, 1);
        }

        ctx.globalAlpha = alpha * 0.6;
        const x = endPoint[0] + (startPoint[0] - endPoint[0]) * animRatio;
        const y = endPoint[1] + (startPoint[1] - endPoint[1]) * animRatio;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(
          this.toPixelsX(x) + this.margins[0],
          this.toPixelsY(y, isHardRock) + this.margins[1],
          2.5,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  /**
   * Generates exact Autoplay bot cursor position at time t
   * Ported from TechnoZamb getTrailPoint
   */
  public getCursorPositionAt(
    t: number,
    beatmap: PreviewBeatmap,
    isHardRock: boolean = false
  ): [number, number, boolean] {
    let nextObjIndex = beatmap.HitObjects.findIndex((x) => x.time >= t);
    let nextObj = beatmap.HitObjects[nextObjIndex];
    let lastObjIndex = nextObjIndex - 1;
    let lastObj = beatmap.HitObjects[lastObjIndex];

    let easer = easingFunctions.easeOut2;
    let x = 256;
    let y = 192;
    let inSlider = false;

    // After last object
    if (nextObjIndex === -1) {
      lastObjIndex = beatmap.HitObjects.length - 1;
      lastObj = beatmap.HitObjects[lastObjIndex];
      nextObj = {
        x: 256,
        y: 192,
        time: beatmap.duration + 10000,
        endTime: beatmap.duration + 10000,
      } as any;
    }

    // Inside of a spinner
    if (lastObj?.isSpinner && t < lastObj.endTime) {
      let angle = ((t - lastObj.time) / 1000 / 60) * this.maxRPM * Math.PI * 2 + Math.PI / 2;
      if (lastObjIndex > 0) {
        const prevObj = beatmap.HitObjects[lastObjIndex - 1];
        angle += Math.atan2(192 - prevObj.y, prevObj.x - 256);
      }
      x = 256 + Math.cos(angle) * 50;
      y = 192 - Math.sin(angle) * 50;
      return [x, y, true];
    }

    // Inside of a slider
    if (lastObj?.isSlider && t < lastObj.endTime) {
      inSlider = true;
      const duration = Math.max(1, lastObj.duration || 1);
      const len = ((t - lastObj.time) % duration) / duration;
      const ratio =
        Math.floor((t - lastObj.time) / duration) % 2 ? 1 - len : len;
      const followPos = getFollowPosition(
        lastObj,
        ratio * (lastObj.pixelLength || 0),
        isHardRock
      );
      return [followPos[0], followPos[1], true];
    }

    // Before first object
    if (nextObjIndex === 0) {
      if (t >= nextObj.time - 1000) {
        lastObj = {
          x: 256,
          y: 192,
          time: nextObj.time - 1000,
          endTime: nextObj.time - 1000,
        } as any;
      } else {
        return [256, 192, false];
      }
    }

    if (!lastObj) {
      return [nextObj ? nextObj.x : 256, nextObj ? nextObj.y : 192, false];
    }

    // Between objects
    let startX = lastObj.x;
    let startY = lastObj.y;
    if (lastObj.isSlider) {
      const endPos = getFollowPosition(
        lastObj,
        (lastObj.pixelLength || 0) * ((lastObj.slides || 1) % 2),
        isHardRock
      );
      startX = endPos[0];
      startY = endPos[1];
    }

    const tNorm = clamp(0, (t - lastObj.endTime) / Math.max(1, nextObj.time - lastObj.endTime), 1);
    const easeVal = easer(tNorm);
    x = lerp(startX, nextObj.x, easeVal);
    y = lerp(startY, nextObj.y, easeVal);

    return [x, y, inSlider];
  }

  private drawAutoplayCursor(
    time: number,
    beatmap: PreviewBeatmap,
    skin: OsuSkin,
    isHardRock: boolean
  ): void {
    const ctx = this.ctx;
    const [cursorX, cursorY, inSlider] = this.getCursorPositionAt(time, beatmap, isHardRock);

    // Update keypress state for HUD
    const activeHitObj = beatmap.HitObjects.find((o) => Math.abs(o.time - time) <= 35);
    if (activeHitObj && activeHitObj !== this.lastTappedObject) {
      this.lastTappedObject = activeHitObj;
      if (this.currentKey === 'k1') {
        this.k1Pressed = true;
        this.k1Count++;
        this.currentKey = 'k2';
      } else {
        this.k2Pressed = true;
        this.k2Count++;
        this.currentKey = 'k1';
      }
      setTimeout(() => {
        this.k1Pressed = inSlider;
        this.k2Pressed = false;
      }, 50);
    } else if (inSlider) {
      this.k1Pressed = true;
    } else {
      this.k1Pressed = false;
      this.k2Pressed = false;
    }

    // 1. Draw Cursor Trail (fading dots)
    const trailDuration = 180;
    for (let t = time - trailDuration; t < time; t += this.trailIntervalMs) {
      const [tx, ty] = this.getCursorPositionAt(t, beatmap, isHardRock);
      const trailAlpha = ((t - (time - trailDuration)) / trailDuration) * 0.45;
      ctx.globalAlpha = trailAlpha;
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(
        this.toPixelsX(tx) + this.margins[0],
        this.toPixelsY(ty, isHardRock) + this.margins[1],
        6,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // 2. Draw Main Cursor
    const px = this.toPixelsX(cursorX) + this.margins[0];
    const py = this.toPixelsY(cursorY, isHardRock) + this.margins[1];

    ctx.globalAlpha = 1;
    if (skin.cursor && skin.cursor.complete && skin.cursor.naturalWidth > 0) {
      const size = [
        (this.toPixelsX(beatmap.radius) / 64) * skin.cursor.width,
        (this.toPixelsX(beatmap.radius) / 64) * skin.cursor.height,
      ];
      ctx.drawImage(skin.cursor, px - size[0] / 2, py - size[1] / 2, size[0], size[1]);
    } else {
      // Sleek osu! Lazer neon cursor
      ctx.beginPath();
      ctx.arc(px, py, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#00f0ff';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }

  private drawKeyOverlay(): void {
    const ctx = this.ctx;
    const x = this.canvasSize[0] - 55;
    const y = this.margins[1] + 20;

    // K1
    ctx.fillStyle = this.k1Pressed ? '#ff66aa' : 'rgba(255, 255, 255, 0.12)';
    ctx.strokeStyle = this.k1Pressed ? '#ffffff' : 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, 36, 26, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.k1Pressed ? '#000000' : '#ffffff';
    ctx.fillText('K1', x + 18, y + 13);

    // K2
    ctx.fillStyle = this.k2Pressed ? '#00f0ff' : 'rgba(255, 255, 255, 0.12)';
    ctx.strokeStyle = this.k2Pressed ? '#ffffff' : 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.roundRect(x, y + 32, 36, 26, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.k2Pressed ? '#000000' : '#ffffff';
    ctx.fillText('K2', x + 18, y + 45);
  }
}
