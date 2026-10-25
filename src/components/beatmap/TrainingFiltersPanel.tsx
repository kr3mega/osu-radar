import React, { useState } from 'react';
import {
  countActiveTrainingFilters,
  DEFAULT_TRAINING_FILTERS,
  PatternDensityFilter,
  TRAINING_PRESETS,
  usePoolStore,
} from '../../store/usePoolStore';

const DENSITY_OPTIONS: Array<{ value: PatternDensityFilter; label: string; hint: string }> = [
  { value: 'any', label: 'Qualquer', hint: 'Sem restrição' },
  { value: 'none', label: 'Zero (0)', hint: 'Nenhuma ocorrência no mapa' },
  { value: 'low', label: 'Pouco', hint: 'Poucas ocorrências (0–2)' },
  { value: 'medium', label: 'Médio', hint: 'Quantidade moderada' },
  { value: 'high', label: 'Muito', hint: 'Alta concentração desse padrão' },
];

export const TrainingFiltersPanel: React.FC = () => {
  const {
    trainingFilters,
    activeTrainingPreset,
    setTrainingFilters,
    applyTrainingPreset,
    resetTrainingFilters,
  } = usePoolStore();

  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const activeCount = countActiveTrainingFilters(trainingFilters);

  const durationProgressPct = Math.round(
    ((trainingFilters.durationMinSec - 0) / Math.max(1, 300 - 0)) * 100
  );

  return (
    <>
      {/* 1-Click Training Focus Row inside .beatmapsets-search__filter-grid */}
      <div className="beatmapsets-search-filter beatmapsets-search-filter--grid">
        <span className="beatmapsets-search-filter__header">Treino</span>
        <div
          className="beatmapsets-search-filter__items"
          style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 10px' }}
        >
          <a
            href="#preset-none"
            onClick={(e) => {
              e.preventDefault();
              resetTrainingFilters();
            }}
            className={`beatmapsets-search-filter__item ${
              !activeTrainingPreset && activeCount === 0
                ? 'beatmapsets-search-filter__item--active'
                : ''
            }`}
          >
            Livre
          </a>

          {TRAINING_PRESETS.map((preset) => {
            const isSelected = activeTrainingPreset === preset.id;
            return (
              <a
                key={preset.id}
                href={`#preset-${preset.id}`}
                title={preset.description}
                onClick={(e) => {
                  e.preventDefault();
                  applyTrainingPreset(preset.id);
                }}
                className={`beatmapsets-search-filter__item ${
                  isSelected ? 'beatmapsets-search-filter__item--active' : ''
                }`}
              >
                <i
                  className={preset.icon}
                  style={{ marginRight: '5px', fontSize: '10px', opacity: 0.9 }}
                />
                {preset.label}
              </a>
            );
          })}

          <button
            type="button"
            onClick={() => setIsAdvancedOpen((v) => !v)}
            className={`osu-radar-player__mod-btn ${
              isAdvancedOpen || activeCount > 0 ? 'osu-radar-player__mod-btn--active' : ''
            }`}
            style={{ marginLeft: '4px', padding: '3px 10px', fontSize: '11px', textTransform: 'none' }}
          >
            <i className="fas fa-sliders-h" style={{ marginRight: '5px' }} />
            Mais/Menos Padrões & ★/BPM
            {activeCount > 0 ? ` (${activeCount})` : ''}
            <i
              className={`fas fa-chevron-${isAdvancedOpen ? 'up' : 'down'}`}
              style={{ marginLeft: '5px', fontSize: '9px' }}
            />
          </button>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={resetTrainingFilters}
              className="osu-radar-player__mod-btn"
              style={{ padding: '3px 9px', fontSize: '11px', textTransform: 'none' }}
              title="Resetar todos os filtros de treino"
            >
              <i className="fas fa-undo" style={{ marginRight: '4px' }} />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Expandable Granular Training & Pattern Density Panel */}
      {isAdvancedOpen && (
        <div className="osu-radar-training-panel osu-radar-training-form">
          {/* Sub-section 1: Mais / Menos Padrões Mecânicos */}
          <div className="osu-radar-training-panel__section">
            <div className="osu-radar-training-panel__title">
              <i className="fas fa-wave-square" style={{ color: 'hsl(var(--hsl-h1))' }} />
              <span>Quantidade de Padrões no Mapa (Mais / Menos)</span>
            </div>

            <div className="osu-radar-training-panel__density-grid">
              {(
                [
                  {
                    key: 'streamsDensity' as const,
                    label: 'Streams & Deathstreams',
                    icon: 'fas fa-water',
                  },
                  {
                    key: 'jumpsDensity' as const,
                    label: 'Jumps (Snap / Aim)',
                    icon: 'fas fa-crosshairs',
                  },
                  {
                    key: 'burstsDensity' as const,
                    label: 'Bursts (3–8 notas)',
                    icon: 'fas fa-bolt',
                  },
                  {
                    key: 'techDensity' as const,
                    label: 'Tech / SV / Ritmo',
                    icon: 'fas fa-random',
                  },
                ] as const
              ).map((row) => (
                <div key={row.key} className="osu-radar-training-panel__density-row">
                  <span className="osu-radar-training-panel__density-label">
                    <i className={row.icon} style={{ width: '14px', color: 'hsl(var(--hsl-c1))' }} />
                    {row.label}
                  </span>
                  <div className="osu-radar-player__mods-group" style={{ flexWrap: 'wrap' }}>
                    {DENSITY_OPTIONS.map((opt) => {
                      const active = trainingFilters[row.key] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          title={opt.hint}
                          onClick={() => setTrainingFilters({ [row.key]: opt.value })}
                          className={`osu-radar-player__mod-btn ${
                            active ? 'osu-radar-player__mod-btn--active' : ''
                          }`}
                          style={{ textTransform: 'none', fontSize: '11px', padding: '3px 9px' }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sub-section 2: Star Rating, BPM, OD, AR, CS & Duração */}
          <div className="osu-radar-training-panel__section">
            <div className="osu-radar-training-panel__title">
              <i className="fas fa-tachometer-alt" style={{ color: 'hsl(var(--hsl-h1))' }} />
              <span>Faixas de Estrelas (★), BPM, Precisão (OD) & Atributos Físicos</span>
            </div>

            <div className="osu-radar-training-panel__ranges-grid">
              {/* Star Rating */}
              <div className="osu-radar-range-field">
                <label className="osu-radar-range-field__label">Dificuldade (★)</label>
                <div className="osu-radar-range-field__inputs">
                  <input
                    type="number"
                    min={0}
                    max={12}
                    step={0.1}
                    aria-label="Estrelas mínimas"
                    value={trainingFilters.srMin}
                    onChange={(e) =>
                      setTrainingFilters({
                        srMin: Math.max(0, Math.min(trainingFilters.srMax, Number(e.target.value) || 0)),
                      })
                    }
                  />
                  <span>até</span>
                  <input
                    type="number"
                    min={0}
                    max={15}
                    step={0.1}
                    aria-label="Estrelas máximas"
                    value={trainingFilters.srMax}
                    onChange={(e) =>
                      setTrainingFilters({
                        srMax: Math.max(trainingFilters.srMin, Number(e.target.value) || 12),
                      })
                    }
                  />
                </div>
              </div>

              {/* BPM */}
              <div className="osu-radar-range-field">
                <label className="osu-radar-range-field__label">BPM Principal</label>
                <div className="osu-radar-range-field__inputs">
                  <input
                    type="number"
                    min={0}
                    max={400}
                    step={5}
                    aria-label="BPM mínimo"
                    value={trainingFilters.bpmMin}
                    onChange={(e) =>
                      setTrainingFilters({
                        bpmMin: Math.max(0, Math.min(trainingFilters.bpmMax, Number(e.target.value) || 0)),
                      })
                    }
                  />
                  <span>até</span>
                  <input
                    type="number"
                    min={30}
                    max={500}
                    step={5}
                    aria-label="BPM máximo"
                    value={trainingFilters.bpmMax}
                    onChange={(e) =>
                      setTrainingFilters({
                        bpmMax: Math.max(trainingFilters.bpmMin, Number(e.target.value) || 400),
                      })
                    }
                  />
                </div>
              </div>

              {/* OD (Accuracy) */}
              <div className="osu-radar-range-field">
                <label className="osu-radar-range-field__label">Precisão (OD)</label>
                <div className="osu-radar-range-field__inputs">
                  <input
                    type="number"
                    min={0}
                    max={11}
                    step={0.5}
                    aria-label="OD mínimo"
                    value={trainingFilters.odMin}
                    onChange={(e) =>
                      setTrainingFilters({
                        odMin: Math.max(0, Math.min(trainingFilters.odMax, Number(e.target.value) || 0)),
                      })
                    }
                  />
                  <span>até</span>
                  <input
                    type="number"
                    min={0}
                    max={11}
                    step={0.5}
                    aria-label="OD máximo"
                    value={trainingFilters.odMax}
                    onChange={(e) =>
                      setTrainingFilters({
                        odMax: Math.max(trainingFilters.odMin, Number(e.target.value) || 11),
                      })
                    }
                  />
                </div>
              </div>

              {/* AR */}
              <div className="osu-radar-range-field">
                <label className="osu-radar-range-field__label">Aproximação (AR)</label>
                <div className="osu-radar-range-field__inputs">
                  <input
                    type="number"
                    min={0}
                    max={11}
                    step={0.5}
                    aria-label="AR mínimo"
                    value={trainingFilters.arMin}
                    onChange={(e) =>
                      setTrainingFilters({
                        arMin: Math.max(0, Math.min(trainingFilters.arMax, Number(e.target.value) || 0)),
                      })
                    }
                  />
                  <span>até</span>
                  <input
                    type="number"
                    min={0}
                    max={11}
                    step={0.5}
                    aria-label="AR máximo"
                    value={trainingFilters.arMax}
                    onChange={(e) =>
                      setTrainingFilters({
                        arMax: Math.max(trainingFilters.arMin, Number(e.target.value) || 11),
                      })
                    }
                  />
                </div>
              </div>

              {/* CS */}
              <div className="osu-radar-range-field">
                <label className="osu-radar-range-field__label">Tamanho (CS)</label>
                <div className="osu-radar-range-field__inputs">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    aria-label="CS mínimo"
                    value={trainingFilters.csMin}
                    onChange={(e) =>
                      setTrainingFilters({
                        csMin: Math.max(0, Math.min(trainingFilters.csMax, Number(e.target.value) || 0)),
                      })
                    }
                  />
                  <span>até</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    aria-label="CS máximo"
                    value={trainingFilters.csMax}
                    onChange={(e) =>
                      setTrainingFilters({
                        csMax: Math.max(trainingFilters.csMin, Number(e.target.value) || 10),
                      })
                    }
                  />
                </div>
              </div>

              {/* Minimum Drain Duration Slider */}
              <div className="osu-radar-range-field">
                <label
                  htmlFor="training-min-duration-range"
                  className="osu-radar-range-field__label"
                >
                  Duração Mín.:{' '}
                  <strong style={{ color: '#fff' }}>
                    {trainingFilters.durationMinSec > 0
                      ? `${Math.floor(trainingFilters.durationMinSec / 60)}m${(
                          trainingFilters.durationMinSec % 60
                        )
                          .toString()
                          .padStart(2, '0')}s`
                      : 'Qualquer'}
                  </strong>
                </label>
                <input
                  id="training-min-duration-range"
                  type="range"
                  min={0}
                  max={300}
                  step={15}
                  value={trainingFilters.durationMinSec}
                  style={{ '--progress': `${durationProgressPct}%` } as React.CSSProperties}
                  onChange={(e) =>
                    setTrainingFilters({
                      durationMinSec: Number(e.target.value) || DEFAULT_TRAINING_FILTERS.durationMinSec,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
