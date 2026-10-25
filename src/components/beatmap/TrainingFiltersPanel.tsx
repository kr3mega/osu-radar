import React from 'react';
import { usePoolStore } from '../../store/usePoolStore';
import {
  ALL_SKILL_KEYS,
  SKILL_ICONS,
  SKILL_LABELS,
} from '../../utils/skillLabels';
import { StarRatingDualSlider } from './StarRatingDualSlider';

export const TrainingFiltersPanel: React.FC = () => {
  const { prioritizedSkills, togglePrioritizedSkill, clearPrioritizedSkills } = usePoolStore();

  return (
    <>
      {/* 1. Always-visible Dual-Thumb Star Rating Filter Bar (★ min — max) */}
      <div className="beatmapsets-search-filter beatmapsets-search-filter--grid">
        <span className="beatmapsets-search-filter__header">Dificuldade ★</span>
        <div className="beatmapsets-search-filter__items" style={{ width: '100%' }}>
          <StarRatingDualSlider />
        </div>
      </div>

      {/* 2. Multi-Skill Priority Filter Row (Combine 1, 2+ skills e.g. Jump + Finger Control) */}
      <div className="beatmapsets-search-filter beatmapsets-search-filter--grid">
        <span
          className="beatmapsets-search-filter__header"
          title="Selecione 1 ou mais skills simultaneamente para buscar mapas híbridos com a maior porcentagem combinada"
        >
          Priorizar
        </span>
        <div
          className="beatmapsets-search-filter__items"
          style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px 8px' }}
        >
          {ALL_SKILL_KEYS.map((skillKey) => {
            const selectedIdx = prioritizedSkills.indexOf(skillKey);
            const isPrioritized = selectedIdx !== -1;
            return (
              <button
                key={skillKey}
                type="button"
                aria-pressed={isPrioritized}
                onClick={() => togglePrioritizedSkill(skillKey)}
                className={`osu-radar-skill-priority-pill ${
                  isPrioritized ? 'osu-radar-skill-priority-pill--active' : ''
                }`}
                title={
                  isPrioritized
                    ? `Remover ${SKILL_LABELS[skillKey]} da busca combinada`
                    : `Adicionar ${SKILL_LABELS[skillKey]} à busca prioritária (pode marcar múltiplas skills ao mesmo tempo)`
                }
              >
                <i className={SKILL_ICONS[skillKey]} style={{ fontSize: '10px' }} />
                <span>{SKILL_LABELS[skillKey]}</span>
              </button>
            );
          })}

          {prioritizedSkills.length > 0 && (
            <button
              type="button"
              onClick={clearPrioritizedSkills}
              className="osu-radar-player__mod-btn"
              style={{ padding: '2px 8px', fontSize: '10px', textTransform: 'none' }}
              title="Desmarcar skills priorizadas"
            >
              <i className="fas fa-times" style={{ marginRight: '4px' }} />
              Limpar Skills
            </button>
          )}
        </div>
      </div>
    </>
  );
};
