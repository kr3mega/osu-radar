import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { HitObject, BeatmapDifficulty } from '../../engine/types';
import { DetectedPattern, formatOsuEditorTimestamp } from '../../engine/patterns';
import { calculatePreempt } from '../../engine/channels/tech';
import { formatTimestamp } from '../../engine/strains';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Repeat,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface PatternPlayfieldVisualizerProps {
  hitObjects?: HitObject[];
  difficulty: BeatmapDifficulty;
  patterns: DetectedPattern[];
  initialTimeMs?: number;
  initialPatternId?: string;
  onClose?: () => void;
}

export const PatternPlayfieldVisualizer: React.FC<PatternPlayfieldVisualizerProps> = ({
  hitObjects = [],
  difficulty,
  patterns = [],
  initialTimeMs,
  initialPatternId,
}) => {
  // 1. Determine active pattern
  const [selectedPatternIndex, setSelectedPatternIndex] = useState<number>(() => {
    if (initialPatternId) {
      const idx = patterns.findIndex((p) => p.id === initialPatternId);
      if (idx !== -1) return idx;
    }
    if (initialTimeMs !== undefined) {
      const idx = patterns.findIndex(
        (p) => initialTimeMs >= p.startTimeMs && initialTimeMs <= p.endTimeMs
      );
      if (idx !== -1) return idx;
    }
    return 0;
  });

  const activePattern = patterns[selectedPatternIndex] || patterns[0] || null;

  // Window bounds for playback
  const startTime = activePattern ? Math.max(0, activePattern.startTimeMs - 400) : 0;
  const endTime = activePattern ? activePattern.endTimeMs + 600 : 5000;

  const [currentTimeMs, setCurrentTimeMs] = useState<number>(() => initialTimeMs ?? startTime);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.75); // default 0.75x for clear inspection
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [copiedTimestamp, setCopiedTimestamp] = useState<boolean>(false);

  const lastFrameTimeRef = useRef<number>(performance.now());
  const requestRef = useRef<number | null>(null);

  // Sync when initialPatternId or initialTimeMs changes from parent click
  useEffect(() => {
    if (initialPatternId) {
      const idx = patterns.findIndex((p) => p.id === initialPatternId);
      if (idx !== -1) {
        setSelectedPatternIndex(idx);
        setCurrentTimeMs(patterns[idx].startTimeMs - 200);
        setIsPlaying(true);
      }
    } else if (initialTimeMs !== undefined) {
      setCurrentTimeMs(initialTimeMs);
      const idx = patterns.findIndex(
        (p) => initialTimeMs >= p.startTimeMs - 500 && initialTimeMs <= p.endTimeMs + 500
      );
      if (idx !== -1) setSelectedPatternIndex(idx);
      setIsPlaying(true);
    }
  }, [initialPatternId, initialTimeMs, patterns]);

  // Radius based on CS: R = 54.4 - 4.48 * CS
  const circleRadius = useMemo(() => {
    const cs = difficulty?.cs ?? 4;
    return Math.max(14, Math.round(54.4 - 4.48 * cs));
  }, [difficulty?.cs]);

  // Approach Preempt window based on AR
  const preempt = useMemo(() => {
    const ar = difficulty?.ar ?? 9;
    return calculatePreempt(ar);
  }, [difficulty?.ar]);

  // Animation Loop for real-time smooth playback
  const animate = useCallback(
    (now: number) => {
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      if (isPlaying) {
        setCurrentTimeMs((prev) => {
          const next = prev + delta * playbackSpeed;
          if (next >= endTime) {
            if (isLooping) {
              return startTime;
            } else {
              setIsPlaying(false);
              return endTime;
            }
          }
          return next;
        });
      }

      requestRef.current = requestAnimationFrame(animate);
    },
    [isPlaying, playbackSpeed, startTime, endTime, isLooping]
  );

  useEffect(() => {
    lastFrameTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  // Keyboard shortcut: Spacebar to toggle Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter hitobjects relevant to the pattern and current time window
  const visibleObjects = useMemo(() => {
    if (!hitObjects || hitObjects.length === 0) return [];
    // Objects visible in [currentTime - 200, currentTime + preempt]
    return hitObjects.filter(
      (obj) => obj.time >= currentTimeMs - 300 && obj.time <= currentTimeMs + preempt
    );
  }, [hitObjects, currentTimeMs, preempt]);

  // Pattern Objects for connecting jump lines
  const patternObjects = useMemo(() => {
    if (!hitObjects || hitObjects.length === 0 || !activePattern) return [];
    return hitObjects.filter(
      (obj) => obj.time >= activePattern.startTimeMs - 100 && obj.time <= activePattern.endTimeMs + 100
    );
  }, [hitObjects, activePattern]);

  // Compute cursor position interpolated between objects
  const cursorPosition = useMemo(() => {
    if (patternObjects.length === 0) return { x: 256, y: 192 };

    // Find the current or next object
    let prev = patternObjects[0];
    let next = patternObjects[0];

    for (let i = 0; i < patternObjects.length; i++) {
      const obj = patternObjects[i];
      if (obj.time <= currentTimeMs) {
        prev = obj;
      }
      if (obj.time > currentTimeMs) {
        next = obj;
        break;
      }
    }

    if (prev === next || prev.time === next.time) {
      return { x: prev.x, y: prev.y };
    }

    const t = Math.max(0, Math.min(1, (currentTimeMs - prev.time) / (next.time - prev.time)));
    // Smooth easeInOut interpolation
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    return {
      x: prev.x + (next.x - prev.x) * ease,
      y: prev.y + (next.y - prev.y) * ease,
    };
  }, [patternObjects, currentTimeMs]);

  const handleCopyTimestamp = async () => {
    if (!activePattern) return;
    await navigator.clipboard.writeText(activePattern.osuEditorTimestamp);
    setCopiedTimestamp(true);
    setTimeout(() => setCopiedTimestamp(false), 1500);
  };

  const handlePrevPattern = () => {
    if (patterns.length === 0) return;
    const newIdx = selectedPatternIndex > 0 ? selectedPatternIndex - 1 : patterns.length - 1;
    setSelectedPatternIndex(newIdx);
    setCurrentTimeMs(patterns[newIdx].startTimeMs - 200);
    setIsPlaying(true);
  };

  const handleNextPattern = () => {
    if (patterns.length === 0) return;
    const newIdx = selectedPatternIndex < patterns.length - 1 ? selectedPatternIndex + 1 : 0;
    setSelectedPatternIndex(newIdx);
    setCurrentTimeMs(patterns[newIdx].startTimeMs - 200);
    setIsPlaying(true);
  };

  const handleStep = (stepMs: number) => {
    setCurrentTimeMs((prev) => Math.max(startTime, Math.min(endTime, prev + stepMs)));
  };

  return (
    <div className="flex flex-col gap-3 w-full bg-[#13071b] border border-white/10 rounded-xl p-3.5 shadow-2xl backdrop-blur-md">
      {/* 1. Header HUD: Pattern Badge + Selector + Timestamp */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={handlePrevPattern}
            className="p-1 rounded bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all shrink-0"
            title="Padrão Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-osu-pink text-white shadow-glowPink shrink-0">
                {activePattern ? activePattern.type.replace('_', ' ') : 'PADRÃO'}
              </span>
              <h4 className="text-xs sm:text-sm font-black text-white truncate">
                {activePattern ? activePattern.label : 'Visualizador de Padrão'}
              </h4>
            </div>

            {activePattern && (
              <span className="text-[10px] text-white/50 truncate mt-0.5">
                {activePattern.description} • {activePattern.noteCount} notas
                {activePattern.metrics.bpm ? ` • ${activePattern.metrics.bpm} BPM` : ''}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleNextPattern}
            className="p-1 rounded bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all shrink-0"
            title="Próximo Padrão"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Timestamp & Editor Copy Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-xs font-black text-osu-cyan bg-black/60 px-2 py-1 rounded border border-white/10">
            {formatOsuEditorTimestamp(currentTimeMs)}
          </span>

          {activePattern && (
            <button
              type="button"
              onClick={handleCopyTimestamp}
              className="p-1 px-2 rounded bg-black/50 hover:bg-black/80 border border-white/10 text-white/80 hover:text-white transition-all text-[11px] font-mono flex items-center gap-1"
              title="Copiar timestamp para o editor do osu!"
            >
              {copiedTimestamp ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-400 font-bold">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Editor</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 2. Interactive osu! Standard Playfield (512 x 384 coordinate system) */}
      <div className="relative w-full aspect-[4/3] max-w-[512px] mx-auto bg-[#0a030e] border border-white/15 rounded-xl overflow-hidden shadow-inner select-none flex items-center justify-center">
        {/* Subtle osu! playfield grid center mark and border guide */}
        <div className="absolute inset-4 border border-white/5 rounded-lg pointer-events-none" />
        <div className="absolute w-2 h-2 rounded-full bg-white/10 pointer-events-none" />

        <svg
          viewBox="0 0 512 384"
          className="w-full h-full relative z-10"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* Glowing filter for approach circle and hit burst */}
            <filter id="glowPink" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ff66aa" floodOpacity="0.8" />
            </filter>
            <filter id="glowCyan" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00e5ff" floodOpacity="0.8" />
            </filter>
            <linearGradient id="sliderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff66aa" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {/* 1. Vector jump trajectory lines connecting consecutive objects in the pattern */}
          {patternObjects.map((obj, i) => {
            if (i === 0) return null;
            const prev = patternObjects[i - 1];
            return (
              <line
                key={`line-${obj.time}-${i}`}
                x1={prev.x}
                y1={prev.y}
                x2={obj.x}
                y2={obj.y}
                stroke="#ffffff"
                strokeOpacity="0.25"
                strokeWidth="2.5"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* 2. Render Sliders */}
          {visibleObjects
            .filter((o) => o.type === 'slider' && o.points && o.points.length >= 2)
            .map((slider) => {
              const pts = slider.points || [];
              let pathStr = `M ${pts[0].x} ${pts[0].y}`;
              for (let p = 1; p < pts.length; p++) {
                pathStr += ` L ${pts[p].x} ${pts[p].y}`;
              }

              return (
                <g key={`slider-${slider.time}`}>
                  {/* Slider Body Border */}
                  <path
                    d={pathStr}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={circleRadius * 2 + 3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.35"
                  />
                  {/* Slider Body Fill */}
                  <path
                    d={pathStr}
                    fill="none"
                    stroke="url(#sliderGrad)"
                    strokeWidth={circleRadius * 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.65"
                  />
                </g>
              );
            })}

          {/* 3. Render Hit Objects & Contracting Approach Circles */}
          {visibleObjects.map((obj, index) => {
            const dt = obj.time - currentTimeMs; // ms until hit
            const isHit = dt <= 0;
            const hitProgress = Math.max(0, Math.min(1, (preempt - dt) / preempt));

            // Approach circle radius contracts from 3 * R to 1 * R
            const approachRadius = circleRadius * (1 + 2 * Math.max(0, dt / preempt));

            // Hit burst expansion if hit within last 180ms
            const burstProgress = isHit ? Math.min(1, Math.abs(dt) / 180) : 0;
            const burstRadius = circleRadius * (1 + burstProgress * 0.5);
            const burstOpacity = isHit ? 1 - burstProgress : 1;

            if (burstOpacity <= 0) return null;

            return (
              <g key={`obj-${obj.time}-${index}`} opacity={burstOpacity}>
                {/* Hit Circle Outer Ring */}
                <circle
                  cx={obj.x}
                  cy={obj.y}
                  r={burstRadius}
                  fill="#1c0c28"
                  stroke={isHit ? '#00e5ff' : '#ff66aa'}
                  strokeWidth="3.5"
                  filter="url(#glowPink)"
                />

                {/* Hit Circle Inner Disc */}
                <circle
                  cx={obj.x}
                  cy={obj.y}
                  r={Math.max(4, circleRadius - 4)}
                  fill={isHit ? '#00e5ff' : '#ff66aa'}
                  opacity={isHit ? 0.9 : 0.8}
                />

                {/* Combo Number (1-indexed based on pattern objects) */}
                <text
                  x={obj.x}
                  y={obj.y + 4}
                  fill="#ffffff"
                  fontSize={Math.max(12, circleRadius * 0.75)}
                  fontWeight="900"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {(patternObjects.findIndex((p) => p.time === obj.time) % 9) + 1}
                </text>

                {/* Approach Circle (only if approaching) */}
                {dt > 0 && dt <= preempt && (
                  <circle
                    cx={obj.x}
                    cy={obj.y}
                    r={approachRadius}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    opacity={Math.min(1, hitProgress * 1.5)}
                  />
                )}
              </g>
            );
          })}

          {/* 4. Ghost Cursor Trail & Cursor Position */}
          <circle
            cx={cursorPosition.x}
            cy={cursorPosition.y}
            r={10}
            fill="#00e5ff"
            stroke="#ffffff"
            strokeWidth="3"
            filter="url(#glowCyan)"
            className="transition-transform"
          />
          <circle
            cx={cursorPosition.x}
            cy={cursorPosition.y}
            r={3}
            fill="#ffffff"
          />
        </svg>

        {/* Real-time Indicator Badge */}
        <div className="absolute top-2.5 left-3 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 border border-white/10 text-[10px] font-mono text-white/80">
          <span className="w-1.5 h-1.5 rounded-full bg-osu-pink animate-ping" />
          <span>Física em Tempo Real</span>
        </div>
      </div>

      {/* 3. Real-Time Scrubber Bar (Avançar e Voltar) */}
      <div className="flex flex-col gap-1 w-full px-1">
        <div className="flex items-center justify-between text-[11px] font-mono text-white/60">
          <span>{formatTimestamp(startTime)}</span>
          <span className="text-osu-cyan font-bold">{formatTimestamp(currentTimeMs)}</span>
          <span>{formatTimestamp(endTime)}</span>
        </div>

        <input
          type="range"
          min={startTime}
          max={endTime}
          step={5}
          value={Math.round(currentTimeMs)}
          onChange={(e) => {
            setCurrentTimeMs(parseFloat(e.target.value));
          }}
          className="w-full accent-osu-pink h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* 4. Bottom Controls: Play/Pause, Step Rewind/Forward, Speed, Loop */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/10">
        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          {/* Step Back 500ms */}
          <button
            type="button"
            onClick={() => handleStep(-500)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all"
            title="Voltar 500ms"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play / Pause Toggle */}
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className={`px-3.5 py-1.5 rounded-lg font-black text-xs uppercase flex items-center gap-1.5 transition-all shadow-md ${
              isPlaying
                ? 'bg-osu-pink text-white shadow-glowPink'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Iniciar</span>
              </>
            )}
          </button>

          {/* Step Forward 500ms */}
          <button
            type="button"
            onClick={() => handleStep(500)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all"
            title="Avançar 500ms"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Reset to Start */}
          <button
            type="button"
            onClick={() => {
              setCurrentTimeMs(startTime);
              setIsPlaying(true);
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all"
            title="Reiniciar Padrão"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Selector (0.25x, 0.5x, 1x) & Loop Toggle */}
        <div className="flex items-center gap-2">
          {/* Speed Pills */}
          <div className="flex items-center gap-0.5 bg-black/40 p-0.5 rounded-lg border border-white/5 text-[10px] font-mono font-bold">
            {[0.25, 0.5, 0.75, 1.0].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-1.5 py-0.5 rounded transition-all ${
                  playbackSpeed === spd
                    ? 'bg-osu-cyan text-[#120818] font-black shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Loop Toggle */}
          <button
            type="button"
            onClick={() => setIsLooping((l) => !l)}
            className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-[10px] font-bold ${
              isLooping
                ? 'bg-osu-pink/20 text-osu-pink border border-osu-pink/40'
                : 'bg-white/5 text-white/40 hover:text-white'
            }`}
            title="Repetir padrão em loop contínuo"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Loop</span>
          </button>
        </div>
      </div>
    </div>
  );
};
