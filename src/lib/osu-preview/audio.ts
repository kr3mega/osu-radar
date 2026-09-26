import { clamp } from './functions';

export class HitsoundPlayer {
  private ctx: AudioContext | null = null;
  private soundBuffers: Map<string, AudioBuffer> = new Map();
  private effectsGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.8;
  private isMuted: boolean = false;

  constructor() {}

  public init(audioCtx?: AudioContext) {
    if (this.ctx) return;
    this.ctx = audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.effectsGain = this.ctx.createGain();

    this.effectsGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    this.setVolume(this.volume);

    this.loadSoundBuffers();
  }

  private async loadSoundBuffers() {
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

  public setVolume(vol: number) {
    this.volume = clamp(0, vol, 1);
    if (this.effectsGain) {
      this.effectsGain.gain.value = this.isMuted ? 0 : this.volume;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.setVolume(this.volume);
  }

  public playHit(hitSounds: number = 0, sampleSet: number = 2) {
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

    if (buffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.effectsGain!);
      src.start();
    } else {
      // Synthesize clean satisfying osu! hit click
      this.synthesizeHitClick();
    }
  }

  public playSliderTick() {
    if (!this.ctx || this.isMuted || this.volume <= 0) return;
    const buffer = this.soundBuffers.get('soft-slidertick');
    if (buffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.effectsGain!);
      src.start();
    } else {
      this.synthesizeTick();
    }
  }

  private synthesizeHitClick() {
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

  private synthesizeTick() {
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

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }
}
