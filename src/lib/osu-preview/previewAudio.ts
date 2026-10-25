import { BeatmapAnalysisResult } from '../../engine/types';
import { resolveBeatmapSetId } from './audioResolver';
import { getLocalSongFileUrl } from './localMedia';

export type PreviewAudioState = 'stopped' | 'loading' | 'playing';

export interface PreviewAudioSnapshot {
  activeMapId: string | null;
  state: PreviewAudioState;
  progress: number; // 0 to 1
}

type Listener = (snapshot: PreviewAudioSnapshot) => void;

class BeatmapPreviewAudioManager {
  private audio: HTMLAudioElement | null = null;
  private activeMapId: string | null = null;
  private state: PreviewAudioState = 'stopped';
  private progress: number = 0;
  private volume: number = 0.8;
  private listeners: Set<Listener> = new Set();
  private requestToken: number = 0;
  private onPlayStart: (() => void) | null = null;

  public setOnPlayStart(callback: (() => void) | null): void {
    this.onPlayStart = callback;
  }

  public setVolume(vol: number): void {
    this.volume = Math.min(1, Math.max(0, vol));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot(): PreviewAudioSnapshot {
    return {
      activeMapId: this.activeMapId,
      state: this.state,
      progress: this.progress,
    };
  }

  private notify(): void {
    const snap = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }

  public stop(): void {
    this.requestToken++;
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.removeAttribute('src');
        this.audio.load();
      } catch {}
      this.audio = null;
    }
    this.activeMapId = null;
    this.state = 'stopped';
    this.progress = 0;
    this.notify();
  }

  public async toggle(map: BeatmapAnalysisResult): Promise<void> {
    if (this.activeMapId === map.id && (this.state === 'playing' || this.state === 'loading')) {
      this.stop();
      return;
    }

    await this.play(map);
  }

  public async play(map: BeatmapAnalysisResult): Promise<void> {
    this.stop();
    if (this.onPlayStart) {
      try {
        this.onPlayStart();
      } catch {}
    }
    const currentToken = ++this.requestToken;
    this.activeMapId = map.id;
    this.state = 'loading';
    this.progress = 0;
    this.notify();

    const candidateUrls: Array<{ url: string; seekPreviewMs?: number }> = [];

    // 0. Direct local Songs/ audio stream (instant, offline-capable, works on unsubmitted/custom maps)
    const localAudioUrl = getLocalSongFileUrl(map.localAudioPath);
    if (localAudioUrl) {
      candidateUrls.push({
        url: localAudioUrl,
        seekPreviewMs: map.metadata.previewTime ?? -1,
      });
    }

    // 1. Official osu! b.ppy.sh 10-second preview stream
    let setId = map.metadata.beatmapSetId;
    if (!setId || setId <= 0) {
      if (!localAudioUrl) {
        try {
          setId = await resolveBeatmapSetId(map);
        } catch {}
      }
    }

    if (currentToken !== this.requestToken) return;

    if (setId && setId > 0) {
      candidateUrls.push({ url: `https://b.ppy.sh/preview/${setId}.mp3` });
    }

    // 2. Local cached audio fallback
    if (map.audioUrl) {
      candidateUrls.push({ url: map.audioUrl });
    } else if (map.audioBlob instanceof Blob) {
      try {
        map.audioUrl = URL.createObjectURL(map.audioBlob);
        candidateUrls.push({ url: map.audioUrl });
      } catch {}
    }

    for (const cand of candidateUrls) {
      if (currentToken !== this.requestToken) return;
      const started = await this.tryPlayUrl(cand.url, currentToken, cand.seekPreviewMs);
      if (started) return;
    }

    if (currentToken === this.requestToken) {
      this.stop();
    }
  }

  private tryPlayUrl(url: string, token: number, seekPreviewMs?: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (typeof Audio === 'undefined') {
        resolve(false);
        return;
      }

      const audio = new Audio();
      audio.volume = this.volume;
      audio.preload = 'auto';

      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };

      if (seekPreviewMs !== undefined) {
        audio.addEventListener(
          'loadedmetadata',
          () => {
            if (token !== this.requestToken) return;
            const dur = audio.duration;
            if (dur && isFinite(dur) && dur > 5) {
              if (seekPreviewMs > 0 && seekPreviewMs / 1000 < dur - 2) {
                audio.currentTime = seekPreviewMs / 1000;
              } else if (dur > 25) {
                audio.currentTime = dur * 0.35;
              }
            }
          },
          { once: true }
        );
      }

      audio.addEventListener('playing', () => {
        if (token !== this.requestToken) {
          audio.pause();
          finish(false);
          return;
        }
        this.audio = audio;
        this.state = 'playing';
        this.notify();
        finish(true);
      });

      audio.addEventListener('timeupdate', () => {
        if (token !== this.requestToken || this.audio !== audio) return;
        const dur = audio.duration;
        if (dur && isFinite(dur) && dur > 0) {
          this.progress = Math.min(1, Math.max(0, audio.currentTime / dur));
          this.notify();
        }
      });

      audio.addEventListener('ended', () => {
        if (token === this.requestToken && this.audio === audio) {
          this.stop();
        }
      });

      audio.addEventListener('error', () => {
        finish(false);
      });

      audio.src = url;
      audio.play().catch(() => {
        finish(false);
      });
    });
  }
}

export const previewAudioManager = new BeatmapPreviewAudioManager();
export { BeatmapPreviewAudioManager };
