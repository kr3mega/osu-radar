import React, { useMemo, useState } from 'react';
import { BeatmapAnalysisResult, SkillAttributes } from '../../engine/types';
import { getStarRatingColor, getStarRatingTextColor, TOURNAMENT_MOD_COLORS } from '../../utils/osuColors';
import { OsuPreviewPlayer } from '../visualizer/OsuPreviewPlayer';
import { formatTimestamp } from '../../engine/strains';
import { buildBeatmapCoverCss } from '../../lib/osu-preview';
import {
  ALL_SKILL_KEYS,
  formatSkillLabel,
  getSkillValue,
  SKILL_SHORT_LABELS,
} from '../../utils/skillLabels';

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
  const [hoveredDiffId, setHoveredDiffId] = useState<string | null>(null);

  if (!map) {
    return (
      <div
        className="osu-skills-empty-wedge"
        style={{
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: 'hsl(var(--hsl-b4))',
          color: 'hsl(var(--hsl-l1))',
          borderRadius: 'var(--border-radius--large, 10px)',
          border: '1px solid hsl(var(--hsl-b3))',
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

  const { metadata, stats, patterns = [], modSlot } = map;
  const isLocalSong = map.origin === 'local_songs';
  const coverCss = buildBeatmapCoverCss(map, 'cover');

  // Preview difficulty on hover over picker circles (snaps back to selected map on mouse leave)
  // Only the diff name and star badge preview on hover; statistics table stays with the selected map.
  const previewDiff =
    (hoveredDiffId && siblingDifficulties?.find((d) => d.id === hoveredDiffId)) || map;
  const previewStats = previewDiff.stats;
  const previewStarColor = getStarRatingColor(previewStats.starRating);
  const previewStarTextColor = getStarRatingTextColor(previewStats.starRating);

  const starColor = getStarRatingColor(stats.starRating);
  const starTextColor = getStarRatingTextColor(stats.starRating);
  const modPrefix = (modSlot || 'NM').slice(0, 2).toUpperCase();
  const modColorConfig = isLocalSong
    ? { bg: 'hsl(var(--hsl-h1))', text: 'hsl(var(--hsl-b6))' }
    : TOURNAMENT_MOD_COLORS[modPrefix] || TOURNAMENT_MOD_COLORS.NM;

  const statRows = [
    { key: 'cs', label: 'CS', val: map.difficulty.cs, max: 10, isStar: false },
    { key: 'hp', label: 'HP', val: map.difficulty.hp, max: 10, isStar: false },
    { key: 'ar', label: 'AR', val: map.difficulty.ar, max: 10, isStar: false },
    { key: 'sr', label: 'SR', val: stats.starRating, max: 10, isStar: true },
  ];

  const topTwoSkills = useMemo(() => {
    if (!map || !map.skills) return [];
    const scored = ALL_SKILL_KEYS.map((k) => ({
      key: k,
      val: getSkillValue(map.skills, k),
    }));
    scored.sort((a, b) => b.val - a.val);
    return scored.slice(0, 2);
  }, [map]);

  return (
    <div className="osu-skills-wedge-container">
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
            <span>Expandir</span>
            <i className="fas fa-chevron-down" />
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
            {/* 1. Difficulty picker circles */}
            <div className="beatmapset-header__beatmap-picker-box">
              <div
                className="beatmapset-beatmap-picker"
                onMouseLeave={() => setHoveredDiffId(null)}
              >
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
                      onMouseEnter={() => setHoveredDiffId(diffMap.id)}
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
            </div>

            {/* 2. Star Rating badge + Diff name (strictly below the circles, directly above Title) */}
            <div className="beatmapset-header__diff-name">
              <div
                className="difficulty-badge difficulty-badge--beatmapset"
                style={
                  {
                    '--bg': previewStarColor,
                    color: previewStarTextColor,
                  } as React.CSSProperties
                }
              >
                <span className="difficulty-badge__icon">
                  <span className="fas fa-star" />
                </span>
                <span className="difficulty-badge__rating">
                  {previewStats.starRating.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <span>{previewDiff.metadata.version}</span>
            </div>

            {/* 3. Title */}
            <span className="beatmapset-header__details-text beatmapset-header__details-text--title">
              <span className="beatmapset-header__details-text-link">{metadata.title}</span>
            </span>

            {/* 4. Artist */}
            <span className="beatmapset-header__details-text beatmapset-header__details-text--artist">
              <span className="beatmapset-header__details-text-link">{metadata.artist}</span>
            </span>

            {/* 5. Action Buttons: Página Oficial first, Abrir no Jogo to its right */}
            <div className="beatmapset-header__buttons">
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
                  title="Abrir página oficial do beatmap no osu.ppy.sh"
                >
                  <div className="btn-osu-big__content">
                    <div className="btn-osu-big__left">
                      <span className="btn-osu-big__text-top">Página Oficial</span>
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
                      ? `osu://b/${metadata.beatmapId}`
                      : `osu://s/${metadata.beatmapSetId}`
                  }
                  className="btn-osu-big btn-osu-big--beatmapset-header"
                  title="Selecionar este mapa diretamente dentro do jogo osu!"
                >
                  <div className="btn-osu-big__content">
                    <div className="btn-osu-big__left">
                      <span className="btn-osu-big__text-top">Abrir no Jogo</span>
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
            <span>Minimizar</span>
            <i className="fas fa-chevron-up" />
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

                {/* Last line: Top 2 skills integrated discreetly into the stats panel */}
                {topTwoSkills.length > 0 && (
                  <div
                    className="beatmapset-stats__skills-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '6px',
                      marginTop: '6px',
                      paddingTop: '6px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    {topTwoSkills.map((sk) => {
                      const label = (SKILL_SHORT_LABELS[sk.key] || formatSkillLabel(sk.key)).toUpperCase();
                      return (
                        <div
                          key={sk.key}
                          className="beatmapset-stats__skill-pill"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(0, 0, 0, 0.25)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            fontSize: '10.5px',
                            lineHeight: '15px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span
                            className="beatmapset-stats__skill-label"
                            style={{
                              color: 'hsl(var(--hsl-l1))',
                              fontWeight: 700,
                              letterSpacing: '0.03em',
                            }}
                          >
                            {label}:
                          </span>
                          <span
                            className="beatmapset-stats__skill-value"
                            style={{
                              color: '#ffffff',
                              fontWeight: 800,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {sk.val.toFixed(1).replace('.', ',')}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
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
