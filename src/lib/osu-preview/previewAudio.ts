import { BeatmapAnalysisResult } from '../../engine/types';
import { resolveBeatmapSetId } from './audioResolver';

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
  private listeners: Set<Listener> = new Set();
  private requestToken: number = 0;

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
    const currentToken = ++this.requestToken;
    this.activeMapId = map.id;
    this.state = 'loading';
    this.progress = 0;
    this.notify();

    const candidateUrls: string[] = [];

    // 1. Official osu! b.ppy.sh 10-second preview stream
    let setId = map.metadata.beatmapSetId;
    if (!setId || setId <= 0) {
      try {
        setId = await resolveBeatmapSetId(map);
      } catch {}
    }

    if (currentToken !== this.requestToken) return;

    if (setId && setId > 0) {
      candidateUrls.push(`https://b.ppy.sh/preview/${setId}.mp3`);
    }

    // 2. Local cached audio fallback
    if (map.audioUrl) {
      candidateUrls.push(map.audioUrl);
    } else if (map.audioBlob instanceof Blob) {
      try {
        map.audioUrl = URL.createObjectURL(map.audioBlob);
        candidateUrls.push(map.audioUrl);
      } catch {}
    }

    for (const url of candidateUrls) {
      if (currentToken !== this.requestToken) return;
      const started = await this.tryPlayUrl(url, currentToken);
      if (started) return;
    }

    if (currentToken === this.requestToken) {
      this.stop();
    }
  }

  private tryPlayUrl(url: string, token: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (typeof Audio === 'undefined') {
        resolve(false);
        return;
      }

      const audio = new Audio();
      audio.volume = 0.7;
      audio.preload = 'auto';

      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };

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
