import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Sliders,
  ChevronRight,
  ListMusic,
} from 'lucide-react';
import {
  OsuPreviewController,
  getOrReconstructBeatmapText,
  OsuMod,
} from '../../lib/osu-preview';
import { DetectedPattern, formatOsuEditorTimestamp } from '../../engine/patterns';
import { BeatmapAnalysisResult } from '../../engine/types';

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
  const controllerRef = useRef<OsuPreviewController | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(initialTimeMs);
  const [durationMs, setDurationMs] = useState<number>(map.stats.durationMs || 1000);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [bgDim, setBgDim] = useState<number>(0.8);
  const [activeMods, setActiveMods] = useState<Set<OsuMod>>(new Set());
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedPatternId, setSelectedPatternId] = useState<string | undefined>(initialPatternId);
  const [showPatternDrawer, setShowPatternDrawer] = useState<boolean>(false);

  // Initialize OsuPreviewController
  useEffect(() => {
    if (!canvasRef.current) return;

    const controller = new OsuPreviewController(canvasRef.current);
    controllerRef.current = controller;

    const rawText = getOrReconstructBeatmapText(map);
    controller.init(rawText, initialTimeMs).then(() => {
      controller.setVolume(volume);
      controller.setBackgroundDim(bgDim);
    });

    const unsubscribe = controller.subscribe((state) => {
      setCurrentTimeMs(state.currentTimeMs);
      setDurationMs(state.durationMs);
      setIsPlaying(state.isPlaying);
      setPlaybackRate(state.playbackRate);
    });

    // Resize observer
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

  // Jump to initial time if prop changes
  useEffect(() => {
    if (initialTimeMs !== undefined && controllerRef.current) {
      controllerRef.current.seek(initialTimeMs);
    }
  }, [initialTimeMs]);

  // Jump to pattern
  const jumpToPattern = useCallback(
    (p: DetectedPattern) => {
      setSelectedPatternId(p.id);
      if (controllerRef.current) {
        controllerRef.current.seek(p.startTimeMs);
        controllerRef.current.play();
      }
    },
    []
  );

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
    } else {
      newMods.add(modName);
      controllerRef.current.setMod(modName, true);
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
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Keyboard shortcuts (Space = Play/Pause, Arrows = Seek)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleStep(e.shiftKey ? -200 : -1000);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleStep(e.shiftKey ? 200 : 1000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, currentTimeMs]);

  // Toggle theater / fullscreen
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

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-[#0b0e14] border border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : 'w-full'
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#121620] border-b border-white/10 text-xs select-none">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="font-bold text-white truncate max-w-[200px] sm:max-w-xs">
            {map.metadata.title}
          </span>
          <span className="text-white/40 hidden sm:inline">[{map.metadata.version}]</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-osu-pink/20 text-osu-pink border border-osu-pink/30 uppercase tracking-wider">
            {map.modSlot || 'NM'}
          </span>
        </div>

        {/* Mod Buttons & Speed */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10">
            {(['ez', 'hr', 'dt', 'hd'] as OsuMod[]).map((modKey) => {
              const active = activeMods.has(modKey);
              return (
                <button
                  key={modKey}
                  type="button"
                  onClick={() => handleToggleMod(modKey)}
                  className={`px-2 py-0.5 text-[10px] font-black uppercase rounded transition-all ${
                    active
                      ? 'bg-osu-cyan text-black font-extrabold shadow-sm'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {modKey}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Sair do Modo Cinema' : 'Modo Cinema Tela Cheia'}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Playfield Canvas Area */}
      <div className="relative w-full flex-1 bg-black flex items-center justify-center min-h-[340px] sm:min-h-[440px] overflow-hidden group">
        <canvas
          ref={canvasRef}
          onClick={handleTogglePlay}
          className="w-full h-full max-h-[75vh] object-contain cursor-pointer"
        />

        {/* Big Play/Pause Center Splash Indicator */}
        {!isPlaying && (
          <div
            onClick={handleTogglePlay}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 cursor-pointer group-hover:bg-black/30 transition-all"
          >
            <div className="w-16 h-16 rounded-full bg-osu-pink/90 text-white flex items-center justify-center shadow-glowPink ring-4 ring-osu-pink/30 hover:scale-110 transition-transform">
              <Play className="w-8 h-8 fill-current ml-1" />
            </div>
            <span className="text-white/80 text-xs font-bold tracking-wider uppercase bg-black/60 px-3 py-1 rounded-full border border-white/10">
              Clique ou Espaço para Reproduzir
            </span>
          </div>
        )}

        {/* Patterns Overlay Drawer Button */}
        {patterns.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPatternDrawer(!showPatternDrawer)}
            className="absolute top-3 left-3 px-2.5 py-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-all"
          >
            <ListMusic className="w-3.5 h-3.5 text-osu-pink" />
            <span>Padrões ({patterns.length})</span>
          </button>
        )}

        {/* Patterns Quick Flyout Drawer */}
        {showPatternDrawer && patterns.length > 0 && (
          <div className="absolute top-12 left-3 w-72 max-h-[70%] bg-[#121620]/95 border border-white/15 rounded-xl backdrop-blur-xl shadow-2xl p-2.5 overflow-y-auto flex flex-col gap-1.5 z-30 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs font-bold text-white/80">
              <span>Padrões Detectados</span>
              <button
                type="button"
                onClick={() => setShowPatternDrawer(false)}
                className="text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>
            {patterns.map((p) => {
              const isSelected = p.id === selectedPatternId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    jumpToPattern(p);
                    setShowPatternDrawer(false);
                  }}
                  className={`flex items-center justify-between p-2 rounded-lg text-left text-xs transition-all ${
                    isSelected
                      ? 'bg-osu-pink text-white font-bold'
                      : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{p.label}</span>
                    <span className="text-[10px] opacity-75 font-mono">{p.startTimestamp}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Transport Controls Bar */}
      <div className="flex flex-col gap-2 p-3 bg-[#121620] border-t border-white/10 select-none">
        {/* Scrubber Timeline */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-osu-cyan font-bold min-w-[55px]">
            {formatOsuEditorTimestamp(currentTimeMs)}
          </span>

          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min={0}
              max={Math.max(1, durationMs)}
              value={currentTimeMs}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-osu-pink hover:bg-white/20 transition-all"
            />
          </div>

          <span className="text-[11px] font-mono text-white/50 min-w-[55px] text-right">
            {formatOsuEditorTimestamp(durationMs)}
          </span>

          {/* Copy Timestamp */}
          <button
            type="button"
            onClick={copyEditorTimestamp}
            title="Copiar Timestamp para o editor osu!"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all flex items-center gap-1 text-[11px] font-mono"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Left: Playback controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleSeek(0)}
              title="Reiniciar"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleStep(-1000)}
              title="-1 segundo"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleTogglePlay}
              className="px-4 py-2 rounded-xl bg-osu-pink hover:bg-pink-600 text-white font-bold flex items-center gap-2 shadow-glowPink transition-all"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span className="text-xs uppercase">Pausar</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span className="text-xs uppercase">Jogar</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleStep(1000)}
              title="+1 segundo"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Center: Playback Speed Buttons */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
            {[0.25, 0.5, 0.75, 1.0, 1.5].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => handleSpeedChange(speed)}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  playbackRate === speed
                    ? 'bg-osu-pink text-white shadow-sm'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Right: Audio Volume & Background Dim */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleMute}
                className="text-white/60 hover:text-white"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-osu-cyan"
                title="Volume dos Hitsounds"
              />
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-white/50 text-[10px]">
              <Sliders className="w-3.5 h-3.5" />
              <span>Dim:</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={bgDim}
                onChange={(e) => handleBgDimChange(parseFloat(e.target.value))}
                className="w-12 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white/50"
                title="Escurecimento do Fundo"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
