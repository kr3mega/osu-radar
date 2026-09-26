import React, { useState } from 'react';
import { usePoolStore } from '../../store/usePoolStore';
import { Edit2, Check } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentPool, setPoolMetadata } = usePoolStore();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(currentPool.name);
  const [stageInput, setStageInput] = useState(currentPool.stage || '');

  const handleSaveTitle = () => {
    setPoolMetadata(titleInput || 'Mappool Sem Título', stageInput);
    setIsEditingTitle(false);
  };

  return (
    <header className="bg-osu-panel border-b border-osu-border sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo and branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-osu-pink flex items-center justify-center font-black text-xl text-white shadow-glowPink">
            ●
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
                osu!Radar
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-osu-pink/20 text-osu-pink border border-osu-pink/30">
                  Analytics
                </span>
              </h1>
            </div>
            <p className="text-xs text-osu-text-muted">
              Auditoria de Beatmaps & Inteligência Competitiva
            </p>
          </div>
        </div>

        {/* Editable Pool Header info */}
        <div className="hidden md:flex items-center gap-2 bg-osu-surface px-3 py-1.5 rounded-card border border-osu-border">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="Nome do Mappool"
                className="bg-osu-base px-2 py-0.5 rounded text-xs text-white border border-osu-pink focus:outline-none"
              />
              <input
                type="text"
                value={stageInput}
                onChange={(e) => setStageInput(e.target.value)}
                placeholder="Fase (ex: Quartas de Final)"
                className="bg-osu-base px-2 py-0.5 rounded text-xs text-white border border-osu-border focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="text-osu-cyan hover:text-white p-1"
                title="Salvar"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => setIsEditingTitle(true)}
              title="Clique para editar nome e estágio do torneio"
            >
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-white group-hover:text-osu-pink transition-colors">
                  {currentPool.name}
                </span>
                <span className="text-[10px] text-osu-text-muted">
                  {currentPool.stage || 'Sem estágio definido'}
                </span>
              </div>
              <Edit2 className="w-3 h-3 text-osu-text-muted group-hover:text-white ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
