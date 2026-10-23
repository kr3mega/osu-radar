import React from 'react';
import { BeatmapAnalysisResult } from '../../engine/types';
import { getStarRatingColor, getStarRatingTextColor, TOURNAMENT_MOD_COLORS } from '../../utils/osuColors';
import { formatTimestamp } from '../../engine/strains';

interface LazerCarouselItemProps {
  map: BeatmapAnalysisResult;
  isSelected: boolean;
  onSelect: () => void;
  onRemove?: () => void;
}

/**
 * Authentic ppy/osu-web .beatmapset-panel (resources/js/beatmapset-panel/index.tsx)
 */
export const LazerCarouselItem: React.FC<LazerCarouselItemProps> = ({
  map,
  isSelected,
  onSelect,
  onRemove,
}) => {
  const { metadata, stats, difficulty, modSlot, topSkills, skills } = map;

  const listCoverUrl = metadata.beatmapSetId
    ? `https://assets.ppy.sh/beatmaps/${metadata.beatmapSetId}/covers/list.jpg`
    : null;
  const listCover2xUrl = metadata.beatmapSetId
    ? `https://assets.ppy.sh/beatmaps/${metadata.beatmapSetId}/covers/list@2x.jpg`
    : null;
  const cardCoverUrl = metadata.beatmapSetId
    ? `https://assets.ppy.sh/beatmaps/${metadata.beatmapSetId}/covers/card.jpg`
    : null;
  const cardCover2xUrl = metadata.beatmapSetId
    ? `https://assets.ppy.sh/beatmaps/${metadata.beatmapSetId}/covers/card@2x.jpg`
    : null;

  const starColor = getStarRatingColor(stats.starRating);
  const starTextColor = getStarRatingTextColor(stats.starRating);

  const modPrefix = (modSlot || 'NM').slice(0, 2).toUpperCase();
  const modColorConfig = TOURNAMENT_MOD_COLORS[modPrefix] || TOURNAMENT_MOD_COLORS.NM;

  return (
    <div
      onClick={onSelect}
      className={`beatmapset-panel beatmapset-panel--size-normal ${
        isSelected ? 'beatmapset-panel--selected' : ''
      }`}
    >
      {/* Dual-Column Cover Container (exact osu-web structure) */}
      <div className="beatmapset-panel__cover-container">
        <div className="beatmapset-panel__cover-col beatmapset-panel__cover-col--play">
          <div
            className="beatmapset-cover beatmapset-cover--full"
            style={
              listCoverUrl
                ? ({
                    '--bg': `url("${listCoverUrl}")`,
                    '--bg-2x': `url("${listCover2xUrl || listCoverUrl}")`,
                  } as React.CSSProperties)
                : undefined
            }
          />
        </div>
        <div className="beatmapset-panel__cover-col beatmapset-panel__cover-col--info">
          <div
            className="beatmapset-cover beatmapset-cover--full"
            style={
              cardCoverUrl
                ? ({
                    '--bg': `url("${cardCoverUrl}")`,
                    '--bg-2x': `url("${cardCover2xUrl || cardCoverUrl}")`,
                  } as React.CSSProperties)
                : undefined
            }
          />
        </div>
      </div>

      {/* Main Content (Play Area + Info Area + Menu Area) */}
      <div className="beatmapset-panel__content">
        {/* Left Play Area */}
        <div className="beatmapset-panel__play-container">
          <button
            type="button"
            className="beatmapset-panel__play"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            title="Selecionar e abrir no Visualizador"
          >
            <span className="fas fa-play" />
          </button>

          <div className="beatmapset-panel__play-icons">
            <span
              className="osu-radar-mod-pill"
              style={{
                backgroundColor: modColorConfig.bg,
                color: modColorConfig.text,
              }}
            >
              {modSlot || 'NM1'}
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
              >
                {modSlot || 'NM1'}
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
            {metadata.beatmapId && (
              <a
                className="beatmapset-panel__menu-item"
                href={`https://osu.ppy.sh/b/${metadata.beatmapId}`}
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
