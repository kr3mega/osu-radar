import React from 'react';
import { usePoolStore } from '../../store/usePoolStore';
import {
  ALL_SKILL_KEYS,
  SKILL_LABELS,
} from '../../utils/skillLabels';
import { StarRatingDualSlider } from './StarRatingDualSlider';

export const StarRatingFilterRow: React.FC = () => {
  return (
    <div className="beatmapsets-search-filter beatmapsets-search-filter--grid">
      <span className="beatmapsets-search-filter__header">Dificuldade</span>
      <div className="beatmapsets-search-filter__items" style={{ width: '100%' }}>
        <StarRatingDualSlider />
      </div>
    </div>
  );
};

export const SkillPriorityFilterRow: React.FC = () => {
  const { prioritizedSkills, togglePrioritizedSkill, clearPrioritizedSkills } = usePoolStore();

  return (
    <div className="beatmapsets-search-filter beatmapsets-search-filter--grid">
      <span
        className="beatmapsets-search-filter__header"
        title="Selecione 1 ou mais skills simultaneamente para buscar mapas híbridos com a maior porcentagem combinada"
      >
        Priorizar
      </span>
      <div className="beatmapsets-search-filter__items">
        {ALL_SKILL_KEYS.map((skillKey) => {
          const isPrioritized = prioritizedSkills.includes(skillKey);
          return (
            <a
              key={skillKey}
              href={`#skill-${skillKey}`}
              onClick={(e) => {
                e.preventDefault();
                togglePrioritizedSkill(skillKey);
              }}
              className={`beatmapsets-search-filter__item ${
                isPrioritized ? 'beatmapsets-search-filter__item--active' : ''
              }`}
              title={
                isPrioritized
                  ? `Remover ${SKILL_LABELS[skillKey]} da busca combinada`
                  : `Adicionar ${SKILL_LABELS[skillKey]} à busca prioritária (pode marcar múltiplas skills ao mesmo tempo)`
              }
            >
              {SKILL_LABELS[skillKey]}
            </a>
          );
        })}

        {prioritizedSkills.length > 0 && (
          <a
            href="#clear-skills"
            onClick={(e) => {
              e.preventDefault();
              clearPrioritizedSkills();
            }}
            className="beatmapsets-search-filter__item"
            style={{ opacity: 0.8 }}
            title="Desmarcar skills priorizadas"
          >
            <i className="fas fa-times" style={{ marginRight: '4px', fontSize: '10px' }} />
            Limpar
          </a>
        )}
      </div>
    </div>
  );
};

export const TrainingFiltersPanel: React.FC = () => {
  return (
    <>
      <StarRatingFilterRow />
      <SkillPriorityFilterRow />
    </>
  );
};
