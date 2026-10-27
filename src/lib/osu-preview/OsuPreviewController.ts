import { OsuPreviewRenderer, RenderOptions } from './render';
import { parseBeatmapText } from './beatmap';
import { loadDefaultSkin } from './skin';
import { HitsoundPlayer, MusicPlayer } from './audio';
import { PreviewBeatmap, PreviewHitObject, OsuSkin, OsuMod } from './types';
import { clamp } from './functions';
import {
  toggleMod as toggleModHelper,
  setMod as setModHelper,
  getEffectivePlaybackRate,
  computeMapProperties,
} from './mods';
import { previewAudioManager } from './previewAudio';

export type TickCallback = (state: {
  currentTimeMs: number;
  durationMs: number;
  isPlaying: boolean;
  playbackRate: number;
  effectivePlaybackRate: number;
  hasAudioTrack: boolean;
}) => void;

export interface HitsoundTickInput {
  hitObjects: PreviewHitObject[];
  lastPlayedNoteIndex: number;
  prevTimeMs: number;
  curTimeMs: number;
  effectivePlaybackRate: number;
  isBackgroundTab?: boolean;
  onPlayHit: (obj: PreviewHitObject, delaySec: number) => void;
}

/**
 * Processes hitsounds for the current tick while:
 * 1. Scheduling upcoming notes via Web Audio lookahead when in a background tab so notes keep playing in rhythm.
 * 2. Preventing accumulated notes from bursting all at once when returning from a background tab or after a frame lag spike.
 */
export function processHitsoundTick({
  hitObjects,
  lastPlayedNoteIndex,
  prevTimeMs,
  curTimeMs,
  effectivePlaybackRate,
  isBackgroundTab = false,
  onPlayHit,
}: HitsoundTickInput): number {
  const rate = Math.max(0.25, effectivePlaybackRate);
  const maxCatchupWindowMs = 90 * rate;

  // 1. Anti-burst guard: if a large time jump occurred (e.g. returning from background tab where RAF was paused),
  // silently advance lastPlayedNoteIndex past all stale notes older than (curTimeMs - maxCatchupWindowMs).
  const safeMinTimeMs = Math.max(prevTimeMs, curTimeMs - maxCatchupWindowMs);
  let nextLastIndex = lastPlayedNoteIndex;

  for (let i = nextLastIndex + 1; i < hitObjects.length; i++) {
    const obj = hitObjects[i];
    if (obj.time < safeMinTimeMs) {
      nextLastIndex = i;
    } else {
      break;
    }
  }

  // 2. Foreground immediate window [safeMinTimeMs, curTimeMs]:
  // Collect notes arriving in this tick. Stream notes and chords are all preserved up to a safe batch cap (8),
  // preventing dropped notes in fast 1/4 streams while protecting against headphone bursts on large lag spikes.
  const immediateNotes: PreviewHitObject[] = [];
  for (let i = nextLastIndex + 1; i < hitObjects.length; i++) {
    const obj = hitObjects[i];
    if (obj.time > curTimeMs) break;
    if (obj.time >= safeMinTimeMs) {
      immediateNotes.push(obj);
      nextLastIndex = i;
    }
  }

  const maxImmediateBatch = 8;
  const notesToPlay =
    immediateNotes.length > maxImmediateBatch
      ? immediateNotes.slice(-maxImmediateBatch)
      : immediateNotes;

  for (const obj of notesToPlay) {
    onPlayHit(obj, 0);
  }

  // 3. Web Audio lookahead scheduling:
  // - In foreground: schedule upcoming notes within a 45ms window onto the Web Audio hardware clock
  //   for sample-accurate timing and zero DAC buffer latency.
  // - In background tab: timer is throttled (~1000ms), so schedule upcoming notes within 1150ms horizon.
  const lookaheadMs = isBackgroundTab ? 1150 * rate : 45 * rate;
  const lookaheadHorizonMs = curTimeMs + lookaheadMs;

  for (let i = nextLastIndex + 1; i < hitObjects.length; i++) {
    const obj = hitObjects[i];
    if (obj.time > lookaheadHorizonMs) break;
    if (obj.time > curTimeMs) {
      const delaySec = (obj.time - curTimeMs) / (1000 * rate);
      onPlayHit(obj, delaySec);
      nextLastIndex = i;
    }
  }

  return nextLastIndex;
}

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
  // Effective backend speed (basePlaybackRate * modSpeed)
  private playbackRate: number = 1.0;
  // User UI speed selector (0.5x, 0.75x, 1.0x, 1.5x) - defaults to 1.0x even when DT is active
  private basePlaybackRate: number = 1.0;
  private lastRafTime: number = 0;
  private rafId: number | null = null;
  private bgTimerId: ReturnType<typeof setInterval> | null = null;
  private visibilityListener: (() => void) | null = null;

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
    audioSource?: Blob | ArrayBuffer | string,
    initialMods?: Set<OsuMod>,
    initialSkin?: OsuSkin
  ): Promise<void> {
    if (initialMods) {
      this.activeMods = new Set(initialMods);
    }
    this.playbackRate = getEffectivePlaybackRate(this.basePlaybackRate, this.activeMods);

    // 1. Initialize Unified Audio Engine
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.connect(this.audioCtx.destination);

    this.musicPlayer.init(this.audioCtx, this.masterGain);
    this.musicPlayer.setSpeed(this.playbackRate);
    this.hitsoundPlayer.init(this.audioCtx, this.masterGain);

    // 2. Load Beatmap & Skin
    this.skin = initialSkin || (await loadDefaultSkin('/skin/default'));
    if (this.skin.hitsoundUrls) {
      this.hitsoundPlayer
        .setSkinSounds(this.skin.hitsoundUrls, this.skin.LayeredHitSounds)
        .catch(() => {});
    }
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

  public async setSkin(skin: OsuSkin): Promise<void> {
    this.skin = skin;
    this.drawCurrentFrame();
    await this.hitsoundPlayer.setSkinSounds(skin.hitsoundUrls, skin.LayeredHitSounds);
    this.drawCurrentFrame();
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
        playbackRate: this.basePlaybackRate,
        effectivePlaybackRate: this.playbackRate,
        hasAudioTrack: this.musicPlayer.hasRealAudio,
      });
    }
  }

  public play(): void {
    if (this.isPlaying) return;
    previewAudioManager.stop();
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
    this.hitsoundPlayer.cancelScheduled();
    this.musicPlayer.pause();
    this.lastPlayedNoteIndex = this.findLastNoteIndexBefore(this.currentTimeMs);
    this.notifyState();
  }

  public togglePlay(): void {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  public seek(timeMs: number): void {
    if (!this.beatmap) return;
    this.hitsoundPlayer.cancelScheduled();
    this.currentTimeMs = clamp(0, timeMs, this.beatmap.duration);
    this.musicPlayer.seek(this.currentTimeMs);
    this.lastPlayedNoteIndex = this.findLastNoteIndexBefore(this.currentTimeMs);
    this.drawCurrentFrame();
    this.notifyState();
  }

  /**
   * Returns the user-selected UI speed multiplier (e.g. 0.5, 0.75, 1.0, 1.5).
   * Remains 1.0 by default even when DT is active.
   */
  public getPlaybackRate(): number {
    return this.basePlaybackRate;
  }

  /**
   * Returns the effective backend speed multiplier (user speed * mod speed).
   */
  public getEffectivePlaybackRate(): number {
    return this.playbackRate;
  }

  public getActiveMods(): Set<OsuMod> {
    return new Set(this.activeMods);
  }

  public setSpeed(rate: number): void {
    this.basePlaybackRate = clamp(0.25, rate, 3.0);
    this.hitsoundPlayer.cancelScheduled();
    this.lastPlayedNoteIndex = this.findLastNoteIndexBefore(this.currentTimeMs);
    this.updateEffectiveSpeed();
  }

  private updateEffectiveSpeed(): void {
    this.playbackRate = getEffectivePlaybackRate(this.basePlaybackRate, this.activeMods);
    this.musicPlayer.setSpeed(this.playbackRate);
    this.notifyState();
  }

  public setMod(modName: OsuMod, enabled: boolean): void {
    setModHelper(this.activeMods, modName, enabled);
    this.onModsChanged();
  }

  public toggleMod(modName: OsuMod): boolean {
    const isNowActive = toggleModHelper(this.activeMods, modName);
    this.onModsChanged();
    return isNowActive;
  }

  private onModsChanged(): void {
    this.hitsoundPlayer.cancelScheduled();
    this.lastPlayedNoteIndex = this.findLastNoteIndexBefore(this.currentTimeMs);
    this.updateEffectiveSpeed();
    if (this.beatmap) {
      computeMapProperties(this.beatmap, this.activeMods);
    }
    this.drawCurrentFrame();
    this.notifyState();
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

  private checkHitsounds(prevTime: number, curTime: number, isBackgroundTab: boolean): void {
    if (!this.beatmap) return;
    this.lastPlayedNoteIndex = processHitsoundTick({
      hitObjects: this.beatmap.HitObjects,
      lastPlayedNoteIndex: this.lastPlayedNoteIndex,
      prevTimeMs: prevTime,
      curTimeMs: curTime,
      effectivePlaybackRate: this.playbackRate,
      isBackgroundTab,
      onPlayHit: (obj, delaySec) => {
        this.hitsoundPlayer.playHit(obj.hitSounds, obj.hitSample?.[0] || 2, delaySec);
      },
    });
  }

  private stepSimulation(now: number, isBackgroundTab: boolean): void {
    if (!this.isPlaying) return;

    const prevTime = this.currentTimeMs;

    if (this.musicPlayer.hasRealAudio) {
      this.currentTimeMs = this.musicPlayer.currentTimeMs;
    } else {
      const deltaMs = Math.max(0, now - this.lastRafTime) * this.playbackRate;
      this.currentTimeMs += deltaMs;
    }
    this.lastRafTime = now;

    if (this.loopRange && this.currentTimeMs >= this.loopRange.endMs) {
      this.hitsoundPlayer.cancelScheduled();
      this.currentTimeMs = this.loopRange.startMs;
      this.musicPlayer.seek(this.currentTimeMs);
      this.lastPlayedNoteIndex = this.findLastNoteIndexBefore(this.currentTimeMs);
    } else if (this.beatmap && this.currentTimeMs >= this.beatmap.duration) {
      this.currentTimeMs = this.beatmap.duration;
      this.pause();
    }

    this.checkHitsounds(prevTime, this.currentTimeMs, isBackgroundTab);
  }

  private startLoop(): void {
    if (this.rafId !== null) return;

    const loop = (now: number) => {
      this.rafId = requestAnimationFrame(loop);
      if (!this.isPlaying) return;
      this.stepSimulation(now, false);
      this.drawCurrentFrame();
      this.notifyState();
    };

    this.lastRafTime = performance.now();
    this.rafId = requestAnimationFrame(loop);

    // Background interval so hitsounds continue being scheduled on Web Audio even when tab is hidden
    this.bgTimerId = setInterval(() => {
      if (!this.isPlaying) return;
      const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      if (isHidden) {
        this.stepSimulation(performance.now(), true);
      }
    }, 80);

    if (typeof document !== 'undefined') {
      this.visibilityListener = () => {
        if (!this.isPlaying) return;
        const isHidden = document.visibilityState === 'hidden';
        if (isHidden) {
          // Immediately schedule lookahead hitsounds when user switches away from the tab
          this.stepSimulation(performance.now(), true);
        } else {
          // Returning to foreground: sync lastRafTime and draw frame without bursting old notes
          this.lastRafTime = performance.now();
          this.stepSimulation(this.lastRafTime, false);
          this.drawCurrentFrame();
          this.notifyState();
        }
      };
      document.addEventListener('visibilitychange', this.visibilityListener);
    }
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
    if (this.bgTimerId !== null) {
      clearInterval(this.bgTimerId);
      this.bgTimerId = null;
    }
    if (this.visibilityListener && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = null;
    }
    this.hitsoundPlayer.destroy();
    this.musicPlayer.destroy();
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {}
      this.masterGain = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
    this.beatmap = null;
    this.tickCallbacks.clear();
  }
}
