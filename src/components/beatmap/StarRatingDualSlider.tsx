import React, { useId, useRef, useState } from 'react';
import { DEFAULT_TRAINING_FILTERS, usePoolStore } from '../../store/usePoolStore';
import { getStarRatingColor, getStarRatingTextColor } from '../../utils/osuColors';

const SR_MIN_LIMIT = 0;
const SR_MAX_LIMIT = 12;
const SR_STEP = 0.05;

function clampSr(val: number): number {
  return Math.round(Math.max(SR_MIN_LIMIT, Math.min(SR_MAX_LIMIT, val)) * 100) / 100;
}

/**
 * Dual-thumb draggable Star Rating range bar (`srMin` — `srMax`).
 * Built on two labeled native `<input type="range">` controls to preserve
 * keyboard navigation, touch dragging, screen-reader `aria-valuetext`, and direct text typing.
 */
export const StarRatingDualSlider: React.FC = () => {
  const { trainingFilters, setStarRatingRange } = usePoolStore();
  const minInputId = useId();
  const maxInputId = useId();
  const trackWrapRef = useRef<HTMLDivElement | null>(null);
  const minInputRef = useRef<HTMLInputElement | null>(null);
  const maxInputRef = useRef<HTMLInputElement | null>(null);

  const [isEditingMin, setIsEditingMin] = useState(false);
  const [isEditingMax, setIsEditingMax] = useState(false);
  const [minInputVal, setMinInputVal] = useState('');
  const [maxInputVal, setMaxInputVal] = useState('');
  const minTextRef = useRef<HTMLInputElement | null>(null);
  const maxTextRef = useRef<HTMLInputElement | null>(null);

  const srMin = clampSr(trainingFilters.srMin);
  const srMax = clampSr(trainingFilters.srMax);
  const isFiltered =
    srMin > DEFAULT_TRAINING_FILTERS.srMin || srMax < DEFAULT_TRAINING_FILTERS.srMax;

  const minPct = ((srMin - SR_MIN_LIMIT) / (SR_MAX_LIMIT - SR_MIN_LIMIT)) * 100;
  const maxPct = ((srMax - SR_MIN_LIMIT) / (SR_MAX_LIMIT - SR_MIN_LIMIT)) * 100;

  const minBadgeBg = getStarRatingColor(Math.max(0.5, srMin));
  const minBadgeText = getStarRatingTextColor(Math.max(0.5, srMin));
  const maxBadgeBg = getStarRatingColor(srMax);
  const maxBadgeText = getStarRatingTextColor(srMax);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextMin = clampSr(Math.min(Number(e.target.value), srMax));
    setStarRatingRange(nextMin, srMax);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextMax = clampSr(Math.max(Number(e.target.value), srMin));
    setStarRatingRange(srMin, nextMax);
  };

  const startEditMin = () => {
    setMinInputVal(srMin.toFixed(2).replace('.', ','));
    setIsEditingMin(true);
    setTimeout(() => {
      minTextRef.current?.focus();
      minTextRef.current?.select();
    }, 10);
  };

  const commitMin = () => {
    setIsEditingMin(false);
    const parsed = parseFloat(minInputVal.replace(',', '.'));
    if (!isNaN(parsed)) {
      const nextMin = clampSr(Math.min(Math.max(SR_MIN_LIMIT, parsed), srMax));
      setStarRatingRange(nextMin, srMax);
    }
  };

  const startEditMax = () => {
    setMaxInputVal(srMax >= SR_MAX_LIMIT ? '12' : srMax.toFixed(2).replace('.', ','));
    setIsEditingMax(true);
    setTimeout(() => {
      maxTextRef.current?.focus();
      maxTextRef.current?.select();
    }, 10);
  };

  const commitMax = () => {
    setIsEditingMax(false);
    const parsed = parseFloat(maxInputVal.replace(',', '.'));
    if (!isNaN(parsed)) {
      const nextMax = clampSr(Math.max(Math.min(SR_MAX_LIMIT, parsed), srMin));
      setStarRatingRange(srMin, nextMax);
    }
  };

  // Allow clicking anywhere along the rail to snap the nearest thumb
  const handleRailPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLInputElement) return;
    const wrap = trackWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    if (rect.width <= 0) return;

    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const rawSr = SR_MIN_LIMIT + ratio * (SR_MAX_LIMIT - SR_MIN_LIMIT);
    const snappedSr = Math.round(rawSr / SR_STEP) * SR_STEP;
    const targetSr = clampSr(snappedSr);

    const distToMin = Math.abs(targetSr - srMin);
    const distToMax = Math.abs(targetSr - srMax);

    if (distToMin <= distToMax) {
      setStarRatingRange(Math.min(targetSr, srMax), srMax);
      minInputRef.current?.focus();
    } else {
      setStarRatingRange(srMin, Math.max(targetSr, srMin));
      maxInputRef.current?.focus();
    }
  };

  const minFormatted = `${srMin.toFixed(2).replace('.', ',')}★`;
  const maxFormatted =
    srMax >= SR_MAX_LIMIT ? `${SR_MAX_LIMIT.toFixed(1).replace('.', ',')}★+` : `${srMax.toFixed(2).replace('.', ',')}★`;

  return (
    <div className="osu-radar-dual-slider" data-filtered={isFiltered ? '1' : '0'}>
      {/* Left formatted value badge: direct click-to-edit support */}
      {isEditingMin ? (
        <input
          ref={minTextRef}
          type="text"
          className="osu-radar-dual-slider__badge osu-radar-dual-slider__badge--input"
          style={{ backgroundColor: minBadgeBg, color: minBadgeText }}
          value={minInputVal}
          onChange={(e) => setMinInputVal(e.target.value)}
          onBlur={commitMin}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitMin();
            if (e.key === 'Escape') setIsEditingMin(false);
          }}
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={startEditMin}
          className="osu-radar-dual-slider__badge osu-radar-dual-slider__badge--clickable"
          style={{ backgroundColor: minBadgeBg, color: minBadgeText }}
          title="Clique para digitar a dificuldade mínima"
        >
          {minFormatted}
        </button>
      )}

      {/* Dual native <input type="range"> track container */}
      <div
        ref={trackWrapRef}
        className="osu-radar-dual-slider__track-wrap"
        onPointerDown={handleRailPointerDown}
      >
        <div className="osu-radar-dual-slider__rail" aria-hidden="true">
          <div
            className="osu-radar-dual-slider__fill"
            style={{
              insetInlineStart: `${minPct}%`,
              inlineSize: `${Math.max(0, maxPct - minPct)}%`,
            }}
          />
        </div>

        <label htmlFor={minInputId} className="osu-radar-sr-only">
          Dificuldade mínima (estrelas)
        </label>
        <input
          ref={minInputRef}
          id={minInputId}
          type="range"
          min={SR_MIN_LIMIT}
          max={SR_MAX_LIMIT}
          step={SR_STEP}
          value={srMin}
          aria-valuetext={`Mínimo ${srMin.toFixed(2).replace('.', ',')} estrelas`}
          onChange={handleMinChange}
          className="osu-radar-dual-slider__input osu-radar-dual-slider__input--min"
          style={
            {
              '--attr-min': SR_MIN_LIMIT,
              '--attr-max': SR_MAX_LIMIT,
              '--control-value': srMin,
              zIndex: srMin > SR_MAX_LIMIT - 1.2 ? 5 : 3,
            } as React.CSSProperties
          }
        />

        <label htmlFor={maxInputId} className="osu-radar-sr-only">
          Dificuldade máxima (estrelas)
        </label>
        <input
          ref={maxInputRef}
          id={maxInputId}
          type="range"
          min={SR_MIN_LIMIT}
          max={SR_MAX_LIMIT}
          step={SR_STEP}
          value={srMax}
          aria-valuetext={
            srMax >= SR_MAX_LIMIT
              ? 'Máximo 12,00 estrelas ou mais'
              : `Máximo ${srMax.toFixed(2).replace('.', ',')} estrelas`
          }
          onChange={handleMaxChange}
          className="osu-radar-dual-slider__input osu-radar-dual-slider__input--max"
          style={
            {
              '--attr-min': SR_MIN_LIMIT,
              '--attr-max': SR_MAX_LIMIT,
              '--control-value': srMax,
              zIndex: 4,
            } as React.CSSProperties
          }
        />
      </div>

      {/* Right formatted value badge: direct click-to-edit support */}
      {isEditingMax ? (
        <input
          ref={maxTextRef}
          type="text"
          className="osu-radar-dual-slider__badge osu-radar-dual-slider__badge--input"
          style={{ backgroundColor: maxBadgeBg, color: maxBadgeText }}
          value={maxInputVal}
          onChange={(e) => setMaxInputVal(e.target.value)}
          onBlur={commitMax}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitMax();
            if (e.key === 'Escape') setIsEditingMax(false);
          }}
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={startEditMax}
          className="osu-radar-dual-slider__badge osu-radar-dual-slider__badge--clickable"
          style={{ backgroundColor: maxBadgeBg, color: maxBadgeText }}
          title="Clique para digitar a dificuldade máxima"
        >
          {maxFormatted}
        </button>
      )}

      {/* Stable Slot: Resetar ★ appears right beside max diff without pushing it to the side */}
      <div className="osu-radar-dual-slider__reset-slot">
        {isFiltered && (
          <button
            type="button"
            onClick={() =>
              setStarRatingRange(
                DEFAULT_TRAINING_FILTERS.srMin,
                DEFAULT_TRAINING_FILTERS.srMax
              )
            }
            className="osu-radar-player__mod-btn"
            style={{ padding: '2px 8px', fontSize: '10px', textTransform: 'none', flexShrink: 0 }}
            title="Remover limite de Star Rating (0,00★ – 12,0★+)"
          >
            <i className="fas fa-undo" style={{ marginRight: '4px' }} />
            Resetar ★
          </button>
        )}
      </div>
    </div>
  );
};
