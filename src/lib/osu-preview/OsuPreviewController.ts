import { OsuPreviewRenderer, RenderOptions } from './render';
import { parseBeatmapText, applyBeatmapCalculations } from './beatmap';
import { loadDefaultSkin } from './skin';
import { HitsoundPlayer } from './audio';
import { PreviewBeatmap, OsuSkin, OsuMod } from './types';
import { clamp } from './functions';

export type TickCallback = (state: {
  currentTimeMs: number;
  durationMs: number;
  isPlaying: boolean;
  playbackRate: number;
}) => void;

export class OsuPreviewController {
  private renderer: OsuPreviewRenderer;
  private beatmap: PreviewBeatmap | null = null;
  private skin: OsuSkin | null = null;
  private hitsoundPlayer: HitsoundPlayer;

  private currentTimeMs: number = 0;
  private isPlaying: boolean = false;
  private playbackRate: number = 1.0;
  private lastRafTime: number = 0;
  private rafId: number | null = null;

  private activeMods: Set<OsuMod> = new Set();
  private options: RenderOptions = {
    BackgroundDim: 0.85,
    ShowCursor: true,
    ShowGrid: false,
    ShowKeyOverlay: true,
  };

  private lastPlayedNoteIndex: number = -1;
  private tickCallbacks: Set<TickCallback> = new Set();
  private loopRange: { startMs: number; endMs: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new OsuPreviewRenderer(canvas);
    this.hitsoundPlayer = new HitsoundPlayer();
  }

  public async init(rawBeatmapText: string, initialTimeMs: number = 0): Promise<void> {
    this.hitsoundPlayer.init();
    this.skin = await loadDefaultSkin('/skin/default');
    this.beatmap = parseBeatmapText(rawBeatmapText, this.activeMods);

    this.currentTimeMs = clamp(0, initialTimeMs, this.beatmap.duration);
    this.lastPlayedNoteIndex = this.findLastNoteIndexBefore(this.currentTimeMs);

    this.renderer.resize();
    this.startLoop();
    this.drawCurrentFrame();
  }

  public subscribe(cb: TickCallback): () => void {
    this.tickCallbacks.add(cb);
    return () => this.tickCallbacks.delete(cb);
  }

  private notifyState(): void {
    const duration = this.beatmap ? this.beatmap.duration : 1000;
    for (const cb of this.tickCallbacks) {
      cb({
        currentTimeMs: this.currentTimeMs,
        durationMs: duration,
        isPlaying: this.isPlaying,
        playbackRate: this.playbackRate,
      });
    }
  }

  public play(): void {
    if (this.isPlaying) return;
    if (this.beatmap && this.currentTimeMs >= this.beatmap.duration) {
      this.currentTimeMs = 0;
      this.lastPlayedNoteIndex = -1;
    }
    this.isPlaying = true;
    this.lastRafTime = performance.now();
    this.notifyState();
  }

  public pause(): void {
    this.isPlaying = false;
    this.notifyState();
  }

  public togglePlay(): void {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  public seek(timeMs: number): void {
    if (!this.beatmap) return;
    this.currentTimeMs = clamp(0, timeMs, this.beatmap.duration);
    this.lastPlayedNoteIndex = this.findLastNoteIndexBefore(this.currentTimeMs);
    this.drawCurrentFrame();
    this.notifyState();
  }

  public setSpeed(rate: number): void {
    this.playbackRate = clamp(0.25, rate, 3.0);
    this.notifyState();
  }

  public setMod(modName: OsuMod, enabled: boolean): void {
    if (enabled) this.activeMods.add(modName);
    else this.activeMods.delete(modName);

    if (this.beatmap) {
      applyBeatmapCalculations(this.beatmap, this.activeMods);
    }
    this.drawCurrentFrame();
  }

  public toggleMod(modName: OsuMod): boolean {
    const isNowActive = !this.activeMods.has(modName);
    this.setMod(modName, isNowActive);
    return isNowActive;
  }

  public hasMod(modName: OsuMod): boolean {
    return this.activeMods.has(modName);
  }

  public setVolume(vol: number): void {
    this.hitsoundPlayer.setVolume(vol);
  }

  public setMuted(muted: boolean): void {
    this.hitsoundPlayer.setMuted(muted);
  }

  public setBackgroundDim(dim: number): void {
    this.options.BackgroundDim = clamp(0, dim, 1);
    this.drawCurrentFrame();
  }

  public setLoopRange(startMs: number, endMs: number): void {
    this.loopRange = { startMs, endMs };
  }

  public clearLoopRange(): void {
    this.loopRange = null;
  }

  public resize(): void {
    this.renderer.resize();
    this.drawCurrentFrame();
  }

  private findLastNoteIndexBefore(timeMs: number): number {
    if (!this.beatmap) return -1;
    let idx = -1;
    for (let i = 0; i < this.beatmap.HitObjects.length; i++) {
      if (this.beatmap.HitObjects[i].time <= timeMs) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }

  private checkHitsounds(prevTime: number, curTime: number): void {
    if (!this.beatmap) return;
    const hitObjs = this.beatmap.HitObjects;
    for (let i = this.lastPlayedNoteIndex + 1; i < hitObjs.length; i++) {
      const obj = hitObjs[i];
      if (obj.time > curTime) break;
      if (obj.time >= prevTime) {
        this.hitsoundPlayer.playHit(obj.hitSounds, obj.hitSample?.[0] || 2);
        this.lastPlayedNoteIndex = i;
      }
    }
  }

  private startLoop(): void {
    if (this.rafId !== null) return;
    const loop = (now: number) => {
      this.rafId = requestAnimationFrame(loop);
      if (!this.isPlaying) return;

      const deltaMs = (now - this.lastRafTime) * this.playbackRate;
      this.lastRafTime = now;

      const prevTime = this.currentTimeMs;
      this.currentTimeMs += deltaMs;

      // Section Looping support
      if (this.loopRange && this.currentTimeMs >= this.loopRange.endMs) {
        this.currentTimeMs = this.loopRange.startMs;
        this.lastPlayedNoteIndex = this.findLastNoteIndexBefore(this.currentTimeMs);
      } else if (this.beatmap && this.currentTimeMs >= this.beatmap.duration) {
        this.currentTimeMs = this.beatmap.duration;
        this.pause();
      }

      this.checkHitsounds(prevTime, this.currentTimeMs);
      this.drawCurrentFrame();
      this.notifyState();
    };

    this.lastRafTime = performance.now();
    this.rafId = requestAnimationFrame(loop);
  }

  private drawCurrentFrame(): void {
    if (!this.beatmap || !this.skin) return;
    this.renderer.render(
      this.currentTimeMs,
      this.beatmap,
      this.skin,
      this.activeMods,
      this.options
    );
  }

  public destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.tickCallbacks.clear();
  }
}
