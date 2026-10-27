import React, { useEffect, useState } from 'react';
import { BeatmapAnalysisResult, SkillAttributes } from '../../engine/types';
import {
  getStarRatingColor,
  getStarRatingTextColor,
  TOURNAMENT_MOD_COLORS,
} from '../../utils/osuColors';
import {
  buildBeatmapCoverCss,
  previewAudioManager,
  PreviewAudioState,
} from '../../lib/osu-preview';
import { BeatmapSetGroup } from '../../store/usePoolStore';
import {
  computeMultiSkillSynergy,
  formatSkillLabel,
  SKILL_SHORT_LABELS,
} from '../../utils/skillLabels';

interface LazerCarouselItemProps {
  map: BeatmapAnalysisResult;
  group?: BeatmapSetGroup;
  isSelected: boolean;
  selectedMapId?: string | null;
  isExpanded?: boolean;
  onSelect: () => void;
  onToggleExpand?: () => void;
  onSelectDifficulty?: (id: string) => void;
  onRemove?: () => void;
  onRemoveDifficulty?: (id: string) => void;
  prioritizedSkills?: Array<keyof SkillAttributes>;
}

/**
 * Authentic ppy/osu-web .beatmapset-panel grouped by Song (Beatmapset)
 * with an expandable difficulty drawer underneath when clicked.
 */
export const LazerCarouselItem: React.FC<LazerCarouselItemProps> = ({
  map,
  group,
  isSelected,
  selectedMapId: _selectedMapId,
  isExpanded = false,
  onSelect,
  onToggleExpand: _onToggleExpand,
  onSelectDifficulty,
  onRemove,
  onRemoveDifficulty,
  prioritizedSkills = [],
}) => {
  const difficulties = group ? group.difficulties : [map];
  const displayMap = group ? group.representative : map;

  const { metadata, stats, modSlot, topSkills, skills } = displayMap;
  const isLazerSong = displayMap.origin === 'lazer' || displayMap.localClient === 'lazer';
  const isLocalSong = displayMap.origin === 'local_songs' || isLazerSong;

  const [audioState, setAudioState] = useState<PreviewAudioState>('stopped');
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [isDotsHovered, setIsDotsHovered] = useState(false);

  const handleDotsMouseEnter = () => {
    setIsDotsHovered(true);
  };

  const handleDotsMouseLeave = () => {
    setIsDotsHovered(false);
  };

  const showPopup = isDotsHovered;

  useEffect(() => {
    return previewAudioManager.subscribe((snap) => {
      const matchesGroup =
        snap.activeMapId === displayMap.id ||
        (group ? group.difficulties.some((d) => d.id === snap.activeMapId) : false);
      if (matchesGroup) {
        setAudioState(snap.state);
        setAudioProgress(snap.progress);
      } else {
        setAudioState('stopped');
        setAudioProgress(0);
      }
    });
  }, [displayMap.id, group]);

  const listCoverCss = buildBeatmapCoverCss(displayMap, 'list');
  const listCover2xCss = buildBeatmapCoverCss(displayMap, 'list@2x') || listCoverCss;
  const cardCoverCss = buildBeatmapCoverCss(displayMap, 'card');
  const cardCover2xCss = buildBeatmapCoverCss(displayMap, 'card@2x') || cardCoverCss;

  const starColor = getStarRatingColor(stats.starRating);
  const starTextColor = getStarRatingTextColor(stats.starRating);

  const modPrefix = (modSlot || 'NM').slice(0, 2).toUpperCase();
  const modColorConfig = isLazerSong
    ? { bg: '#e56499', text: '#fff' }
    : isLocalSong
    ? { bg: 'hsl(var(--hsl-h1))', text: 'hsl(var(--hsl-b6))' }
    : TOURNAMENT_MOD_COLORS[modPrefix] || TOURNAMENT_MOD_COLORS.NM;
  const badgeLabel = isLazerSong ? 'LAZER' : isLocalSong ? 'OSU!' : modSlot || 'NM1';

  const displaySynergy =
    prioritizedSkills.length >= 2
      ? computeMultiSkillSynergy(displayMap.skills, prioritizedSkills)
      : 0;

  const skillsToHighlight: Array<keyof SkillAttributes> =
    prioritizedSkills.length > 0
      ? prioritizedSkills.slice(0, 2)
      : topSkills.slice(0, 2);

  const handleTogglePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    previewAudioManager.toggle(displayMap);
  };

  const handleCardClick = () => {
    const targetMap = group ? group.representative : displayMap;
    if (onSelectDifficulty) {
      onSelectDifficulty(targetMap.id);
    } else {
      onSelect();
    }
  };

  return (
    <div
      id={group ? `beatmapset-group-${group.groupKey}` : `beatmap-item-${map.id}`}
      style={{ zIndex: showPopup ? 999999 : undefined }}
      className={`osu-skills-song-group ${
        isExpanded ? 'osu-skills-song-group--expanded' : ''
      } ${
        showPopup ? 'osu-skills-song-group--popup-visible' : ''
      }`}
    >
      <div
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
        tabIndex={0}
        role="option"
        aria-selected={isSelected}
        aria-expanded={group ? isExpanded : undefined}
        data-audio-state={audioState}
        data-audio-over50={audioProgress > 0.5 ? '1' : '0'}
        style={
          {
            '--progress': audioProgress,
            zIndex: showPopup ? 999999 : undefined,
          } as React.CSSProperties
        }
        className={`beatmapset-panel beatmapset-panel--size-normal ${
          isSelected ? 'beatmapset-panel--selected' : ''
        } ${showPopup ? 'beatmapset-panel--beatmaps-popup-visible' : ''}`}
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
          {/* Left Play Area */}
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

            {!isLocalSong && (
              <div className="beatmapset-panel__play-icons">
                <span
                  className="osu-skills-mod-pill"
                  style={{
                    backgroundColor: modColorConfig.bg,
                    color: modColorConfig.text,
                  }}
                >
                  {badgeLabel}
                </span>
              </div>
            )}
          </div>

          {/* Center Info Area */}
          <div className="beatmapset-panel__info">
            {/* Row 1: Title + Star Rating Badge */}
            <div className="beatmapset-panel__info-row beatmapset-panel__info-row--title">
              <span className="beatmapset-panel__main-link u-ellipsis-overflow">
                {metadata.title}
              </span>
              <div
                className="beatmapset-panel__badge-container"
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
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

            {/* Row 4: Status Pill + All Qualifying Difficulty Dots + Right-aligned Synergy / Dominant Skills */}
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

              <div
                className="beatmapset-panel__extra-item beatmapset-panel__extra-item--dots"
                onMouseEnter={handleDotsMouseEnter}
                onMouseLeave={handleDotsMouseLeave}
              >
                <div
                  className="beatmapset-panel__beatmap-icon"
                  style={{ color: starColor }}
                  title="osu!standard"
                >
                  <i className="fal fa-extra-mode-osu" />
                </div>
                {difficulties.slice(0, 10).map((diffItem) => (
                  <div
                    key={diffItem.id}
                    className="beatmapset-panel__beatmap-dot"
                    title={`[${diffItem.metadata.version}] — ${diffItem.stats.starRating
                      .toFixed(2)
                      .replace('.', ',')}★`}
                    style={
                      {
                        '--bg': getStarRatingColor(diffItem.stats.starRating),
                      } as React.CSSProperties
                    }
                  />
                ))}
                {difficulties.length > 10 && (
                  <span style={{ fontSize: '9px', color: 'hsl(var(--hsl-l2))', marginLeft: '2px' }}>
                    +{difficulties.length - 10}
                  </span>
                )}
              </div>

              {displayMap.stageName && (
                <div className="beatmapset-panel__extra-item">
                  <div
                    className="beatmapset-status beatmapset-status--panel"
                    style={{
                      backgroundColor: 'hsl(var(--hsl-b3))',
                      color: 'hsl(var(--hsl-h1))',
                      fontWeight: 700,
                    }}
                    title={
                      displayMap.tournamentName
                        ? `${displayMap.tournamentName} • ${displayMap.stageName}`
                        : `Etapa: ${displayMap.stageName}`
                    }
                  >
                    <i className="fas fa-layer-group" style={{ marginRight: '4px', fontSize: '9px' }} />
                    {displayMap.stageName}
                  </div>
                </div>
              )}

              {displayMap.tournamentName && (
                <div className="beatmapset-panel__extra-item">
                  <div
                    className="beatmapset-status beatmapset-status--panel"
                    style={{
                      backgroundColor: 'hsl(var(--hsl-b4))',
                      color: 'hsl(var(--hsl-l1))',
                    }}
                    title={`Torneio: ${displayMap.tournamentName}`}
                  >
                    <i
                      className="fas fa-trophy"
                      style={{ marginRight: '4px', fontSize: '9px', color: '#e5b32e' }}
                    />
                    {displayMap.tournamentName}
                  </div>
                </div>
              )}

              {/* Synergy & Highlighted Skills: right-aligned */}
              {(prioritizedSkills.length >= 2 || skillsToHighlight.length > 0) && (
                <div
                  className="beatmapset-panel__extra-skills"
                  style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {prioritizedSkills.length >= 2 && (
                    <div className="beatmapset-panel__extra-item">
                      <div
                        className="beatmapset-status beatmapset-status--panel"
                        style={{
                          backgroundColor: 'hsl(var(--hsl-h1))',
                          color: 'hsl(var(--hsl-b6))',
                          fontWeight: 800,
                          borderRadius: '4px',
                        }}
                        title="Pontuação de sinergia combinando todas as skills priorizadas"
                      >
                        Sinergia: {displaySynergy.toFixed(1).replace('.', ',')}%
                      </div>
                    </div>
                  )}

                  {skillsToHighlight.map((skillKey) => (
                    <div key={skillKey} className="beatmapset-panel__extra-item">
                      <div
                        className="beatmapset-status beatmapset-status--panel"
                        style={
                          {
                            '--bg-hsl': 'var(--hsl-b5)',
                            '--colour': 'hsl(var(--hsl-c1))',
                            borderRadius: '4px',
                          } as React.CSSProperties
                        }
                      >
                        {formatSkillLabel(skillKey)}: {skills[skillKey].toFixed(1).replace('.', ',')}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                    if (group && difficulties.length > 1 && onRemoveDifficulty) {
                      difficulties.forEach((d) => onRemoveDifficulty(d.id));
                    } else {
                      onRemove();
                    }
                  }}
                  title={
                    group && difficulties.length > 1
                      ? 'Remover todas as dificuldades deste mapa'
                      : 'Remover mapa'
                  }
                >
                  <span className="fas fa-trash" />
                </button>
              )}
            </div>
          </div>

          {/* Dropdown popup for difficulty preview on hovering dots (ghost element, no hitbox, closes immediately on mouse leave) */}
          {showPopup && difficulties.length > 0 && (
            <div
              className="beatmaps-popup"
              style={{
                zIndex: 999999,
                boxShadow: '0 8px 24px rgba(0,0,0,0.65)',
                pointerEvents: 'none',
              }}
            >
              <div className="beatmaps-popup__content" style={{ pointerEvents: 'none' }}>
                <div className="beatmaps-popup__group" style={{ pointerEvents: 'none' }}>
                  {difficulties.map((diffItem) => {
                    const dStarColor = getStarRatingColor(diffItem.stats.starRating);
                    const dStarTextColor = getStarRatingTextColor(diffItem.stats.starRating);
                    const diffSkills =
                      prioritizedSkills.length > 0
                        ? prioritizedSkills.slice(0, 3)
                        : diffItem.topSkills.slice(0, 2);
                    const diffSynergy =
                      prioritizedSkills.length >= 2
                        ? computeMultiSkillSynergy(diffItem.skills, prioritizedSkills)
                        : 0;
                    const diffModPrefix = (diffItem.modSlot || 'NM').slice(0, 2).toUpperCase();
                    const diffModColors =
                      TOURNAMENT_MOD_COLORS[diffModPrefix] || TOURNAMENT_MOD_COLORS.NM;

                    return (
                      <div
                        key={diffItem.id}
                        className="beatmaps-popup-item"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          pointerEvents: 'none',
                          cursor: 'default',
                          userSelect: 'none',
                          width: '100%',
                          boxSizing: 'border-box',
                          backgroundColor: 'transparent',
                        }}
                      >
                        <span
                          className="beatmapset-panel__beatmap-icon"
                          style={{ color: '#ffffff', fontSize: '11px', flexShrink: 0 }}
                        >
                          <i className="fal fa-extra-mode-osu" />
                        </span>
                        <div
                          className="difficulty-badge"
                          style={
                            {
                              '--bg': dStarColor,
                              color: dStarTextColor,
                              flexShrink: 0,
                            } as React.CSSProperties
                          }
                        >
                          <span className="difficulty-badge__icon">
                            <span className="fas fa-star" />
                          </span>
                          <span className="difficulty-badge__rating">
                            {diffItem.stats.starRating.toFixed(2).replace('.', ',')}
                          </span>
                        </div>

                        {diffItem.origin !== 'local_songs' && diffItem.modSlot && (
                          <span
                            className="osu-skills-mod-pill"
                            style={{
                              backgroundColor: diffModColors.bg,
                              color: diffModColors.text,
                              flexShrink: 0,
                            }}
                          >
                            {diffItem.modSlot}
                          </span>
                        )}

                        <span
                          style={{
                            fontSize: '12px',
                            color: '#fff',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '220px',
                          }}
                        >
                          [{diffItem.metadata.version}]
                        </span>

                        <span
                          className="osu-skills-diff-row__skills"
                          style={{ marginLeft: 'auto', flexShrink: 0, display: 'inline-flex', gap: '4px' }}
                        >
                          {prioritizedSkills.length >= 2 && (
                            <span className="osu-skills-diff-row__skill osu-skills-diff-row__skill--synergy">
                              {diffSynergy.toFixed(0)}%
                            </span>
                          )}
                          {diffSkills.map((sk) => (
                            <span key={sk} className="osu-skills-diff-row__skill">
                              {SKILL_SHORT_LABELS[sk]} {diffItem.skills[sk].toFixed(0)}%
                            </span>
                          ))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
