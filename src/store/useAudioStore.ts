import { create } from 'zustand';
import { previewAudioManager } from '../lib/osu-preview/previewAudio';

const STORAGE_KEY = 'osu_skills_global_volume';
const MUTE_KEY = 'osu_skills_global_muted';
const LEGACY_STORAGE_KEY = 'osu_radar_global_volume';
const LEGACY_MUTE_KEY = 'osu_radar_global_muted';

function getInitialVolume(): number {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          return parsed;
        }
      }
    } catch {}
  }
  return 0.8;
}

function getInitialMuted(): boolean {
  if (typeof localStorage !== 'undefined') {
    try {
      const val = localStorage.getItem(MUTE_KEY) ?? localStorage.getItem(LEGACY_MUTE_KEY);
      return val === 'true';
    } catch {}
  }
  return false;
}

interface AudioStoreState {
  volume: number; // 0 to 1
  isMuted: boolean;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  getEffectiveVolume: () => number;
}

let activeVisualizerPauseCallback: (() => void) | null = null;

export function registerVisualizerPauseCallback(cb: (() => void) | null): void {
  activeVisualizerPauseCallback = cb;
}

export function pauseVisualizerPlayback(): void {
  if (activeVisualizerPauseCallback) {
    try {
      activeVisualizerPauseCallback();
    } catch {}
  }
}

// Ensure visualizer pauses whenever a song preview starts playing
previewAudioManager.setOnPlayStart(() => {
  pauseVisualizerPlayback();
});

export const useAudioStore = create<AudioStoreState>((set, get) => {
  const initialVol = getInitialVolume();
  const initialMuted = getInitialMuted();

  // Sync initial volume with the preview audio manager
  if (typeof window !== 'undefined') {
    previewAudioManager.setVolume(initialMuted ? 0 : initialVol);
  }

  return {
    volume: initialVol,
    isMuted: initialMuted,

    setVolume: (v: number) => {
      const clamped = Math.min(1, Math.max(0, v));
      const nextMuted = clamped === 0;
      console.log('[AudioStore] Volume alterado para:', Math.round(clamped * 100) + '%', nextMuted ? '(Mudo)' : '');
      set({ volume: clamped, isMuted: nextMuted });
      try {
        localStorage.setItem(STORAGE_KEY, clamped.toString());
        localStorage.setItem(MUTE_KEY, nextMuted.toString());
      } catch {}
      previewAudioManager.setVolume(nextMuted ? 0 : clamped);
    },

    toggleMute: () => {
      const nextMuted = !get().isMuted;
      console.log('[AudioStore] Mudo alternado para:', nextMuted);
      set({ isMuted: nextMuted });
      try {
        localStorage.setItem(MUTE_KEY, nextMuted.toString());
      } catch {}
      previewAudioManager.setVolume(nextMuted ? 0 : get().volume);
    },

    getEffectiveVolume: () => {
      const state = get();
      return state.isMuted ? 0 : state.volume;
    },
  };
});
