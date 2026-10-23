import React, { useState } from 'react';
import { BeatmapAnalysisResult, SkillAttributes } from '../../engine/types';
import { getStarRatingColor, getStarRatingTextColor, TOURNAMENT_MOD_COLORS } from '../../utils/osuColors';
import { ModSlotBadge } from './ModSlotBadge';
import { StatHexagon } from '../charts/StatHexagon';
import { OsuPreviewPlayer } from '../visualizer/OsuPreviewPlayer';
import { formatTimestamp } from '../../engine/strains';

interface LazerWedgeProps {
  map: BeatmapAnalysisResult | null;
  poolAverageSkills?: SkillAttributes;
  onSlotChange?: (id: string, newSlot: string) => void;
}

export const LazerWedge: React.FC<LazerWedgeProps> = ({
  map,
  poolAverageSkills,
  onSlotChange,
}) => {
  const [activeWedgeTab, setActiveWedgeTab] = useState<'radar' | 'visualizer'>('visualizer');

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
          Selecione um beatmap na listagem à direita para carregar as estatísticas oficiais e o visualizador ao vivo.
        </p>
      </div>
    );
  }

  const { metadata, stats, difficulty, skills, patterns = [], modSlot } = map;
  const coverUrl = metadata.beatmapSetId
    ? `https://assets.ppy.sh/beatmaps/${metadata.beatmapSetId}/covers/cover.jpg`
    : null;

  const starColor = getStarRatingColor(stats.starRating);
  const starTextColor = getStarRatingTextColor(stats.starRating);
  const modPrefix = (modSlot || 'NM').slice(0, 2).toUpperCase();
  const modColorConfig = TOURNAMENT_MOD_COLORS[modPrefix] || TOURNAMENT_MOD_COLORS.NM;

  const modSlotOptions = [
    'NM', 'NM1', 'NM2', 'NM3', 'NM4', 'NM5', 'NM6',
    'HD', 'HD1', 'HD2', 'HD3',
    'HR', 'HR1', 'HR2', 'HR3',
    'DT', 'DT1', 'DT2', 'DT3', 'DT4',
    'FM', 'FM1', 'FM2', 'FM3',
    'TB',
  ];

  const statRows = [
    { key: 'cs', label: 'Tam. Círculo (CS)', val: difficulty.cs, max: 10, isStar: false },
    { key: 'hp', label: 'Drenagem HP (HP)', val: difficulty.hp, max: 10, isStar: false },
    { key: 'od', label: 'Precisão (OD)', val: difficulty.od, max: 10, isStar: false },
    { key: 'ar', label: 'Aproximação (AR)', val: difficulty.ar, max: 10, isStar: false },
    { key: 'sr', label: 'Dificuldade (★)', val: stats.starRating, max: 10, isStar: true },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Official ppy/osu-web .beatmapset-header (resources/js/beatmapsets-show/header.tsx) */}
      <div className="beatmapset-header">
        <div className="beatmapset-header__cover">
          <div
            className="beatmapset-cover beatmapset-cover--full"
            style={
              coverUrl
                ? ({
                    '--bg': `url("${coverUrl}")`,
                    '--bg-2x': `url("${coverUrl}")`,
                  } as React.CSSProperties)
                : undefined
            }
          />
        </div>

        {/* Left Box: Picker, Version, Title, Artist, Mapper, Actions */}
        <div className="beatmapset-header__box beatmapset-header__box--main">
          <div className="beatmapset-header__beatmap-picker-box">
            <div className="beatmapset-beatmap-picker">
              <span
                className="beatmapset-beatmap-picker__beatmap beatmapset-beatmap-picker__beatmap--active"
                title={`${metadata.version} (★ ${stats.starRating.toFixed(2).replace('.', ',')})`}
              >
                <div
                  className="beatmap-icon beatmap-icon--beatmapset"
                  style={{ '--diff': starColor } as React.CSSProperties}
                >
                  <i className="fal fa-extra-mode-osu" />
                </div>
              </span>
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

          <div className="beatmapset-mapping">
            <div className="beatmapset-mapping__user">
              <span
                className="avatar avatar--beatmapset"
                style={{
                  backgroundImage: 'url(/images/layout/avatar-guest@2x.png)',
                }}
              />
            </div>
            <div className="beatmapset-mapping__content">
              <div>
                mapeado por <strong style={{ color: '#fff' }}>{metadata.creator}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <span>slot do torneio:</span>
                {onSlotChange ? (
                  <select
                    value={modSlot || 'NM1'}
                    onChange={(e) => onSlotChange(map.id, e.target.value)}
                    style={{
                      backgroundColor: 'hsl(var(--hsl-b5))',
                      color: '#fff',
                      border: '1px solid hsl(var(--hsl-b2))',
                      borderRadius: '4px',
                      padding: '1px 6px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {modSlotOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <ModSlotBadge slot={modSlot} size="sm" />
                )}
              </div>
            </div>
          </div>

          <div className="beatmapset-header__buttons">
            {metadata.beatmapId && (
              <a
                href={`https://osu.ppy.sh/b/${metadata.beatmapId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-osu-big btn-osu-big--beatmapset-header"
              >
                <div className="btn-osu-big__content">
                  <div className="btn-osu-big__left">
                    <span className="btn-osu-big__text-top">Página Oficial</span>
                    <span className="btn-osu-big__text-bottom">osu.ppy.sh #{metadata.beatmapId}</span>
                  </div>
                  <div className="btn-osu-big__icon">
                    <span className="fas fa-external-link-alt" />
                  </div>
                </div>
              </a>
            )}
          </div>
        </div>

        {/* Right Box: Status Pill & Official .beatmapset-stats Table (resources/js/beatmapsets-show/stats.tsx) */}
        <div className="beatmapset-header__box beatmapset-header__box--stats">
          <div className="beatmapset-header__status">
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

      {/* Official ppy/osu-web .page-mode Sub-Navigation Bar */}
      <ul
        className="page-mode page-mode--sticky-toolbar"
        style={{
          padding: '8px 15px 0',
          backgroundColor: 'hsl(var(--hsl-b4))',
          textAlign: 'left',
        }}
      >
        <li className="page-mode__item">
          <a
            href="#visualizer"
            onClick={(e) => {
              e.preventDefault();
              setActiveWedgeTab('visualizer');
            }}
            className={`page-mode-link ${
              activeWedgeTab === 'visualizer' ? 'page-mode-link--is-active' : ''
            }`}
          >
            <i className="fas fa-play-circle" style={{ marginRight: '6px', alignSelf: 'center' }} />
            <span>visualizador ao vivo</span>
            <span className="page-mode-link__stripe" />
          </a>
        </li>

        <li className="page-mode__item">
          <a
            href="#radar"
            onClick={(e) => {
              e.preventDefault();
              setActiveWedgeTab('radar');
            }}
            className={`page-mode-link ${
              activeWedgeTab === 'radar' ? 'page-mode-link--is-active' : ''
            }`}
          >
            <i className="fas fa-chart-pie" style={{ marginRight: '6px', alignSelf: 'center' }} />
            <span>radar de skills</span>
            <span className="page-mode-link__badge">{map.topSkills.slice(0, 2).join(' + ')}</span>
            <span className="page-mode-link__stripe" />
          </a>
        </li>
      </ul>

      {/* Tab Content */}
      {activeWedgeTab === 'radar' ? (
        <div
          style={{
            padding: '20px',
            backgroundColor: 'hsl(var(--hsl-b5))',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <StatHexagon
            skills={skills}
            comparisonSkills={poolAverageSkills}
            comparisonLabel="Média da Pool"
            size={280}
            showLegend={true}
          />
        </div>
      ) : (
        <OsuPreviewPlayer map={map} patterns={patterns} />
      )}
    </div>
  );
};
