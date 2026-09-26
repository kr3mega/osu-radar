import React from 'react';

interface ModSlotBadgeProps {
  slot?: string; // e.g. "NM1", "HD2", "HR1", "DT3", "FM1", "TB"
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const MOD_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  NM: { bg: 'bg-[#5975a4]', text: 'text-white', border: 'border-[#6c8ab8]' },
  HD: { bg: 'bg-[#e5a100]', text: 'text-black font-extrabold', border: 'border-[#ffd400]' },
  HR: { bg: 'bg-[#ff385c]', text: 'text-white', border: 'border-[#ff597a]' },
  DT: { bg: 'bg-[#9b59b6]', text: 'text-white', border: 'border-[#b172cc]' },
  FM: { bg: 'bg-[#2ecc71]', text: 'text-black font-extrabold', border: 'border-[#48e78a]' },
  TB: { bg: 'bg-[#f39c12]', text: 'text-black font-extrabold', border: 'border-[#f5b041]' },
};

export const ModSlotBadge: React.FC<ModSlotBadgeProps> = ({ slot = 'NM1', size = 'md', className = '' }) => {
  const prefix = slot.slice(0, 2).toUpperCase();
  const config = MOD_COLORS[prefix] || MOD_COLORS.NM;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-bold',
    lg: 'px-3 py-1.5 text-sm font-bold',
  }[size];

  return (
    <span
      className={`inline-flex items-center justify-center rounded-pill tracking-wider uppercase shadow-sm border ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      {slot}
    </span>
  );
};
