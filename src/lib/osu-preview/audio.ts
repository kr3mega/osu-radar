import { clamp } from './functions';

export class MusicPlayer {
  private ctx: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private _isPlaying: boolean = false;
  private _playbackRate: number = 1.0;
  private _volume: number = 0.8;
  private _isMuted: boolean = false;
  private _duration: number = 0;
  private _hasRealAudio: boolean = false;

  constructor() {}

  public init(audioCtx: AudioContext, destinationNode: AudioNode): void {
    this.ctx = audioCtx;
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(destinationNode);
    this.updateGain();
  }

  public async loadAudio(
    source?: Blob | ArrayBuffer | string,
    fallbackDurationSec: number = 120
  ): Promise<boolean> {
    if (!this.ctx) return false;
    this.stopSource();
    this._hasRealAudio = false;

    if (source) {
      try {
        let arrayBuf: ArrayBuffer;
        if (typeof source === 'string') {
          const res = await fetch(source, { mode: 'cors' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          arrayBuf = await res.arrayBuffer();
        } else if (source instanceof Blob) {
          arrayBuf = await source.arrayBuffer();
        } else {
          arrayBuf = source;
        }

        this.buffer = await this.ctx.decodeAudioData(arrayBuf);
        this._duration = this.buffer.duration;
        this._hasRealAudio = true;
        return true;
      } catch (err) {
        console.warn('OsuPreview: Could not decode audio from source, using fallback buffer:', err);
      }
    }

    // Fallback: create silent audio buffer with fallback duration
    const freq = 44100;
    const duration = Math.max(1, fallbackDurationSec);
    this.buffer = this.ctx.createBuffer(1, Math.floor(duration * freq), freq);
    this._duration = duration;
    return false;
  }

  public play(fromMs?: number): void {
    if (!this.ctx || !this.buffer) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (fromMs !== undefined) {
      this.pauseTime = clamp(0, fromMs / 1000, this._duration);
    }

    this.startSource(this.pauseTime);
    this._isPlaying = true;
  }

  public pause(): void {
    this.pauseTime = this.currentTimeSec;
    this.stopSource();
    this._isPlaying = false;
  }

  public seek(timeMs: number): void {
    const targetSec = clamp(0, timeMs / 1000, this._duration);
    this.pauseTime = targetSec;
    if (this._isPlaying) {
      this.startSource(targetSec);
    }
  }

  public setSpeed(rate: number): void {
    const curSec = this.currentTimeSec;
    this._playbackRate = clamp(0.25, rate, 3.0);
    if (this._isPlaying) {
      this.pauseTime = curSec;
      this.startTime = this.ctx?.currentTime || 0;
      if (this.source) {
        this.source.playbackRate.value = this._playbackRate;
      }
    }
  }

  public setVolume(vol: number): void {
    this._volume = clamp(0, vol, 1);
    this.updateGain();
  }

  public setMuted(muted: boolean): void {
    this._isMuted = muted;
    this.updateGain();
  }

  private updateGain(): void {
    if (this.musicGain) {
      this.musicGain.gain.value = this._isMuted ? 0 : this._volume;
    }
  }

  public get currentTimeMs(): number {
    return this.currentTimeSec * 1000;
  }

  public get currentTimeSec(): number {
    if (!this._isPlaying || !this.ctx) {
      return this.pauseTime;
    }
    const elapsed = (this.ctx.currentTime - this.startTime) * this._playbackRate + this.pauseTime;
    return Math.min(elapsed, this._duration);
  }

  public get durationMs(): number {
    return this._duration * 1000;
  }

  public get isPlaying(): boolean {
    return this._isPlaying;
  }

  public get hasRealAudio(): boolean {
    return this._hasRealAudio;
  }

  private startSource(offsetSec: number): void {
    this.stopSource();
    if (!this.ctx || !this.buffer || !this.musicGain) return;

    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.playbackRate.value = this._playbackRate;
    this.source.connect(this.musicGain);

    this.startTime = this.ctx.currentTime;
    this.pauseTime = clamp(0, offsetSec, this._duration);

    this.source.onended = () => {
      if (this._isPlaying && this.currentTimeSec >= this._duration) {
        this.pause();
        this.pauseTime = this._duration;
      }
    };

    this.source.start(0, this.pauseTime);
  }

  private stopSource(): void {
    if (this.source) {
      try {
        this.source.onended = null;
        this.source.stop(0);
        this.source.disconnect();
      } catch {}
      this.source = null;
    }
  }

  public destroy(): void {
    this.stopSource();
    this.buffer = null;
  }
}

export class HitsoundPlayer {
  private ctx: AudioContext | null = null;
  private soundBuffers: Map<string, AudioBuffer> = new Map();
  private effectsGain: GainNode | null = null;
  private volume: number = 0.8;
  private isMuted: boolean = false;

  constructor() {}

  public init(audioCtx: AudioContext, destinationNode: AudioNode): void {
    this.ctx = audioCtx;
    this.effectsGain = this.ctx.createGain();
    this.effectsGain.connect(destinationNode);
    this.setVolume(this.volume);
    this.loadSoundBuffers();
  }

  private async loadSoundBuffers(): Promise<void> {
    if (!this.ctx) return;
    const sounds = [
      'soft-hitnormal',
      'soft-hitclap',
      'soft-hitfinish',
      'soft-hitwhistle',
      'soft-slidertick',
      'normal-hitnormal',
      'normal-hitclap',
    ];

    for (const name of sounds) {
      try {
        const res = await fetch(`/skin/default/${name}.wav`);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
          this.soundBuffers.set(name, audioBuffer);
        }
      } catch {
        // Fallback to synthesizer
      }
    }
  }

  public setVolume(vol: number): void {
    this.volume = clamp(0, vol, 1);
    if (this.effectsGain) {
      this.effectsGain.gain.value = this.isMuted ? 0 : this.volume;
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.setVolume(this.volume);
  }

  public playHit(hitSounds: number = 0, sampleSet: number = 2): void {
    if (!this.ctx || this.isMuted || this.volume <= 0) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const setPrefix = sampleSet === 1 ? 'normal' : 'soft';
    const normalSound = `${setPrefix}-hitnormal`;
    const clapSound = `${setPrefix}-hitclap`;

    let buffer = this.soundBuffers.get(normalSound);
    if ((hitSounds & 8) !== 0 && this.soundBuffers.has(clapSound)) {
      buffer = this.soundBuffers.get(clapSound);
    }

    if (buffer && this.effectsGain) {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.effectsGain);
      src.start();
    } else {
      this.synthesizeHitClick();
    }
  }

  public playSliderTick(): void {
    if (!this.ctx || this.isMuted || this.volume <= 0) return;
    const buffer = this.soundBuffers.get('soft-slidertick');
    if (buffer && this.effectsGain) {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.effectsGain);
      src.start();
    } else {
      this.synthesizeTick();
    }
  }

  private synthesizeHitClick(): void {
    if (!this.ctx || !this.effectsGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.04);

    gain.gain.setValueAtTime(0.3 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.effectsGain);

    osc.start(now);
    osc.stop(now + 0.045);
  }

  private synthesizeTick(): void {
    if (!this.ctx || !this.effectsGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, now);

    gain.gain.setValueAtTime(0.15 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    osc.connect(gain);
    gain.connect(this.effectsGain);

    osc.start(now);
    osc.stop(now + 0.02);
  }
}
