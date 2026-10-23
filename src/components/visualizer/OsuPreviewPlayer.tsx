import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Repeat,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Sliders,
  Radio,
  Music,
  Loader2,
  Zap,
  Waves,
  Target,
  Activity,
  Filter,
} from 'lucide-react';
import {
  OsuPreviewController,
  getOrReconstructBeatmapText,
  OsuMod,
  clamp,
  resolveBeatmapAudio,
  AudioResolveStatus,
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

export function getModFromSlot(modSlot?: string): OsuMod | null {
  if (!modSlot) return null;
  const upper = modSlot.toUpperCase().trim();
  if (upper.startsWith('HD')) return 'hd';
  if (upper.startsWith('HR')) return 'hr';
  if (upper.startsWith('DT')) return 'dt';
  if (upper.startsWith('EZ')) return 'ez';
  return null;
}

const SEVERITY_BADGES: Record<
  PatternSeverity,
  { bg: string; text: string; border: string; label: string }
> = {
  extreme: {
    bg: 'bg-red-500/20',
    text: 'text-red-400 font-extrabold',
    border: 'border-red-500/40',
    label: 'Extrema',
  },
  high: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400 font-bold',
    border: 'border-orange-500/40',
    label: 'Alta',
  },
  medium: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400 font-medium',
    border: 'border-yellow-500/30',
    label: 'Média',
  },
  low: {
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-300 font-normal',
    border: 'border-cyan-500/30',
    label: 'Baixa',
  },
};

const PATTERN_ICONS: Record<PatternType, React.ReactNode> = {
  deathstream: <Waves className="w-3.5 h-3.5 text-osu-pink" />,
  stream: <Waves className="w-3.5 h-3.5 text-osu-cyan" />,
  spaced_stream: <Waves className="w-3.5 h-3.5 text-red-400" />,
  burst: <Activity className="w-3.5 h-3.5 text-osu-cyan" />,
  snap_jumps: <Target className="w-3.5 h-3.5 text-yellow-400" />,
  flow_aim: <Zap className="w-3.5 h-3.5 text-green-400" />,
  sv_spike: <Activity className="w-3.5 h-3.5 text-purple-400" />,
  rhythm_switch: <Filter className="w-3.5 h-3.5 text-blue-400" />,
  choke_point: <Zap className="w-3.5 h-3.5 text-red-500" />,
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

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(initialTimeMs);
  const [durationMs, setDurationMs] = useState<number>(map.stats.durationMs || 1000);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [bgDim, setBgDim] = useState<number>(0.85);
  const [activeMods, setActiveMods] = useState<Set<OsuMod>>(new Set());
  const [copiedTime, setCopiedTime] = useState<boolean>(false);
  const [copiedPatternId, setCopiedPatternId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedPatternId, setSelectedPatternId] = useState<string | undefined>(initialPatternId);
  const [isLoopEnabled, setIsLoopEnabled] = useState<boolean>(false);
  const [hasAudioTrack, setHasAudioTrack] = useState<boolean>(false);
  const [patternCategory, setPatternCategory] = useState<PatternCategory>('TODOS');
  const [audioStatus, setAudioStatus] = useState<AudioResolveStatus>({
    state: 'idle',
    message: '',
  });

  // 1. Derive mod from beatmap slot (HD, HR, DT, EZ, or none)
  const slotMod = useMemo(() => getModFromSlot(map.modSlot), [map.modSlot]);

  // When map changes, auto-select its corresponding mod immediately and clear all others
  useEffect(() => {
    const nextMods = new Set<OsuMod>();
    if (slotMod) {
      nextMods.add(slotMod);
    }
    setActiveMods(nextMods);
    setPlaybackRate(slotMod === 'dt' ? 1.5 : 1.0);
    if (controllerRef.current) {
      (['ez', 'hr', 'dt', 'hd'] as OsuMod[]).forEach((m) => {
        controllerRef.current?.setMod(m, nextMods.has(m));
      });
    }
  }, [map.id, map.modSlot, slotMod]);

  // Authentic algorithm-detected patterns (Streams, Deathstreams, Bursts, Jumps, SV Spikes, etc.)
  const detectedPatterns = useMemo<DetectedPattern[]>(() => {
    if (patterns && patterns.length > 0) {
      return [...patterns].sort((a, b) => a.startTimeMs - b.startTimeMs);
    }
    if (map.patterns && map.patterns.length > 0) {
      return [...map.patterns].sort((a, b) => a.startTimeMs - b.startTimeMs);
    }
    // Compute on-the-fly via the authentic algorithm
    try {
      const rawText = getOrReconstructBeatmapText(map);
      const parsed = parseOsuBeatmap(rawText);
      const computed = detectBeatmapPatterns(parsed.hitObjects, parsed.timingPoints);
      return computed.sort((a, b) => a.startTimeMs - b.startTimeMs);
    } catch (err) {
      console.warn('Failed to detect patterns on the fly:', err);
      return [];
    }
  }, [patterns, map]);

  // Filtered patterns by category
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

  // 1. Identify active pattern currently playing live
  const livePattern = useMemo(() => {
    return (
      detectedPatterns.find(
        (p) => currentTimeMs >= p.startTimeMs && currentTimeMs <= p.endTimeMs
      ) || null
    );
  }, [detectedPatterns, currentTimeMs]);

  // 2. Identify currently playing OR most recently completed pattern
  const currentOrRecentPattern = useMemo(() => {
    if (livePattern) return livePattern;
    const pastPatterns = detectedPatterns.filter((p) => currentTimeMs >= p.startTimeMs);
    if (pastPatterns.length > 0) {
      return pastPatterns[pastPatterns.length - 1];
    }
    return detectedPatterns.find((p) => p.id === selectedPatternId) || null;
  }, [detectedPatterns, currentTimeMs, livePattern, selectedPatternId]);

  // Initialize OsuPreviewController
  useEffect(() => {
    if (!canvasRef.current) return;

    const controller = new OsuPreviewController(canvasRef.current);
    controllerRef.current = controller;

    const initialMods = new Set<OsuMod>();
    if (slotMod) {
      initialMods.add(slotMod);
    }

    const rawText = getOrReconstructBeatmapText(map);
    controller
      .init(rawText, initialTimeMs, map.audioBlob || map.audioUrl, initialMods)
      .then(() => {
        controller.setVolume(volume);
        controller.setBackgroundDim(bgDim);
      });

    const unsubscribe = controller.subscribe((state) => {
      setCurrentTimeMs(state.currentTimeMs);
      setDurationMs(state.durationMs);
      setIsPlaying(state.isPlaying);
      setPlaybackRate(state.playbackRate);
      setHasAudioTrack(state.hasAudioTrack);
    });

    // Auto-resolve or download full audio track if missing
    let isCancelled = false;
    resolveBeatmapAudio(map, (status) => {
      if (!isCancelled) setAudioStatus(status);
    }).then((blob) => {
      if (blob && !isCancelled && controllerRef.current) {
        controllerRef.current.loadAudioTrack(blob);
      }
    });

    const handleResize = () => {
      controller.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      unsubscribe();
      window.removeEventListener('resize', handleResize);
      controller.destroy();
      controllerRef.current = null;
    };
  }, [map]);

  // Auto-scroll list to active pattern
  useEffect(() => {
    const targetToScroll = livePattern || currentOrRecentPattern;
    if (targetToScroll && isPlaying && patternsListRef.current) {
      const container = patternsListRef.current;
      const activeEl = document.getElementById(`pattern-row-${targetToScroll.id}`);
      if (activeEl) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = activeEl.getBoundingClientRect();

        if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
          const offsetTop = activeEl.offsetTop - container.offsetTop;
          container.scrollTo({
            top: Math.max(0, offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2),
            behavior: 'smooth',
          });
        }
      }
    }
  }, [livePattern?.id, currentOrRecentPattern?.id, isPlaying]);

  // Jump to pattern on click
  const jumpToPattern = useCallback(
    (p: DetectedPattern) => {
      setSelectedPatternId(p.id);
      if (controllerRef.current) {
        controllerRef.current.seek(p.startTimeMs);
        controllerRef.current.play();
        if (isLoopEnabled) {
          controllerRef.current.setLoopRange(p.startTimeMs, p.endTimeMs);
        } else {
          controllerRef.current.clearLoopRange();
        }
      }
    },
    [isLoopEnabled]
  );

  const handleToggleLoop = () => {
    const next = !isLoopEnabled;
    setIsLoopEnabled(next);
    if (controllerRef.current) {
      if (next) {
        const target =
          livePattern ||
          currentOrRecentPattern ||
          detectedPatterns.find((p) => p.id === selectedPatternId) ||
          detectedPatterns[0];
        if (target) {
          controllerRef.current.setLoopRange(target.startTimeMs, target.endTimeMs);
        }
      } else {
        controllerRef.current.clearLoopRange();
      }
    }
  };

  // Playback controls
  const handleTogglePlay = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.togglePlay();
    }
  }, []);

  const handleSeek = (val: number) => {
    if (controllerRef.current) {
      controllerRef.current.seek(val);
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
    const newMods = new Set(activeMods);
    if (newMods.has(modName)) {
      newMods.delete(modName);
      controllerRef.current.setMod(modName, false);
      if (modName === 'dt') {
        setPlaybackRate(1.0);
      }
    } else {
      // HR and EZ are strictly mutually exclusive
      if (modName === 'hr') {
        newMods.delete('ez');
        controllerRef.current.setMod('ez', false);
      } else if (modName === 'ez') {
        newMods.delete('hr');
        controllerRef.current.setMod('hr', false);
      }
      newMods.add(modName);
      controllerRef.current.setMod(modName, true);
      if (modName === 'dt') {
        setPlaybackRate(1.5);
      }
    }
    setActiveMods(newMods);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (controllerRef.current) {
      controllerRef.current.setVolume(newVol);
      if (newVol > 0 && isMuted) {
        setIsMuted(false);
        controllerRef.current.setMuted(false);
      }
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (controllerRef.current) {
      controllerRef.current.setMuted(nextMuted);
    }
  };

  const handleBgDimChange = (dim: number) => {
    setBgDim(dim);
    if (controllerRef.current) {
      controllerRef.current.setBackgroundDim(dim);
    }
  };

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

  // Keyboard shortcuts
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

  // Fullscreen / Cinema mode
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Manual audio file selection
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

  const handleAudioDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (
      file &&
      (file.name.endsWith('.mp3') || file.name.endsWith('.ogg') || file.name.endsWith('.wav'))
    ) {
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
      className={`flex flex-col bg-[#0b0e14] border border-white/10 rounded-xl overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : 'w-full'
      }`}
    >
      {/* Top Compact Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#121620] border-b border-white/10 text-xs select-none">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="font-bold text-white truncate max-w-[180px] sm:max-w-xs">
            {map.metadata.title}
          </span>
          <span className="text-white/40 hidden sm:inline text-[11px]">
            [{map.metadata.version}]
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-osu-pink/20 text-osu-pink border border-osu-pink/30 uppercase tracking-wider">
            {map.modSlot || 'NM'}
          </span>
          {hasAudioTrack ? (
            <span
              title="Música do beatmap ativa e sincronizada no ritmo via AudioContext"
              className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/15 text-green-400 border border-green-500/30 shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <Music className="w-2.5 h-2.5" />
              <span>MÚSICA ATIVA</span>
            </span>
          ) : audioStatus.state === 'loading' ? (
            <span
              title={audioStatus.message}
              className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 animate-pulse shadow-sm"
            >
              <Loader2 className="w-2.5 h-2.5 animate-spin text-yellow-400" />
              <span>{audioStatus.message || 'Baixando música...'}</span>
            </span>
          ) : audioStatus.state === 'error' ? (
            <span
              title={audioStatus.message}
              className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/15 text-red-400 border border-red-500/30"
            >
              <span>{audioStatus.message || 'Música offline'}</span>
            </span>
          ) : null}

          <input
            ref={audioInputRef}
            type="file"
            accept="audio/mp3,audio/ogg,audio/wav,audio/*"
            className="hidden"
            onChange={handleAudioFileSelect}
          />
        </div>

        {/* Mod Buttons & Fullscreen */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-black/50 rounded-md p-0.5 border border-white/10">
            {(['ez', 'hr', 'dt', 'hd'] as OsuMod[]).map((modKey) => {
              const active = activeMods.has(modKey);
              return (
                <button
                  key={modKey}
                  type="button"
                  onClick={() => handleToggleMod(modKey)}
                  className={`px-1.5 py-0.5 text-[9px] font-black uppercase rounded transition-all ${
                    active
                      ? 'bg-osu-cyan text-black font-extrabold shadow-sm'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  {modKey}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Sair do Modo Cinema' : 'Modo Cinema'}
            className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all ml-1"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Visor do Preview (Margens ampliadas internamente para evitar que hitobjects vazem da tela) */}
      <div
        className={`flex items-center justify-center bg-[#07090e] border-b border-white/5 ${
          isFullscreen ? 'flex-1 p-4' : 'py-2.5 px-3'
        }`}
      >
        <div
          className={`relative aspect-[512/384] bg-black rounded-lg overflow-hidden shadow-inner cursor-pointer group ${
            isFullscreen ? 'w-full max-w-[800px]' : 'w-full max-w-[380px] sm:max-w-[420px]'
          }`}
          onClick={handleTogglePlay}
        >
          <canvas ref={canvasRef} className="w-full h-full block cursor-pointer" />

          {/* Center Play Splash */}
          {!isPlaying && (
            <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 transition-all">
              <div className="w-12 h-12 rounded-full bg-osu-pink/90 text-white flex items-center justify-center shadow-glowPink ring-2 ring-white/30 group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 fill-current ml-0.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 bg-black/60 px-2 py-0.5 rounded-full border border-white/10">
                Clique para Jogar
              </span>
            </div>
          )}

          {/* Mini active pattern floating pill inside visor */}
          {livePattern && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white flex items-center gap-1.5 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-osu-pink animate-ping" />
              <span className="truncate max-w-[140px]">{livePattern.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* Scrubber Timeline Bar */}
      <div className="px-3 py-2 bg-[#10141e] border-b border-white/10 flex flex-col gap-1.5 select-none">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-osu-cyan font-bold min-w-[50px]">
            {formatOsuEditorTimestamp(currentTimeMs)}
          </span>

          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min={0}
              max={Math.max(1, durationMs)}
              value={currentTimeMs}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-osu-pink hover:bg-white/20 transition-all"
            />
          </div>

          <span className="text-[10px] font-mono text-white/40 min-w-[50px] text-right">
            {formatOsuEditorTimestamp(durationMs)}
          </span>

          <button
            type="button"
            onClick={copyEditorTimestamp}
            title="Copiar Timestamp para o editor osu!"
            className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all flex items-center gap-1 text-[10px]"
          >
            {copiedTime ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between gap-1 pt-0.5 text-xs">
          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSeek(0)}
              title="Reiniciar"
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleStep(-1000)}
              title="-1s"
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleTogglePlay}
              className="px-3 py-1 rounded-lg bg-osu-pink hover:bg-pink-600 text-white font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span className="text-[10px] uppercase">Pausar</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="text-[10px] uppercase">Jogar</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleStep(1000)}
              title="+1s"
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {/* Loop Toggle Button */}
            <button
              type="button"
              onClick={handleToggleLoop}
              title={
                isLoopEnabled
                  ? 'Repetição em Loop Ativada (Clique para desativar)'
                  : 'Ativar Modo Loop para repetir o padrão selecionado'
              }
              className={`p-1.5 rounded transition-all flex items-center gap-1 ${
                isLoopEnabled
                  ? 'bg-osu-pink/20 text-osu-pink border border-osu-pink/40 shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white'
              }`}
            >
              <Repeat className={`w-3.5 h-3.5 ${isLoopEnabled ? 'stroke-[2.5]' : ''}`} />
            </button>
          </div>

          {/* Speed */}
          <div className="flex items-center gap-0.5 bg-black/40 p-0.5 rounded-lg border border-white/10">
            {[0.5, 0.75, 1.0, 1.5].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => handleSpeedChange(speed)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${
                  playbackRate === speed
                    ? 'bg-osu-pink text-white'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Volume & Dim */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleToggleMute}
                className="text-white/50 hover:text-white"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-12 h-1 bg-white/10 rounded appearance-none cursor-pointer accent-osu-cyan"
                title="Volume"
              />
            </div>

            <div className="hidden sm:flex items-center gap-1 text-white/40 text-[9px]">
              <Sliders className="w-3 h-3" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={bgDim}
                onChange={(e) => handleBgDimChange(parseFloat(e.target.value))}
                className="w-10 h-1 bg-white/10 rounded appearance-none cursor-pointer accent-white/40"
                title="Escurecimento do Fundo"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Espaço Ampliado: Padrões Competitivos Detectados pelo Algoritmo */}
      <div className="flex flex-col bg-[#0b0e14] p-3 flex-1 select-none">
        {/* Header do Reconhecimento de Padrões e Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10 text-xs">
          <div className="flex items-center gap-2 font-bold text-white/80 uppercase tracking-wider text-[11px]">
            <Zap className="w-3.5 h-3.5 text-osu-pink" />
            <span>Padrões Detectados pelo Algoritmo ({detectedPatterns.length})</span>
          </div>

          {/* Filtros de Categoria */}
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase flex-wrap">
            {(['TODOS', 'STREAMS', 'JUMPS', 'BURSTS', 'TECH'] as PatternCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setPatternCategory(cat)}
                className={`px-2 py-0.5 rounded transition-all ${
                  patternCategory === cat
                    ? 'bg-osu-pink text-white shadow-glowPink'
                    : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Patterns List (Tamanho aumentado substituindo o card de Pontos de Tensão) */}
        <div
          ref={patternsListRef}
          className="flex flex-col gap-1.5 h-[340px] max-h-[420px] min-h-[260px] overflow-y-auto pr-1 custom-scrollbar scroll-smooth"
        >
          {filteredPatterns.length > 0 ? (
            filteredPatterns.map((p) => {
              const isLive = currentTimeMs >= p.startTimeMs && currentTimeMs <= p.endTimeMs;
              const isWaitingSelected =
                (!livePattern && currentOrRecentPattern?.id === p.id) ||
                selectedPatternId === p.id;

              // Pattern completion progress
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

              return (
                <div
                  key={p.id}
                  id={`pattern-row-${p.id}`}
                  onClick={() => jumpToPattern(p)}
                  className={`relative group shrink-0 min-h-[50px] rounded-lg p-2.5 transition-all duration-200 cursor-pointer overflow-hidden border ${
                    isLive
                      ? 'bg-gradient-to-r from-osu-pink/25 via-osu-pink/10 to-white/5 border-osu-pink shadow-glowPink ring-1 ring-osu-pink/40'
                      : isWaitingSelected
                      ? 'bg-osu-pink/[0.08] hover:bg-osu-pink/[0.12] border-osu-pink/40 ring-1 ring-osu-pink/20 shadow-sm'
                      : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-xs">
                    {/* Left: Icon, Timestamp, and Pattern Title */}
                    <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                      {/* Pattern Type Icon */}
                      <div className="p-1 rounded bg-black/50 border border-white/10 shrink-0">
                        {PATTERN_ICONS[p.type] || <Activity className="w-3.5 h-3.5 text-osu-pink" />}
                      </div>

                      {/* Timestamp button */}
                      <span
                        className={`font-mono text-[11px] px-1.5 py-0.5 rounded font-bold transition-colors shrink-0 ${
                          isLive
                            ? 'bg-osu-pink text-white shadow-sm'
                            : isWaitingSelected
                            ? 'bg-osu-pink/20 text-osu-pink border border-osu-pink/35'
                            : 'bg-black/50 text-osu-cyan group-hover:text-white'
                        }`}
                      >
                        {p.startTimestamp}
                      </span>

                      {/* Pattern Label & Live Indicator */}
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-semibold truncate transition-colors ${
                              isLive
                                ? 'text-white font-bold'
                                : isWaitingSelected
                                ? 'text-white/95 font-semibold'
                                : 'text-white/80 group-hover:text-white'
                            }`}
                          >
                            {p.label}
                          </span>

                          {isLive && (
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase text-osu-pink bg-osu-pink/20 px-1 rounded tracking-wider shrink-0">
                              <Radio className="w-2.5 h-2.5 animate-pulse" />
                              <span>AO VIVO</span>
                            </span>
                          )}
                          {isWaitingSelected && !isLive && (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-osu-pink/80 bg-osu-pink/10 px-1 rounded border border-osu-pink/20 shrink-0">
                              <span>SELECIONADO</span>
                            </span>
                          )}
                        </div>

                        {p.description && (
                          <span className="text-[10px] text-white/50 truncate max-w-[280px]">
                            {p.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Metrics, Severity Badge, and Copy Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      {p.metrics.bpm && (
                        <span className="text-[10px] font-mono text-white/40 hidden sm:inline">
                          {p.metrics.bpm} BPM
                        </span>
                      )}

                      {p.noteCount > 0 && (
                        <span className="text-[10px] font-mono text-white/40 hidden sm:inline">
                          {p.noteCount} notas
                        </span>
                      )}

                      {p.metrics.svMultiplier && (
                        <span className="text-[10px] font-mono text-purple-300/80 hidden sm:inline">
                          {p.metrics.svMultiplier}x SV
                        </span>
                      )}

                      <span
                        className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded border ${sev.bg} ${sev.text} ${sev.border}`}
                      >
                        {sev.label}
                      </span>

                      {/* Copy Timestamp Button */}
                      <button
                        type="button"
                        onClick={(e) => handleCopyPatternTimestamp(p, e)}
                        title={`Copiar timestamp do editor osu! (${p.osuEditorTimestamp})`}
                        className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all ml-0.5"
                      >
                        {isCopied ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar at the bottom of active card */}
                  {isLive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/40 overflow-hidden">
                      <div
                        className="h-full bg-osu-pink shadow-glowPink transition-all duration-100"
                        style={{ width: `${patternProgress}%` }}
                      />
                    </div>
                  )}
                  {isWaitingSelected && !isLive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/40 overflow-hidden">
                      <div className="h-full bg-osu-pink/35 w-full" />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-white/40 border border-dashed border-white/10 rounded-lg">
              <Zap className="w-8 h-8 text-white/20 mb-2" />
              <p className="text-xs font-semibold text-white/70">
                Nenhum padrão detectado nesta categoria
              </p>
              <p className="text-[11px] text-white/40 mt-1 max-w-xs">
                Selecione &ldquo;TODOS&rdquo; para visualizar todos os padrões mecânicos identificados pelo algoritmo.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
