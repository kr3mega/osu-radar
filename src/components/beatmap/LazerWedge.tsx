import React, { useState } from 'react';
import { BeatmapAnalysisResult, SkillAttributes } from '../../engine/types';
import { getStarRatingColor, getStarRatingTextColor, TOURNAMENT_MOD_COLORS } from '../../utils/osuColors';
import { OsuPreviewPlayer } from '../visualizer/OsuPreviewPlayer';
import { formatTimestamp } from '../../engine/strains';
import { buildBeatmapCoverCss } from '../../lib/osu-preview';

interface LazerWedgeProps {
  map: BeatmapAnalysisResult | null;
  siblingDifficulties?: BeatmapAnalysisResult[];
  poolAverageSkills?: SkillAttributes;
  onSlotChange?: (id: string, newSlot: string) => void;
  onSelectDifficulty?: (id: string) => void;
}

export const LazerWedge: React.FC<LazerWedgeProps> = ({
  map,
  siblingDifficulties,
  poolAverageSkills: _poolAverageSkills,
  onSlotChange: _onSlotChange,
  onSelectDifficulty,
}) => {
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState<boolean>(false);

  if (!map) {
    return (
      <div
        style={{
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: 'hsl(var(--hsl-b4))',
          color: 'hsl(var(--hsl-l1))',
        }}
      >
        <div style={{ fontSize: '32px', color: 'hsl(var(--hsl-h1))', marginBottom: '10px' }}>
          <i className="fas fa-compact-disc fa-spin" />
        </div>
        <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#fff' }}>
          Nenhum beatmap selecionado
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: 'hsl(var(--hsl-l2))' }}>
          Selecione um beatmap na listagem à direita para carregar as estatísticas oficiais e assistir ao preview.
        </p>
      </div>
    );
  }

  const { metadata, stats, difficulty, patterns = [], modSlot } = map;
  const isLocalSong = map.origin === 'local_songs';
  const coverCss = buildBeatmapCoverCss(map, 'cover');

  const starColor = getStarRatingColor(stats.starRating);
  const starTextColor = getStarRatingTextColor(stats.starRating);
  const modPrefix = (modSlot || 'NM').slice(0, 2).toUpperCase();
  const modColorConfig = isLocalSong
    ? { bg: 'hsl(var(--hsl-h1))', text: 'hsl(var(--hsl-b6))' }
    : TOURNAMENT_MOD_COLORS[modPrefix] || TOURNAMENT_MOD_COLORS.NM;

  const statRows = [
    { key: 'cs', label: 'Tam. Círculo (CS)', val: difficulty.cs, max: 10, isStar: false },
    { key: 'hp', label: 'Drenagem HP (HP)', val: difficulty.hp, max: 10, isStar: false },
    { key: 'od', label: 'Precisão (OD)', val: difficulty.od, max: 10, isStar: false },
    { key: 'ar', label: 'Aproximação (AR)', val: difficulty.ar, max: 10, isStar: false },
    { key: 'sr', label: 'Dificuldade (★)', val: stats.starRating, max: 10, isStar: true },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: '1 1 auto' }}>
      {/* Minimizable Song Information Card */}
      {isHeaderCollapsed ? (
        <div className="osu-skills-collapsed-header">
          {coverCss && (
            <div
              className="osu-skills-collapsed-header__cover-bg"
              style={{ backgroundImage: coverCss }}
            />
          )}
          <div className="osu-skills-collapsed-header__left">
            <div
              className="difficulty-badge difficulty-badge--beatmapset"
              style={
                {
                  '--bg': starColor,
                  color: starTextColor,
                  flexShrink: 0,
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

            <div className="osu-skills-collapsed-header__meta">
              <strong className="u-ellipsis-overflow" style={{ color: '#fff', fontSize: '13px' }}>
                {metadata.title}
              </strong>
              <span className="u-ellipsis-overflow" style={{ color: 'hsl(var(--hsl-l2))', fontSize: '11px' }}>
                {metadata.artist} [{metadata.version}]
              </span>
            </div>

            {!isLocalSong && (
              <span
                className="beatmapset-status beatmapset-status--show"
                style={{
                  backgroundColor: modColorConfig.bg,
                  color: modColorConfig.text,
                  fontWeight: 800,
                  fontSize: '10px',
                  padding: '1px 6px',
                  lineHeight: '16px',
                  marginLeft: '4px',
                }}
              >
                {modSlot || 'NM1'}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsHeaderCollapsed(false)}
            className="osu-skills-minimize-header-btn"
            title="Expandir informações da música"
          >
            <i className="fas fa-chevron-down" />
            <span>Expandir</span>
          </button>
        </div>
      ) : (
        /* Official ppy/osu-web .beatmapset-header (resources/js/beatmapsets-show/header.tsx) */
        <div className="beatmapset-header">
          <div className="beatmapset-header__cover">
            <div
              className="beatmapset-cover beatmapset-cover--full"
              style={
                coverCss
                  ? ({
                      '--bg': coverCss,
                      '--bg-2x': coverCss,
                    } as React.CSSProperties)
                  : undefined
              }
            />
          </div>

          {/* Left Box: Picker, Version, Title, Artist, Mapper, Actions */}
          <div className="beatmapset-header__box beatmapset-header__box--main">
            <div className="beatmapset-header__beatmap-picker-box">
              <div className="beatmapset-beatmap-picker">
                {(siblingDifficulties && siblingDifficulties.length > 0
                  ? siblingDifficulties
                  : [map]
                ).map((diffMap) => {
                  const diffColor = getStarRatingColor(diffMap.stats.starRating);
                  const isDiffActive = diffMap.id === map.id;
                  return (
                    <a
                      key={diffMap.id}
                      href={`#diff-${diffMap.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onSelectDifficulty?.(diffMap.id);
                      }}
                      className={`beatmapset-beatmap-picker__beatmap ${
                        isDiffActive ? 'beatmapset-beatmap-picker__beatmap--active' : ''
                      }`}
                      title={`${diffMap.metadata.version} (★ ${diffMap.stats.starRating
                        .toFixed(2)
                        .replace('.', ',')})`}
                    >
                      <div
                        className="beatmap-icon beatmap-icon--beatmapset"
                        style={{ '--diff': diffColor } as React.CSSProperties}
                      >
                        <i className="fal fa-extra-mode-osu" />
                      </div>
                    </a>
                  );
                })}
              </div>

              <span className="beatmapset-header__diff-name">
                <div
                  className="difficulty-badge difficulty-badge--beatmapset"
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
                </div>{' '}
                {metadata.version}
              </span>
            </div>

            <span className="beatmapset-header__details-text beatmapset-header__details-text--title">
              <span className="beatmapset-header__details-text-link">{metadata.title}</span>
            </span>

            <span className="beatmapset-header__details-text beatmapset-header__details-text--artist">
              <span className="beatmapset-header__details-text-link">{metadata.artist}</span>
            </span>

            {/* Action Buttons: Página Oficial first, Abrir no osu! second */}
            <div className="beatmapset-header__buttons" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              {(metadata.beatmapId || metadata.beatmapSetId) && (
                <a
                  href={
                    metadata.beatmapId
                      ? `https://osu.ppy.sh/b/${metadata.beatmapId}`
                      : `https://osu.ppy.sh/beatmapsets/${metadata.beatmapSetId}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-osu-big btn-osu-big--beatmapset-header"
                >
                  <div className="btn-osu-big__content">
                    <div className="btn-osu-big__left">
                      <span className="btn-osu-big__text-top">Página Oficial</span>
                      <span className="btn-osu-big__text-bottom">
                        osu.ppy.sh #{metadata.beatmapId || metadata.beatmapSetId}
                      </span>
                    </div>
                    <div className="btn-osu-big__icon">
                      <span className="fas fa-external-link-alt" />
                    </div>
                  </div>
                </a>
              )}

              {(metadata.beatmapId || metadata.beatmapSetId) && (
                <a
                  href={
                    metadata.beatmapId
                      ? `osulazer://b/${metadata.beatmapId}`
                      : `osulazer://s/${metadata.beatmapSetId}`
                  }
                  className="btn-osu-big btn-osu-big--beatmapset-header"
                  title="Selecionar este mapa diretamente dentro do cliente osu!lazer"
                >
                  <div className="btn-osu-big__content">
                    <div className="btn-osu-big__left">
                      <span className="btn-osu-big__text-top">Abrir no Lazer</span>
                      <span className="btn-osu-big__text-bottom">osu!lazer</span>
                    </div>
                    <div className="btn-osu-big__icon">
                      <span className="fas fa-play" />
                    </div>
                  </div>
                </a>
              )}

              {(metadata.beatmapId || metadata.beatmapSetId) && (
                <a
                  href={
                    metadata.beatmapId
                      ? `osu://b/${metadata.beatmapId}`
                      : `osu://s/${metadata.beatmapSetId}`
                  }
                  className="btn-osu-big btn-osu-big--beatmapset-header"
                  title="Selecionar este mapa diretamente dentro do cliente osu! (Stable)"
                >
                  <div className="btn-osu-big__content">
                    <div className="btn-osu-big__left">
                      <span className="btn-osu-big__text-top">Abrir no Stable</span>
                      <span className="btn-osu-big__text-bottom">osu!direct</span>
                    </div>
                    <div className="btn-osu-big__icon">
                      <span className="fas fa-gamepad" />
                    </div>
                  </div>
                </a>
              )}
            </div>
          </div>

          {/* Minimize header button anchored top-right */}
          <button
            type="button"
            onClick={() => setIsHeaderCollapsed(true)}
            className="osu-skills-minimize-header-btn"
            title="Minimizar informações da música"
          >
            <i className="fas fa-chevron-up" />
            <span>Minimizar</span>
          </button>

          {/* Right Box: Status Pill & Official .beatmapset-stats Table (resources/js/beatmapsets-show/stats.tsx) */}
          <div className="beatmapset-header__box beatmapset-header__box--stats">
            {!isLocalSong && (
              <div
                className="beatmapset-header__status"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <span
                  className="beatmapset-status beatmapset-status--show"
                  style={{
                    backgroundColor: modColorConfig.bg,
                    color: modColorConfig.text,
                    fontWeight: 800,
                  }}
                >
                  {modSlot || 'NM1'}
                </span>
              </div>
            )}

            <div className="beatmapset-stats">
              <div className="beatmapset-stats__row beatmapset-stats__row--basic">
                <div className="beatmap-basic-stats">
                  <div className="beatmap-basic-stats__entry" title="Duração Total (Drain Time)">
                    <div
                      className="beatmap-basic-stats__entry-icon"
                      style={{
                        backgroundImage: 'url(/images/layout/beatmapset-page/total_length.svg)',
                      }}
                    />
                    <span>{formatTimestamp(stats.drainTimeMs)}</span>
                  </div>

                  <div className="beatmap-basic-stats__entry" title="BPM">
                    <div
                      className="beatmap-basic-stats__entry-icon"
                      style={{
                        backgroundImage: 'url(/images/layout/beatmapset-page/bpm.svg)',
                      }}
                    />
                    <span>{stats.bpmMode}</span>
                  </div>

                  <div className="beatmap-basic-stats__entry" title="Contagem de Círculos">
                    <div
                      className="beatmap-basic-stats__entry-icon"
                      style={{
                        backgroundImage: 'url(/images/layout/beatmapset-page/count_circles.svg)',
                      }}
                    />
                    <span>{stats.circleCount}</span>
                  </div>

                  <div className="beatmap-basic-stats__entry" title="Contagem de Sliders">
                    <div
                      className="beatmap-basic-stats__entry-icon"
                      style={{
                        backgroundImage: 'url(/images/layout/beatmapset-page/count_sliders.svg)',
                      }}
                    />
                    <span>{stats.sliderCount}</span>
                  </div>
                </div>
              </div>

              <div className="beatmapset-stats__row beatmapset-stats__row--advanced">
                <table className="beatmap-stats-table">
                  <tbody>
                    {statRows.map((row) => {
                      const pct = Math.min(100, Math.max(0, (row.val / row.max) * 100));
                      return (
                        <tr key={row.key}>
                          <th className="beatmap-stats-table__label">{row.label}</th>
                          <td className="beatmap-stats-table__bar">
                            <div
                              className={`bar bar--beatmap-stats ${
                                row.isStar ? 'bar--beatmap-stats-stars' : ''
                              }`}
                              style={{ '--fill': `${pct}%` } as React.CSSProperties}
                            >
                              <div className="bar__fill" />
                            </div>
                          </td>
                          <td className="beatmap-stats-table__value">
                            {row.isStar
                              ? row.val.toFixed(2).replace('.', ',')
                              : row.val.toFixed(1).replace('.', ',')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Preview Player with Integrated Sub-Tabs (Padrões / Skills) */}
      <OsuPreviewPlayer map={map} patterns={patterns} />
    </div>
  );
};
