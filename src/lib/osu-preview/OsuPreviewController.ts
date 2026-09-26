import { OsuPreviewRenderer, RenderOptions } from './render';
import { parseBeatmapText, applyBeatmapCalculations } from './beatmap';
import { loadDefaultSkin } from './skin';
import { HitsoundPlayer, MusicPlayer } from './audio';
import { PreviewBeatmap, OsuSkin, OsuMod } from './types';
import { clamp } from './functions';

export type TickCallback = (state: {
  currentTimeMs: number;
  durationMs: number;
  isPlaying: boolean;
  playbackRate: number;
  hasAudioTrack: boolean;
}) => void;

export class OsuPreviewController {
  private renderer: OsuPreviewRenderer;
  private beatmap: PreviewBeatmap | null = null;
  private skin: OsuSkin | null = null;
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicPlayer: MusicPlayer;
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
    this.musicPlayer = new MusicPlayer();
    this.hitsoundPlayer = new HitsoundPlayer();
  }

  public async init(
    rawBeatmapText: string,
    initialTimeMs: number = 0,
    audioSource?: Blob | ArrayBuffer | string
  ): Promise<void> {
    // 1. Initialize Unified Audio Engine
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.connect(this.audioCtx.destination);

    this.musicPlayer.init(this.audioCtx, this.masterGain);
    this.hitsoundPlayer.init(this.audioCtx, this.masterGain);

    // 2. Load Beatmap & Skin
    this.skin = await loadDefaultSkin('/skin/default');
    this.beatmap = parseBeatmapText(rawBeatmapText, this.activeMods);

    // 3. Load Song Audio
    const fallbackSec = (this.beatmap.duration + 1000) / 1000;
    await this.musicPlayer.loadAudio(audioSource, fallbackSec);

    // 4. Set Initial Position
    this.currentTimeMs = clamp(0, initialTimeMs, this.beatmap.duration);
    this.musicPlayer.seek(this.currentTimeMs);
    this.lastPlayedNoteIndex = this.findLastNoteIndexBefore(this.currentTimeMs);

    this.renderer.resize();
    this.startLoop();
    this.drawCurrentFrame();
    this.notifyState();
  }

  public async loadAudioTrack(audioSource: Blob | ArrayBuffer | string): Promise<boolean> {
    const fallbackSec = this.beatmap ? (this.beatmap.duration + 1000) / 1000 : 120;
    const ok = await this.musicPlayer.loadAudio(audioSource, fallbackSec);
    this.musicPlayer.seek(this.currentTimeMs);
    if (this.isPlaying) {
      this.musicPlayer.play(this.currentTimeMs);
    }
    this.notifyState();
    return ok;
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
        hasAudioTrack: this.musicPlayer.hasRealAudio,
      });
    }
  }

  public play(): void {
    if (this.isPlaying) return;
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    if (this.beatmap && this.currentTimeMs >= this.beatmap.duration) {
      this.currentTimeMs = 0;
      this.musicPlayer.seek(0);
      this.lastPlayedNoteIndex = -1;
    }

    this.isPlaying = true;
    this.musicPlayer.play(this.currentTimeMs);
    this.lastRafTime = performance.now();
    this.notifyState();
  }

  public pause(): void {
    this.isPlaying = false;
    this.musicPlayer.pause();
    this.notifyState();
  }

  public togglePlay(): void {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  public seek(timeMs: number): void {
    if (!this.beatmap) return;
    this.currentTimeMs = clamp(0, timeMs, this.beatmap.duration);
    this.musicPlayer.seek(this.currentTimeMs);
    this.lastPlayedNoteIndex = this.findLastNoteIndexBefore(this.currentTimeMs);
    this.drawCurrentFrame();
    this.notifyState();
  }

  public setSpeed(rate: number): void {
    this.playbackRate = clamp(0.25, rate, 3.0);
    this.musicPlayer.setSpeed(this.playbackRate);
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
    this.musicPlayer.setVolume(vol);
    this.hitsoundPlayer.setVolume(vol);
  }

  public setMuted(muted: boolean): void {
    this.musicPlayer.setMuted(muted);
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

      const prevTime = this.currentTimeMs;

      // Primary clock: hardware AudioContext currentTime for 100% sample-accurate sync
      if (this.musicPlayer.hasRealAudio) {
        this.currentTimeMs = this.musicPlayer.currentTimeMs;
      } else {
        // High-precision delta fallback
        const deltaMs = (now - this.lastRafTime) * this.playbackRate;
        this.currentTimeMs += deltaMs;
      }
      this.lastRafTime = now;

      // Section Looping support
      if (this.loopRange && this.currentTimeMs >= this.loopRange.endMs) {
        this.currentTimeMs = this.loopRange.startMs;
        this.musicPlayer.seek(this.currentTimeMs);
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
    this.musicPlayer.destroy();
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
    this.tickCallbacks.clear();
  }
}
