import React from 'react';
import { TOURNAMENT_MOD_COLORS } from '../../utils/osuColors';

interface ModSlotBadgeProps {
  slot?: string; // e.g. "NM1", "HD2", "HR1", "DT3", "FM1", "TB"
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ModSlotBadge: React.FC<ModSlotBadgeProps> = ({
  slot = 'NM1',
  size = 'md',
  className = '',
}) => {
  const prefix = slot.slice(0, 2).toUpperCase();
  const config = TOURNAMENT_MOD_COLORS[prefix] || TOURNAMENT_MOD_COLORS.NM;

  const fontSize = size === 'lg' ? '12px' : size === 'sm' ? '10px' : '11px';
  const padding = size === 'lg' ? '2px 10px' : size === 'sm' ? '1px 6px' : '1px 8px';

  return (
    <span
      className={`osu-skills-mod-pill ${className}`}
      style={{
        backgroundColor: config.bg,
        color: config.text,
        fontSize,
        padding,
      }}
    >
      {slot}
    </span>
  );
};
