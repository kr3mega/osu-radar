import React, { useEffect, useState } from 'react';
import { BeatmapAnalysisResult } from '../../engine/types';
import { getStarRatingColor, getStarRatingTextColor, TOURNAMENT_MOD_COLORS } from '../../utils/osuColors';
import { formatTimestamp } from '../../engine/strains';
import {
  buildBeatmapCoverCss,
  previewAudioManager,
  PreviewAudioState,
} from '../../lib/osu-preview';
import { getEffectivePatternCounts } from '../../store/usePoolStore';

interface LazerCarouselItemProps {
  map: BeatmapAnalysisResult;
  isSelected: boolean;
  onSelect: () => void;
  onRemove?: () => void;
  deferred?: boolean;
}

/**
 * Authentic ppy/osu-web .beatmapset-panel (resources/js/beatmapset-panel/index.tsx)
 */
export const LazerCarouselItem: React.FC<LazerCarouselItemProps> = ({
  map,
  isSelected,
  onSelect,
  onRemove,
  deferred = false,
}) => {
  const { metadata, stats, difficulty, modSlot, topSkills, skills } = map;
  const isLocalSong = map.origin === 'local_songs';
  const patternCounts = getEffectivePatternCounts(map);

  const [audioState, setAudioState] = useState<PreviewAudioState>('stopped');
  const [audioProgress, setAudioProgress] = useState<number>(0);

  useEffect(() => {
    return previewAudioManager.subscribe((snap) => {
      if (snap.activeMapId === map.id) {
        setAudioState(snap.state);
        setAudioProgress(snap.progress);
      } else {
        setAudioState('stopped');
        setAudioProgress(0);
      }
    });
  }, [map.id]);

  const listCoverCss = buildBeatmapCoverCss(map, 'list');
  const listCover2xCss = buildBeatmapCoverCss(map, 'list@2x') || listCoverCss;
  const cardCoverCss = buildBeatmapCoverCss(map, 'card');
  const cardCover2xCss = buildBeatmapCoverCss(map, 'card@2x') || cardCoverCss;

  const starColor = getStarRatingColor(stats.starRating);
  const starTextColor = getStarRatingTextColor(stats.starRating);

  const modPrefix = (modSlot || 'NM').slice(0, 2).toUpperCase();
  const modColorConfig = isLocalSong
    ? { bg: 'hsl(var(--hsl-h1))', text: 'hsl(var(--hsl-b6))' }
    : TOURNAMENT_MOD_COLORS[modPrefix] || TOURNAMENT_MOD_COLORS.NM;
  const badgeLabel = isLocalSong ? 'OSU!' : modSlot || 'NM1';

  const handleTogglePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    previewAudioManager.toggle(map);
  };

  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      tabIndex={0}
      role="option"
      aria-selected={isSelected}
      data-audio-state={audioState}
      data-audio-over50={audioProgress > 0.5 ? '1' : '0'}
      style={{ '--progress': audioProgress } as React.CSSProperties}
      className={`beatmapset-panel beatmapset-panel--size-normal ${
        isSelected ? 'beatmapset-panel--selected' : ''
      } ${deferred ? 'osu-radar-card-deferred' : ''}`}
    >
      {/* Dual-Column Cover Container (exact osu-web structure) */}
      <div className="beatmapset-panel__cover-container">
        <div className="beatmapset-panel__cover-col beatmapset-panel__cover-col--play">
          <div
            className="beatmapset-cover beatmapset-cover--full"
            style={
              listCoverCss
                ? ({
                    '--bg': listCoverCss,
                    '--bg-2x': listCover2xCss,
                  } as React.CSSProperties)
                : undefined
            }
          />
        </div>
        <div className="beatmapset-panel__cover-col beatmapset-panel__cover-col--info">
          <div
            className="beatmapset-cover beatmapset-cover--full"
            style={
              cardCoverCss
                ? ({
                    '--bg': cardCoverCss,
                    '--bg-2x': cardCover2xCss,
                  } as React.CSSProperties)
                : undefined
            }
          />
        </div>
      </div>

      {/* Main Content (Play Area + Info Area + Menu Area) */}
      <div className="beatmapset-panel__content">
        {/* Left Play Area (Official osu-web audio preview button + circular progress) */}
        <div className="beatmapset-panel__play-container">
          {audioState === 'playing' && (
            <div className="beatmapset-panel__play-progress">
              <div className="circular-progress circular-progress--beatmapset-panel">
                <div className="circular-progress__slice">
                  <div className="circular-progress__circle" />
                  <div className="circular-progress__circle circular-progress__circle--fill" />
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            className="beatmapset-panel__play"
            onClick={handleTogglePreview}
            title={
              audioState === 'playing' || audioState === 'loading'
                ? 'Pausar preview da música'
                : 'Ouvir preview da música'
            }
          >
            {audioState === 'loading' ? (
              <span className="fas fa-circle-notch fa-spin" />
            ) : (
              <span className="play-button" />
            )}
          </button>

          <div className="beatmapset-panel__play-icons">
            <span
              className="osu-radar-mod-pill"
              style={{
                backgroundColor: modColorConfig.bg,
                color: modColorConfig.text,
              }}
            >
              {badgeLabel}
            </span>
          </div>
        </div>

        {/* Center Info Area */}
        <div className="beatmapset-panel__info">
          {/* Row 1: Title + Star Rating Badge */}
          <div className="beatmapset-panel__info-row beatmapset-panel__info-row--title">
            <span className="beatmapset-panel__main-link u-ellipsis-overflow">
              {metadata.title}
            </span>
            <div className="beatmapset-panel__badge-container">
              <div
                className="difficulty-badge"
                style={
                  {
                    '--bg': starColor,
                    color: starTextColor,
                  } as React.CSSProperties
                }
              >
                <span className="difficulty-badge__icon">
                  <span className="fas fa-star" />
                </span>
                <span className="difficulty-badge__rating">
                  {stats.starRating.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>

          {/* Row 2: Artist */}
          <div className="beatmapset-panel__info-row beatmapset-panel__info-row--artist">
            <span className="beatmapset-panel__main-link u-ellipsis-overflow">
              por {metadata.artist}
            </span>
          </div>

          {/* Row 3: Mapper & Version */}
          <div className="beatmapset-panel__info-row beatmapset-panel__info-row--mapper">
            <div className="u-ellipsis-overflow">
              mapeado por{' '}
              <span className="beatmapset-panel__mapper-link" style={{ color: 'hsl(var(--hsl-l1))' }}>
                {metadata.creator}
              </span>
              {' · '}
              <span style={{ color: '#fff' }}>[{metadata.version}]</span>
            </div>
          </div>

          {/* Row 4: Hover Stats (BPM, Drain Time, CS/AR/OD) */}
          <div className="beatmapset-panel__info-row beatmapset-panel__info-row--stats">
            <div
              className="beatmapset-panel__stats-item beatmapset-panel__stats-item--play-count"
              title="BPM"
            >
              <span className="beatmapset-panel__stats-item-icon">
                <i className="fa-fw fas fa-tachometer-alt" />
              </span>
              <span>{stats.bpmMode} BPM</span>
            </div>

            <div
              className="beatmapset-panel__stats-item beatmapset-panel__stats-item--favourite-count"
              title="Duração"
            >
              <span className="beatmapset-panel__stats-item-icon">
                <i className="fa-fw fas fa-clock" />
              </span>
              <span>{formatTimestamp(stats.drainTimeMs)}</span>
            </div>

            <div
              className="beatmapset-panel__stats-item beatmapset-panel__stats-item--date"
              title="Atributos Físicos"
            >
              <span className="beatmapset-panel__stats-item-icon">
                <i className="fa-fw fas fa-sliders-h" />
              </span>
              <span>
                CS {difficulty.cs.toFixed(1).replace('.', ',')} · AR{' '}
                {difficulty.ar.toFixed(1).replace('.', ',')} · OD{' '}
                {difficulty.od.toFixed(1).replace('.', ',')}
              </span>
            </div>
          </div>

          {/* Row 5: Status Pill + Official Mode Icon + Difficulty Dot + Dominant Skills */}
          <div className="beatmapset-panel__info-row beatmapset-panel__info-row--extra">
            <div className="beatmapset-panel__extra-item">
              <div
                className="beatmapset-status beatmapset-status--panel"
                style={{
                  backgroundColor: modColorConfig.bg,
                  color: modColorConfig.text,
                }}
                title={isLocalSong ? 'Instalado localmente na pasta Songs do osu!' : undefined}
              >
                {isLocalSong ? 'LOCAL' : modSlot || 'NM1'}
              </div>
            </div>

            <div className="beatmapset-panel__extra-item beatmapset-panel__extra-item--dots">
              <div
                className="beatmapset-panel__beatmap-icon"
                style={{ color: starColor }}
                title="osu!standard"
              >
                <i className="fal fa-extra-mode-osu" />
              </div>
              <div
                className="beatmapset-panel__beatmap-dot"
                style={{ '--bg': starColor } as React.CSSProperties}
              />
            </div>

            {isLocalSong && (patternCounts.streams > 0 || patternCounts.jumps > 0) && (
              <div className="beatmapset-panel__extra-item">
                <div
                  className="beatmapset-status beatmapset-status--panel"
                  style={{
                    backgroundColor: 'hsl(var(--hsl-b4))',
                    color: 'hsl(var(--hsl-l1))',
                  }}
                  title={`Streams: ${patternCounts.streams} (${patternCounts.streamNotes} notas) • Jumps: ${patternCounts.jumps} • Bursts: ${patternCounts.bursts} • Tech: ${patternCounts.tech}`}
                >
                  S:{patternCounts.streams} · J:{patternCounts.jumps} · B:{patternCounts.bursts}
                </div>
              </div>
            )}

            {map.stageName && (
              <div className="beatmapset-panel__extra-item">
                <div
                  className="beatmapset-status beatmapset-status--panel"
                  style={{
                    backgroundColor: 'hsl(var(--hsl-b3))',
                    color: 'hsl(var(--hsl-h1))',
                    fontWeight: 700,
                  }}
                  title={map.tournamentName ? `${map.tournamentName} • ${map.stageName}` : `Etapa: ${map.stageName}`}
                >
                  <i className="fas fa-layer-group" style={{ marginRight: '4px', fontSize: '9px' }} />
                  {map.stageName}
                </div>
              </div>
            )}

            {map.tournamentName && (
              <div className="beatmapset-panel__extra-item">
                <div
                  className="beatmapset-status beatmapset-status--panel"
                  style={{
                    backgroundColor: 'hsl(var(--hsl-b4))',
                    color: 'hsl(var(--hsl-l1))',
                  }}
                  title={`Torneio: ${map.tournamentName}`}
                >
                  <i className="fas fa-trophy" style={{ marginRight: '4px', fontSize: '9px', color: '#e5b32e' }} />
                  {map.tournamentName}
                </div>
              </div>
            )}

            {topSkills.slice(0, 2).map((skillKey) => (
              <div key={skillKey} className="beatmapset-panel__extra-item">
                <div
                  className="beatmapset-status beatmapset-status--panel"
                  style={
                    {
                      '--bg-hsl': 'var(--hsl-b5)',
                      '--colour': 'hsl(var(--hsl-c1))',
                    } as React.CSSProperties
                  }
                >
                  {skillKey}: {skills[skillKey].toFixed(1).replace('.', ',')}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Slide-Out Menu Area */}
        <div className="beatmapset-panel__menu-container">
          <div className="beatmapset-panel__menu">
            {(metadata.beatmapId || metadata.beatmapSetId) && (
              <a
                className="beatmapset-panel__menu-item"
                href={
                  metadata.beatmapId
                    ? `osu://b/${metadata.beatmapId}`
                    : `osu://s/${metadata.beatmapSetId}`
                }
                onClick={(e) => e.stopPropagation()}
                title="Abrir direto no osu! (osu!direct)"
              >
                <span className="fas fa-gamepad" />
              </a>
            )}

            {(metadata.beatmapId || metadata.beatmapSetId) && (
              <a
                className="beatmapset-panel__menu-item"
                href={
                  metadata.beatmapId
                    ? `https://osu.ppy.sh/b/${metadata.beatmapId}`
                    : `https://osu.ppy.sh/beatmapsets/${metadata.beatmapSetId}`
                }
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Abrir no osu.ppy.sh"
              >
                <span className="fas fa-external-link-alt" />
              </a>
            )}

            {onRemove && (
              <button
                type="button"
                className="beatmapset-panel__menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                title="Remover mapa da pool"
              >
                <span className="fas fa-trash" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
