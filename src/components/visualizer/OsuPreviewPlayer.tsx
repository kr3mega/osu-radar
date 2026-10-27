import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  OsuPreviewController,
  getOrReconstructBeatmapText,
  hydrateBeatmapRawText,
  OsuMod,
  clamp,
  resolveBeatmapAudio,
  AudioResolveStatus,
  getModFromSlot,
  previewAudioManager,
  getLocalSongFileUrl,
} from '../../lib/osu-preview';
import {
  DetectedPattern,
  PatternType,
  PatternSeverity,
  detectBeatmapPatterns,
  formatOsuEditorTimestamp,
} from '../../engine/patterns';
import { parseOsuBeatmap } from '../../engine/parser';
import { BeatmapAnalysisResult } from '../../engine/types';
import { db } from '../../db';
import { useAudioStore, registerVisualizerPauseCallback } from '../../store/useAudioStore';
import { useSkinStore } from '../../store/useSkinStore';
import { StatHexagon } from '../charts/StatHexagon';

const SEVERITY_BADGES: Record<
  PatternSeverity,
  { bg: string; color: string; label: string }
> = {
  extreme: {
    bg: 'hsl(var(--hsl-red-3))',
    color: '#ffffff',
    label: 'Extrema',
  },
  high: {
    bg: 'hsl(var(--hsl-orange-3))',
    color: '#ffffff',
    label: 'Alta',
  },
  medium: {
    bg: 'hsl(var(--hsl-blue-3))',
    color: '#ffffff',
    label: 'Média',
  },
  low: {
    bg: 'hsl(var(--hsl-b2))',
    color: 'hsl(var(--hsl-l1))',
    label: 'Baixa',
  },
};

const PATTERN_ICON_CLASS: Record<PatternType, string> = {
  deathstream: 'fas fa-water',
  stream: 'fas fa-stream',
  spaced_stream: 'fas fa-wave-square',
  burst: 'fas fa-bolt',
  snap_jumps: 'fas fa-crosshairs',
  flow_aim: 'fas fa-bezier-curve',
  sv_spike: 'fas fa-tachometer-alt',
  rhythm_switch: 'fas fa-random',
  choke_point: 'fas fa-exclamation-circle',
};

type PatternCategory = 'TODOS' | 'STREAMS' | 'JUMPS' | 'BURSTS' | 'TECH';

interface OsuPreviewPlayerProps {
  map: BeatmapAnalysisResult;
  patterns?: DetectedPattern[];
  initialTimeMs?: number;
  initialPatternId?: string;
  onClose?: () => void;
}

export const OsuPreviewPlayer: React.FC<OsuPreviewPlayerProps> = ({
  map,
  patterns = [],
  initialTimeMs = 0,
  initialPatternId,
  onClose: _onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const patternsListRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<OsuPreviewController | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const skinInputRef = useRef<HTMLInputElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(initialTimeMs);
  const [durationMs, setDurationMs] = useState<number>(map.stats.durationMs || 1000);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const { volume, isMuted, getEffectiveVolume } = useAudioStore();
  const {
    availableSkins,
    selectedSkinId,
    isLoadingSkin,
    initSkins,
    selectSkin,
    resolveSkinById,
    importSkinOskOrZip,
    refreshSkins,
  } = useSkinStore();
  const bgDim = 0.85;
  const [activeMods, setActiveMods] = useState<Set<OsuMod>>(new Set());
  const [copiedTime, setCopiedTime] = useState<boolean>(false);
  const [copiedPatternId, setCopiedPatternId] = useState<string | null>(null);
  const [selectedPatternId, setSelectedPatternId] = useState<string | undefined>(initialPatternId);
  const [_hasAudioTrack, setHasAudioTrack] = useState<boolean>(false);
  const [patternCategory, setPatternCategory] = useState<PatternCategory>('TODOS');
  const [activeBottomTab, setActiveBottomTab] = useState<'patterns' | 'skills'>('patterns');
  const [audioStatus, setAudioStatus] = useState<AudioResolveStatus>({
    state: 'idle',
    message: '',
  });
  const [hydratedRawText, setHydratedRawText] = useState<string | null>(
    map.rawText && map.rawText.length > 50 ? map.rawText : null
  );

  const [isSkinDropdownOpen, setIsSkinDropdownOpen] = useState<boolean>(false);
  const skinDropdownRef = useRef<HTMLDivElement | null>(null);

  const [isSpeedOpen, setIsSpeedOpen] = useState<boolean>(false);
  const speedDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isSkinDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (skinDropdownRef.current && !skinDropdownRef.current.contains(e.target as Node)) {
        setIsSkinDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSkinDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSkinDropdownOpen]);

  useEffect(() => {
    if (!isSpeedOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (speedDropdownRef.current && !speedDropdownRef.current.contains(e.target as Node)) {
        setIsSpeedOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSpeedOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSpeedOpen]);

  const currentSkin = useMemo(() => {
    return availableSkins.find((s) => s.id === selectedSkinId) || availableSkins[0];
  }, [availableSkins, selectedSkinId]);

  // 1. Derive mod from beatmap slot (HD, HR, DT, EZ, or none)
  const slotMod = useMemo(() => getModFromSlot(map.modSlot), [map.modSlot]);

  // When map changes, auto-select its corresponding mod immediately and clear all others
  useEffect(() => {
    const nextMods = new Set<OsuMod>();
    if (slotMod) {
      nextMods.add(slotMod);
    }
    setActiveMods(nextMods);
    if (controllerRef.current) {
      (['ez', 'hr', 'dt', 'hd', 'ht', 'fl'] as OsuMod[]).forEach((m) => {
        controllerRef.current?.setMod(m, nextMods.has(m));
      });
      setPlaybackRate(controllerRef.current.getPlaybackRate());
    } else {
      setPlaybackRate(1.0);
    }
  }, [map.id, map.modSlot, slotMod]);

  // Authentic algorithm-detected patterns (always evaluated with rhythm-relative detector so cached maps also update)
  const detectedPatterns = useMemo<DetectedPattern[]>(() => {
    const rateMultiplier = activeMods.has('dt') ? 1.5 : activeMods.has('ht') ? 0.75 : 1.0;
    try {
      const rawText = hydratedRawText || getOrReconstructBeatmapText(map);
      const parsed = parseOsuBeatmap(rawText);
      const computed = detectBeatmapPatterns(parsed.hitObjects, parsed.timingPoints, rateMultiplier);
      if (computed.length > 0) {
        return computed.sort((a, b) => a.startTimeMs - b.startTimeMs);
      }
    } catch (err) {
      console.warn('Failed to detect patterns on the fly:', err);
    }
    if (patterns && patterns.length > 0) {
      return [...patterns].sort((a, b) => a.startTimeMs - b.startTimeMs);
    }
    if (map.patterns && map.patterns.length > 0) {
      return [...map.patterns].sort((a, b) => a.startTimeMs - b.startTimeMs);
    }
    return [];
  }, [patterns, map.id, map.rawText, hydratedRawText, activeMods]);

  const filteredPatterns = useMemo(() => {
    return detectedPatterns.filter((p) => {
      if (patternCategory === 'TODOS') return true;
      if (patternCategory === 'STREAMS') {
        return p.type === 'stream' || p.type === 'deathstream' || p.type === 'spaced_stream';
      }
      if (patternCategory === 'JUMPS') {
        return p.type === 'snap_jumps' || p.type === 'flow_aim';
      }
      if (patternCategory === 'BURSTS') {
        return p.type === 'burst';
      }
      if (patternCategory === 'TECH') {
        return p.type === 'sv_spike' || p.type === 'rhythm_switch' || p.type === 'choke_point';
      }
      return true;
    });
  }, [detectedPatterns, patternCategory]);

  // All patterns that are currently playing
  const livePatterns = useMemo(() => {
    return filteredPatterns.filter(
      (p) => currentTimeMs >= p.startTimeMs && currentTimeMs <= p.endTimeMs
    );
  }, [filteredPatterns, currentTimeMs]);

  // Primary live pattern holding 1st place (top position in view).
  // When multiple patterns are active simultaneously, the first one keeps 1st place;
  // subsequent patterns stay in 2nd place until the 1st exits scene.
  const activeTopLivePattern = useMemo(() => {
    if (livePatterns.length === 0) return null;
    return livePatterns[0];
  }, [livePatterns]);

  const livePattern = activeTopLivePattern;

  const currentOrRecentPattern = useMemo(() => {
    if (activeTopLivePattern) return activeTopLivePattern;
    const pastPatterns = filteredPatterns.filter((p) => currentTimeMs >= p.startTimeMs);
    if (pastPatterns.length > 0) {
      return pastPatterns[pastPatterns.length - 1];
    }
    return filteredPatterns.find((p) => p.id === selectedPatternId) || null;
  }, [filteredPatterns, currentTimeMs, activeTopLivePattern, selectedPatternId]);

  // Initialize OsuPreviewController (with on-demand .osu text hydration for local Songs library)
  useEffect(() => {
    if (!canvasRef.current) return;

    const controller = new OsuPreviewController(canvasRef.current);
    controllerRef.current = controller;
    registerVisualizerPauseCallback(() => {
      controller.pause();
    });

    const initialMods = new Set<OsuMod>();
    if (slotMod) {
      initialMods.add(slotMod);
    }

    const unsubscribe = controller.subscribe((state) => {
      setCurrentTimeMs(state.currentTimeMs);
      setDurationMs(state.durationMs);
      setIsPlaying(state.isPlaying);
      setPlaybackRate(state.playbackRate);
      setHasAudioTrack(state.hasAudioTrack);
    });

    let isCancelled = false;
    setHydratedRawText(map.rawText && map.rawText.length > 50 ? map.rawText : null);

    (async () => {
      const [resolvedRawText, activeSkin] = await Promise.all([
        hydrateBeatmapRawText(map),
        resolveSkinById(useSkinStore.getState().selectedSkinId),
      ]);
      if (isCancelled) return;
      setHydratedRawText(resolvedRawText);

      await controller.init(
        resolvedRawText,
        initialTimeMs,
        map.audioBlob || map.audioUrl,
        initialMods,
        activeSkin
      );
      if (isCancelled) return;

      controller.setVolume(getEffectiveVolume());
      controller.setMuted(isMuted);
      controller.setBackgroundDim(bgDim);

      // Fast path: if localAudioPath exists, stream directly via disk bridge HTTP 206 without waiting for full blob fetch
      if (map.localAudioPath) {
        const localUrl = getLocalSongFileUrl(map.localAudioPath);
        if (localUrl) {
          setAudioStatus({ state: 'loading', message: 'Transmitindo áudio local...' });
          const loaded = await controller.loadAudioTrack(localUrl);
          if (loaded && !isCancelled && controllerRef.current === controller) {
            setAudioStatus({ state: 'ready', message: 'Música pronta (local)' });
            return;
          }
        }
      }

      const blob = await resolveBeatmapAudio(map, (status) => {
        if (!isCancelled) setAudioStatus(status);
      });
      if (blob && !isCancelled && controllerRef.current === controller) {
        controller.loadAudioTrack(blob);
      }
    })();

    const handleResize = () => {
      controller.resize();
    };
    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && canvasRef.current) {
      resizeObserver = new ResizeObserver(() => {
        controller.resize();
      });
      resizeObserver.observe(canvasRef.current);
    }

    return () => {
      isCancelled = true;
      registerVisualizerPauseCallback(null);
      unsubscribe();
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      controller.destroy();
      controllerRef.current = null;
    };
  }, [map.id]);

  // Discover local & imported skins on mount
  useEffect(() => {
    initSkins();
  }, [initSkins]);

  // Live-swap skin in OsuPreviewController whenever user changes skin selection
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!controllerRef.current) return;
      const loaded = await resolveSkinById(selectedSkinId);
      if (!cancelled && controllerRef.current) {
        await controllerRef.current.setSkin(loaded);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSkinId, resolveSkinById]);

  // Ref tracking which pattern currently holds the top scroll position
  const lastScrolledPatternIdRef = useRef<string | null>(null);

  // Auto-scroll list: Prioritizes keeping the active live pattern pinned at the top (1st place)
  // When multiple patterns are active simultaneously, the first holds 1st place;
  // when it exits, the subsequent active pattern assumes 1st place and scrolls the list up.
  useEffect(() => {
    if (!patternsListRef.current) return;
    const container = patternsListRef.current;

    const target = activeTopLivePattern;
    if (!target) {
      lastScrolledPatternIdRef.current = null;
      return;
    }

    if (lastScrolledPatternIdRef.current === target.id) {
      return;
    }

    const activeEl = document.getElementById(`pattern-row-${target.id}`);
    if (activeEl) {
      lastScrolledPatternIdRef.current = target.id;
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      const relativeTop = activeRect.top - containerRect.top + container.scrollTop;
      const targetTop = Math.max(0, relativeTop - 6);

      if (Math.abs(container.scrollTop - targetTop) > 4) {
        container.scrollTo({
          top: targetTop,
          behavior: 'smooth',
        });
      }
    }
  }, [activeTopLivePattern?.id]);

  const jumpToPattern = useCallback(
    (p: DetectedPattern) => {
      previewAudioManager.stop();
      setSelectedPatternId(p.id);
      lastScrolledPatternIdRef.current = p.id;
      if (patternsListRef.current) {
        const container = patternsListRef.current;
        const activeEl = document.getElementById(`pattern-row-${p.id}`);
        if (activeEl) {
          const containerRect = container.getBoundingClientRect();
          const activeRect = activeEl.getBoundingClientRect();
          const relativeTop = activeRect.top - containerRect.top + container.scrollTop;
          container.scrollTo({
            top: Math.max(0, relativeTop - 6),
            behavior: 'smooth',
          });
        }
      }
      if (controllerRef.current) {
        controllerRef.current.seek(p.startTimeMs);
        controllerRef.current.play();
        controllerRef.current.clearLoopRange();
      }
    },
    []
  );

  const handleTogglePlay = useCallback(() => {
    previewAudioManager.stop();
    if (controllerRef.current) {
      controllerRef.current.togglePlay();
    }
  }, []);

  const handleSeek = (val: number) => {
    if (controllerRef.current) {
      controllerRef.current.seek(val);
    }
    const closest =
      filteredPatterns.find((p) => val >= p.startTimeMs && val <= p.endTimeMs) ||
      filteredPatterns.find((p) => p.startTimeMs >= val) ||
      filteredPatterns[filteredPatterns.length - 1];

    if (closest && patternsListRef.current) {
      const container = patternsListRef.current;
      const el = document.getElementById(`pattern-row-${closest.id}`);
      if (el) {
        lastScrolledPatternIdRef.current = closest.id;
        const containerRect = container.getBoundingClientRect();
        const activeRect = el.getBoundingClientRect();
        const relativeTop = activeRect.top - containerRect.top + container.scrollTop;
        container.scrollTo({
          top: Math.max(0, relativeTop - 6),
          behavior: 'smooth',
        });
      }
    }
  };

  const handleStep = (deltaMs: number) => {
    if (controllerRef.current) {
      controllerRef.current.seek(currentTimeMs + deltaMs);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (controllerRef.current) {
      controllerRef.current.setSpeed(speed);
    }
  };

  const handleToggleMod = (modName: OsuMod) => {
    if (!controllerRef.current) return;
    controllerRef.current.toggleMod(modName);
    const updatedMods = controllerRef.current.getActiveMods();
    setActiveMods(updatedMods);
    setPlaybackRate(controllerRef.current.getPlaybackRate());
  };

  // Synchronize visualizer audio with the page's global volume
  useEffect(() => {
    if (controllerRef.current) {
      const eff = getEffectiveVolume();
      controllerRef.current.setVolume(eff);
      controllerRef.current.setMuted(isMuted);
    }
  }, [volume, isMuted, getEffectiveVolume]);

  const copyEditorTimestamp = () => {
    const text = formatOsuEditorTimestamp(currentTimeMs);
    navigator.clipboard.writeText(text);
    setCopiedTime(true);
    setTimeout(() => setCopiedTime(false), 1500);
  };

  const handleCopyPatternTimestamp = async (p: DetectedPattern, e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(p.osuEditorTimestamp);
    setCopiedPatternId(p.id);
    setTimeout(() => setCopiedPatternId(null), 1500);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleStep(e.shiftKey ? -250 : -1000);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleStep(e.shiftKey ? 250 : 1000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, currentTimeMs]);

  const handleAudioFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    map.audioBlob = file;
    map.audioUrl = URL.createObjectURL(file);
    try {
      await db.beatmaps.update(map.id, { audioBlob: file, audioUrl: map.audioUrl });
    } catch {}
    if (controllerRef.current) {
      await controllerRef.current.loadAudioTrack(file);
    }
    setAudioStatus({ state: 'ready', message: 'Música carregada manualmente' });
  };

  const handleSkinFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importSkinOskOrZip(file);
    } catch (err) {
      console.warn('Falha ao importar skin .osk:', err);
    } finally {
      if (skinInputRef.current) skinInputRef.current.value = '';
    }
  };

  const handleAudioDrop = async (e: React.DragEvent) => {
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const lower = file.name.toLowerCase();

    if (lower.endsWith('.osk')) {
      e.preventDefault();
      e.stopPropagation();
      try {
        await importSkinOskOrZip(file);
      } catch (err) {
        console.warn('Falha ao importar skin .osk via drag-and-drop:', err);
      }
      return;
    }

    if (lower.endsWith('.mp3') || lower.endsWith('.ogg') || lower.endsWith('.wav')) {
      e.preventDefault();
      e.stopPropagation();
      map.audioBlob = file;
      map.audioUrl = URL.createObjectURL(file);
      try {
        await db.beatmaps.update(map.id, { audioBlob: file, audioUrl: map.audioUrl });
      } catch {}
      if (controllerRef.current) {
        await controllerRef.current.loadAudioTrack(file);
      }
      setAudioStatus({ state: 'ready', message: 'Música importada com sucesso' });
    }
  };

  return (
    <div
      ref={containerRef}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleAudioDrop}
      className="osu-skills-player"
    >
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/mp3,audio/ogg,audio/wav,audio/*"
        style={{ display: 'none' }}
        onChange={handleAudioFileSelect}
      />
      <input
        ref={skinInputRef}
        type="file"
        accept=".osk,.zip"
        style={{ display: 'none' }}
        onChange={handleSkinFileSelect}
      />

      {/* Playfield Stage */}
      <div className="osu-skills-player__stage">
        <div className="osu-skills-player__canvas-box" onClick={handleTogglePlay}>
          <canvas ref={canvasRef} />

          {!isPlaying && (
            <div className="osu-skills-player__play-overlay">
              <div className="osu-skills-player__play-circle">
                <i className="fas fa-play" style={{ marginLeft: '2px' }} />
              </div>
              <span
                className="osu-skills-mod-pill"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.75)',
                  color: '#fff',
                  padding: '3px 10px',
                }}
              >
                Clique para Jogar
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Scrubber & Playback Controls */}
      <div className="osu-skills-player__controls">
        <div className="osu-skills-player__scrubber-row">
          <span className="osu-skills-player__time">
            {formatOsuEditorTimestamp(currentTimeMs)}
          </span>

          <input
            type="range"
            min={0}
            max={Math.max(1, durationMs)}
            value={currentTimeMs}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="osu-skills-player__range"
          />

          <span className="osu-skills-player__time osu-skills-player__time--muted">
            {formatOsuEditorTimestamp(durationMs)}
          </span>

          <button
            type="button"
            onClick={copyEditorTimestamp}
            title="Copiar Timestamp para o editor do osu!"
            className="btn-osu-big btn-osu-big--rounded-small"
          >
            <i className={`fas fa-${copiedTime ? 'check' : 'copy'}`} />
          </button>
        </div>

        <div className="osu-skills-player__buttons-row">
          {/* Transport Buttons: [-1s], [Play/Pause], [+1s] */}
          <div className="osu-skills-player__transport-group">
            <button
              type="button"
              onClick={() => handleStep(-1000)}
              title="-1s"
              className="btn-osu-big btn-osu-big--rounded-small osu-skills-player__transport-btn"
            >
              <i className="fas fa-step-backward" />
            </button>

            <button
              type="button"
              onClick={handleTogglePlay}
              title={isPlaying ? 'Pausar' : 'Reproduzir'}
              className="btn-osu-big btn-osu-big--pink btn-osu-big--rounded-small osu-skills-player__play-btn"
            >
              <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`} />
            </button>

            <button
              type="button"
              onClick={() => handleStep(1000)}
              title="+1s"
              className="btn-osu-big btn-osu-big--rounded-small osu-skills-player__transport-btn"
            >
              <i className="fas fa-step-forward" />
            </button>
          </div>

          {/* Skin Selector Dropdown - Flexible horizontal width positioned to the right of playback transport */}
          <div className="osu-skills-skin-switcher osu-skills-skin-switcher--bottom" ref={skinDropdownRef}>
            <button
              type="button"
              className={`osu-skills-skin-trigger ${isSkinDropdownOpen ? 'osu-skills-skin-trigger--open' : ''}`}
              onClick={() => setIsSkinDropdownOpen(!isSkinDropdownOpen)}
              title="Alternar entre a Skin Padrão e suas Skins do osu!"
              aria-expanded={isSkinDropdownOpen}
              aria-haspopup="listbox"
            >
              <i
                className={isLoadingSkin ? 'fas fa-circle-notch fa-spin' : 'fas fa-palette'}
                style={{ color: 'hsl(var(--hsl-h1))', fontSize: '11px', flexShrink: 0 }}
              />
              <span className="osu-skills-skin-trigger__name">
                {currentSkin ? currentSkin.name : 'Selecionar Skin'}
              </span>
              <div className="osu-skills-skin-trigger__meta">
                {currentSkin?.source === 'local_osu' && (
                  <span className="osu-skills-skin-tag osu-skills-skin-tag--osu">osu!</span>
                )}
                {currentSkin?.source === 'imported' && (
                  <span className="osu-skills-skin-tag osu-skills-skin-tag--imported">.osk</span>
                )}
                <i
                  className={`fas fa-chevron-up osu-skills-skin-trigger__chevron ${
                    isSkinDropdownOpen ? 'osu-skills-skin-trigger__chevron--open' : ''
                  }`}
                />
              </div>
            </button>

            {isSkinDropdownOpen && (
              <div className="osu-skills-skin-dropdown osu-skills-skin-dropdown--upward" role="listbox">
                <div className="osu-skills-skin-dropdown__header">
                  <span>Skins Disponíveis ({availableSkins.length})</span>
                  <button
                    type="button"
                    className="osu-skills-skin-dropdown__refresh-btn"
                    onClick={() => refreshSkins()}
                    title="Recarregar skins da pasta do osu!"
                  >
                    <i className="fas fa-sync-alt" />
                  </button>
                </div>

                <div className="osu-skills-skin-dropdown__list">
                  {/* Skin Padrão */}
                  <div className="osu-skills-skin-dropdown__section-title">Padrão</div>
                  {availableSkins
                    .filter((s) => s.source === 'default')
                    .map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        role="option"
                        aria-selected={s.id === selectedSkinId}
                        className={`osu-skills-skin-item ${
                          s.id === selectedSkinId ? 'osu-skills-skin-item--active' : ''
                        }`}
                        onClick={() => {
                          selectSkin(s.id);
                          setIsSkinDropdownOpen(false);
                        }}
                      >
                        <div className="osu-skills-skin-item__info">
                          <i className="fas fa-star osu-skills-skin-item__icon" />
                          <span className="osu-skills-skin-item__name">{s.name}</span>
                        </div>
                        {s.id === selectedSkinId && (
                          <i className="fas fa-check osu-skills-skin-item__check" />
                        )}
                      </button>
                    ))}

                  {/* Skins Locais do osu! */}
                  {availableSkins.filter((s) => s.source === 'local_osu').length > 0 && (
                    <>
                      <div className="osu-skills-skin-dropdown__section-title">
                        Skins do seu osu! ({availableSkins.filter((s) => s.source === 'local_osu').length})
                      </div>
                      {availableSkins
                        .filter((s) => s.source === 'local_osu')
                        .map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            role="option"
                            aria-selected={s.id === selectedSkinId}
                            className={`osu-skills-skin-item ${
                              s.id === selectedSkinId ? 'osu-skills-skin-item--active' : ''
                            }`}
                            onClick={() => {
                              selectSkin(s.id);
                              setIsSkinDropdownOpen(false);
                            }}
                            title={s.name}
                          >
                            <div className="osu-skills-skin-item__info">
                              <span className="osu-skills-skin-tag osu-skills-skin-tag--osu">osu!</span>
                              <span className="osu-skills-skin-item__name">{s.name}</span>
                            </div>
                            {s.id === selectedSkinId && (
                              <i className="fas fa-check osu-skills-skin-item__check" />
                            )}
                          </button>
                        ))}
                    </>
                  )}

                  {/* Skins Importadas */}
                  {availableSkins.filter((s) => s.source === 'imported').length > 0 && (
                    <>
                      <div className="osu-skills-skin-dropdown__section-title">
                        Skins Importadas ({availableSkins.filter((s) => s.source === 'imported').length})
                      </div>
                      {availableSkins
                        .filter((s) => s.source === 'imported')
                        .map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            role="option"
                            aria-selected={s.id === selectedSkinId}
                            className={`osu-skills-skin-item ${
                              s.id === selectedSkinId ? 'osu-skills-skin-item--active' : ''
                            }`}
                            onClick={() => {
                              selectSkin(s.id);
                              setIsSkinDropdownOpen(false);
                            }}
                            title={s.name}
                          >
                            <div className="osu-skills-skin-item__info">
                              <span className="osu-skills-skin-tag osu-skills-skin-tag--imported">.osk</span>
                              <span className="osu-skills-skin-item__name">{s.name}</span>
                            </div>
                            {s.id === selectedSkinId && (
                              <i className="fas fa-check osu-skills-skin-item__check" />
                            )}
                          </button>
                        ))}
                    </>
                  )}
                </div>

                <div className="osu-skills-skin-dropdown__footer">
                  <button
                    type="button"
                    className="osu-skills-skin-dropdown__upload-action"
                    onClick={() => {
                      setIsSkinDropdownOpen(false);
                      skinInputRef.current?.click();
                    }}
                  >
                    <i className="fas fa-file-import" />
                    <span>Importar Skin do Computador (.osk / .zip)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right utility group: audio status, mods, unified speed */}
          <div className="osu-skills-player__utility-group">
            {audioStatus.state === 'loading' && (
              <span
                className="osu-skills-mod-pill"
                style={{
                  backgroundColor: 'hsl(var(--hsl-orange-3))',
                  color: '#fff',
                  fontSize: '9px',
                  gap: '4px',
                  flexShrink: 0,
                }}
              >
                <i className="fas fa-circle-notch fa-spin" />
                <span>{audioStatus.message || 'Baixando áudio...'}</span>
              </span>
            )}

            {/* Mod Buttons (EZ, HR, DT, HD) */}
            <div className="osu-skills-player__mods-group">
              {(['ez', 'hr', 'dt', 'hd'] as OsuMod[]).map((modKey) => {
                const active = activeMods.has(modKey);
                return (
                  <button
                    key={modKey}
                    type="button"
                    onClick={() => handleToggleMod(modKey)}
                    className={`osu-skills-player__mod-btn ${
                      active ? 'osu-skills-player__mod-btn--active' : ''
                    }`}
                  >
                    {modKey}
                  </button>
                );
              })}
            </div>

            {/* Unified Speed Dropdown */}
            <div className="osu-skills-speed-switcher" ref={speedDropdownRef}>
              <button
                type="button"
                className={`osu-skills-speed-trigger ${isSpeedOpen ? 'osu-skills-speed-trigger--open' : ''}`}
                onClick={() => setIsSpeedOpen(!isSpeedOpen)}
                title="Alterar velocidade de reprodução"
                aria-expanded={isSpeedOpen}
              >
                <span className="osu-skills-speed-trigger__label">{playbackRate}x</span>
                <i
                  className={`fas fa-chevron-up osu-skills-speed-trigger__icon ${
                    isSpeedOpen ? 'osu-skills-speed-trigger__icon--open' : ''
                  }`}
                />
              </button>

              {isSpeedOpen && (
                <div className="osu-skills-speed-dropdown" role="listbox">
                  <div className="osu-skills-speed-dropdown__title">Velocidade</div>
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      role="option"
                      aria-selected={playbackRate === speed}
                      className={`osu-skills-speed-item ${
                        playbackRate === speed ? 'osu-skills-speed-item--active' : ''
                      }`}
                      onClick={() => {
                        handleSpeedChange(speed);
                        setIsSpeedOpen(false);
                      }}
                    >
                      <span>{speed}x</span>
                      {playbackRate === speed && <i className="fas fa-check osu-skills-speed-item__check" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Official ppy/osu-web .page-mode Sub-Navigation Bar (Ver Padrões vs Ver Skills) */}
      <ul
        className="page-mode page-mode--sticky-toolbar"
        style={{
          padding: '6px 15px 0',
          backgroundColor: 'hsl(var(--hsl-b4))',
          textAlign: 'left',
          flexShrink: 0,
          fontSize: '13px',
          fontFamily: 'Inter, Torus, "Helvetica Neue", sans-serif',
        }}
      >
        <li className="page-mode__item">
          <a
            href="#patterns"
            onClick={(e) => {
              e.preventDefault();
              setActiveBottomTab('patterns');
            }}
            className={`page-mode-link ${
              activeBottomTab === 'patterns' ? 'page-mode-link--is-active' : ''
            }`}
            style={{
              fontSize: '13px',
              fontFamily: 'Inter, Torus, "Helvetica Neue", sans-serif',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <i className="fas fa-list-ul fa-fw" style={{ fontSize: '13px', marginRight: '6px', alignSelf: 'center' }} />
            <span style={{ fontSize: '13px', lineHeight: 1.2 }}>Ver Padrões</span>
            <span className="page-mode-link__stripe" />
          </a>
        </li>

        <li className="page-mode__item">
          <a
            href="#skills"
            onClick={(e) => {
              e.preventDefault();
              setActiveBottomTab('skills');
            }}
            className={`page-mode-link ${
              activeBottomTab === 'skills' ? 'page-mode-link--is-active' : ''
            }`}
            style={{
              fontSize: '13px',
              fontFamily: 'Inter, Torus, "Helvetica Neue", sans-serif',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <i className="fas fa-chart-bar fa-fw" style={{ fontSize: '13px', marginRight: '6px', alignSelf: 'center' }} />
            <span style={{ fontSize: '13px', lineHeight: 1.2 }}>Ver Skills</span>
            <span className="page-mode-link__stripe" />
          </a>
        </li>
      </ul>

      {/* Alternating Lower Content: Ver Padrões OU Ver Skills */}
      {activeBottomTab === 'patterns' ? (
        <div className="osu-skills-player__patterns">
          <div className="osu-skills-player__patterns-header">
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'hsl(var(--hsl-c1))' }}>
            <i className="fas fa-list-ul" style={{ color: 'hsl(var(--hsl-h1))', marginRight: '6px' }} />
            <span>Padrões detectados ({detectedPatterns.length})</span>
          </div>

          {/* Category Filter using osu-web .sort */}
          <div className="sort">
            <div className="sort__items">
              {(['TODOS', 'STREAMS', 'JUMPS', 'BURSTS', 'TECH'] as PatternCategory[]).map((cat) => (
                <a
                  key={cat}
                  href={`#cat-${cat}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setPatternCategory(cat);
                  }}
                  className={`sort__item sort__item--button ${
                    patternCategory === cat ? 'sort__item--active' : ''
                  }`}
                  style={{ padding: '2px 8px', fontSize: '11px' }}
                >
                  {cat.toLowerCase()}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Patterns List */}
        <div ref={patternsListRef} className="osu-skills-player__patterns-list">
          {filteredPatterns.length > 0 ? (
            filteredPatterns.map((p) => {
              const isLive = currentTimeMs >= p.startTimeMs && currentTimeMs <= p.endTimeMs;
              const isWaitingSelected =
                (!livePattern && currentOrRecentPattern?.id === p.id) ||
                selectedPatternId === p.id;

              const patternProgress = isLive
                ? clamp(
                    0,
                    (currentTimeMs - p.startTimeMs) / Math.max(1, p.endTimeMs - p.startTimeMs),
                    1
                  ) * 100
                : currentTimeMs > p.endTimeMs
                ? 100
                : 0;

              const sev = SEVERITY_BADGES[p.severity] || SEVERITY_BADGES.medium;
              const isCopied = copiedPatternId === p.id;
              const iconClass = PATTERN_ICON_CLASS[p.type] || 'fas fa-bolt';

              return (
                <div
                  key={p.id}
                  id={`pattern-row-${p.id}`}
                  onClick={() => jumpToPattern(p)}
                  className={`osu-skills-player__pattern-item ${
                    isLive
                      ? 'osu-skills-player__pattern-item--active'
                      : isWaitingSelected
                      ? 'osu-skills-player__pattern-item--selected'
                      : ''
                  }`}
                >
                  {/* Left: Icon + Official osu-web Timestamp + Label */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: 'hsl(var(--hsl-b6))',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'hsl(var(--hsl-h1))',
                        flexShrink: 0,
                      }}
                    >
                      <i className={iconClass} />
                    </span>

                    <span className="beatmap-discussion-timestamp">
                      {p.startTimestamp}
                    </span>

                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center' }}>
                      <strong
                        className="u-ellipsis-overflow"
                        style={{ fontSize: '12px', color: '#fff', lineHeight: 1.25 }}
                      >
                        {p.label}
                      </strong>
                      {p.description && (
                        <span
                          className="u-ellipsis-overflow"
                          style={{ fontSize: '11px', color: 'hsl(var(--hsl-l2))', lineHeight: 1.25 }}
                        >
                          {p.description}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Metrics + Severity Pill + Copy Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {p.metrics.bpm && (
                      <span style={{ fontSize: '11px', color: 'hsl(var(--hsl-l2))' }}>
                        {p.metrics.bpm} BPM
                      </span>
                    )}

                    {p.noteCount > 0 && (
                      <span style={{ fontSize: '11px', color: 'hsl(var(--hsl-l2))' }}>
                        {p.noteCount} notas
                      </span>
                    )}

                    <span
                      className="osu-skills-mod-pill"
                      style={{
                        backgroundColor: sev.bg,
                        color: sev.color,
                        fontSize: '9px',
                      }}
                    >
                      {sev.label}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleCopyPatternTimestamp(p, e)}
                      title={`Copiar timestamp do editor osu! (${p.osuEditorTimestamp})`}
                      className="btn-osu-big btn-osu-big--rounded-small"
                    >
                      <i className={`fas fa-${isCopied ? 'check' : 'copy'}`} />
                    </button>
                  </div>

                  {isLive && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                      }}
                    >
                      <div
                        className="bar bar--user-profile"
                        style={{ '--fill': `${patternProgress}%`, height: '2px' } as React.CSSProperties}
                      >
                        <div className="bar__fill" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div
              style={{
                padding: '30px',
                textAlign: 'center',
                color: 'hsl(var(--hsl-l2))',
                backgroundColor: 'hsl(var(--hsl-b4))',
                borderRadius: '8px',
              }}
            >
              <i className="fas fa-bolt" style={{ fontSize: '24px', marginBottom: '8px' }} />
              <div style={{ fontWeight: 700, color: '#fff' }}>
                Nenhum padrão detectado nesta categoria
              </div>
              <div style={{ fontSize: '11px', marginTop: '4px' }}>
                Selecione &ldquo;todos&rdquo; acima para visualizar todos os padrões identificados.
              </div>
            </div>
          )}
        </div>
      </div>
    ) : (
      <div className="osu-skills-player__skills-wrapper">
        <StatHexagon skills={map.skills} />
      </div>
    )}
  </div>
);
};
