import React, { useState, useRef, useEffect } from 'react';
import { usePoolStore } from '../../store/usePoolStore';
import {
  Search,
  RotateCcw,
  Volume2,
  AlertTriangle,
  X,
  Music,
  Loader2,
  CloudDownload,
  Trash2,
  HardDrive,
} from 'lucide-react';

interface LazerToolbarProps {
  activeTab: 'select' | 'overview';
  onTabChange: (tab: 'select' | 'overview') => void;
}

export const LazerToolbar: React.FC<LazerToolbarProps> = ({ activeTab, onTabChange }) => {
  const {
    searchQuery,
    setSearchQuery,
    resetAllData,
    currentPool,
    audioSyncStatus,
    startAudioSync,
    clearAudioCache,
  } = usePoolStore();
  const [pulse, setPulse] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [isClearingAudio, setIsClearingAudio] = useState(false);
  const audioMenuRef = useRef<HTMLDivElement>(null);

  const maps = currentPool.maps;
  const cachedAudioCount = maps.filter((m) => m.audioBlob).length;
  const totalMaps = maps.length;
  const cachedBytes = maps.reduce((acc, m) => acc + (m.audioBlob?.size || 0), 0);
  const cachedMb = (cachedBytes / (1024 * 1024)).toFixed(1);

  // Close audio menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (audioMenuRef.current && !audioMenuRef.current.contains(e.target as Node)) {
        setShowAudioMenu(false);
      }
    };
    if (showAudioMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAudioMenu]);

  const handleCookieClick = () => {
    setPulse(true);
    setTimeout(() => setPulse(false), 300);
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      await resetAllData();
      setShowResetConfirm(false);
    } finally {
      setIsResetting(false);
    }
  };

  const handleClearAudio = async () => {
    setIsClearingAudio(true);
    try {
      await clearAudioCache();
    } finally {
      setIsClearingAudio(false);
    }
  };

  return (
    <>
      <nav className="relative z-40 bg-[#120819] border-b border-white/10 h-12 flex items-center justify-between px-3 sm:px-6 select-none shadow-md">
        {/* Left: osu! cookie logo & Navigation Tabs */}
        <div className="flex items-center gap-3 sm:gap-6 h-full">
          {/* The Iconic osu! Pink Cookie Button */}
          <button
            type="button"
            onClick={handleCookieClick}
            className={`relative group w-9 h-9 rounded-full bg-gradient-to-br from-[#ff66aa] to-[#d6337a] flex items-center justify-center shadow-lg transition-transform duration-150 active:scale-90 ${
              pulse ? 'scale-110 shadow-glowPink ring-2 ring-white' : 'hover:scale-105'
            }`}
            title="osu! — Clique para pulsar"
          >
            {/* Concentric white rings */}
            <span className="absolute inset-1 rounded-full border border-white/40 pointer-events-none" />
            <span className="font-extrabold text-white text-xs tracking-tighter drop-shadow-sm font-torus">
              osu!
            </span>
          </button>

          {/* Slanted Navigation Tabs (osu!lazer style) */}
          <div className="flex items-center h-full">
            <button
              type="button"
              onClick={() => onTabChange('select')}
              className={`relative px-4 h-full flex items-center font-bold text-xs uppercase tracking-wider transition-colors ${
                activeTab === 'select'
                  ? 'text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <span>Song Select</span>
              {activeTab === 'select' && (
                <span className="absolute bottom-0 left-0 right-0 h-1 bg-osu-pink shadow-glowPink rounded-t" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onTabChange('overview')}
              className={`relative px-4 h-full flex items-center font-bold text-xs uppercase tracking-wider transition-colors ${
                activeTab === 'overview'
                  ? 'text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <span>Pool Radar</span>
              {activeTab === 'overview' && (
                <span className="absolute bottom-0 left-0 right-0 h-1 bg-osu-pink shadow-glowPink rounded-t" />
              )}
            </button>
          </div>
        </div>

        {/* Right: Reset Button, Search, Audio visualizer, and Profile Badge */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* 1-Click Reset Button */}
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-2.5 py-1 rounded bg-[#2e1220] hover:bg-[#43172c] border border-red-500/40 hover:border-red-500 text-red-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            title="Limpar todos os dados e apagar o banco IndexedDB"
          >
            <RotateCcw className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Resetar Tudo</span>
          </button>

          {/* Search input (lazer pill style) */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Procurar beatmaps..."
              className="pl-8 pr-3 py-1 text-xs rounded-full bg-[#1e0e29] border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-osu-pink w-32 sm:w-48 transition-all"
            />
          </div>

          {/* Audio Cache Manager Button & Popover */}
          {totalMaps > 0 && (
            <div className="relative" ref={audioMenuRef}>
              <button
                type="button"
                onClick={() => setShowAudioMenu(!showAudioMenu)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold transition-all border shadow-sm ${
                  audioSyncStatus?.isSyncing
                    ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300 animate-pulse'
                    : cachedAudioCount === totalMaps
                    ? 'bg-green-500/15 border-green-500/30 text-green-300 hover:bg-green-500/20'
                    : 'bg-osu-pink/15 border-osu-pink/30 text-osu-pink hover:bg-osu-pink/25'
                }`}
                title="Status do Cache de Áudio Offline (IndexedDB)"
              >
                {audioSyncStatus?.isSyncing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />
                ) : (
                  <Music className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline font-mono text-[11px]">
                  {audioSyncStatus?.isSyncing
                    ? `${audioSyncStatus.current}/${audioSyncStatus.total}`
                    : `${cachedAudioCount}/${totalMaps} áudios`}
                </span>
              </button>

              {/* Popover Dropdown */}
              {showAudioMenu && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#120819] border border-white/15 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <HardDrive className="w-3.5 h-3.5 text-osu-cyan" />
                      <span>Cache de Áudio (IndexedDB)</span>
                    </div>
                    <span className="text-[10px] text-white/50 font-mono">
                      {cachedMb} MB
                    </span>
                  </div>

                  <p className="text-[11px] text-white/60 leading-relaxed mb-3">
                    Os áudios são baixados e descompactados automaticamente via mirrors online e salvos permanentemente no seu IndexedDB local.
                  </p>

                  <div className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-white/5 mb-3 border border-white/5">
                    <span className="text-white/70">Músicas em cache:</span>
                    <span className="font-bold text-white font-mono">
                      {cachedAudioCount} / {totalMaps}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {cachedAudioCount < totalMaps && (
                      <button
                        type="button"
                        onClick={() => {
                          startAudioSync();
                          setShowAudioMenu(false);
                        }}
                        disabled={audioSyncStatus?.isSyncing}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-osu-pink hover:bg-osu-pink/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md disabled:opacity-50"
                      >
                        <CloudDownload className="w-3.5 h-3.5" />
                        <span>Baixar Áudios Restantes</span>
                      </button>
                    )}

                    {cachedAudioCount > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAudio}
                        disabled={isClearingAudio}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        <span>{isClearingAudio ? 'Limpando...' : 'Liberar Espaço (Limpar Cache)'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Music visualizer bars */}
          <div className="hidden lg:flex items-center gap-1 px-2 text-osu-cyan">
            <Volume2 className="w-4 h-4 text-white/50" />
            <div className="flex items-end gap-0.5 h-3">
              <span className="w-0.5 bg-osu-cyan h-2 animate-pulse" />
              <span className="w-0.5 bg-osu-pink h-3 animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="w-0.5 bg-osu-cyan h-1.5 animate-pulse" style={{ animationDelay: '300ms' }} />
              <span className="w-0.5 bg-white h-2.5 animate-pulse" style={{ animationDelay: '450ms' }} />
            </div>
          </div>

          {/* Profile Card (osu!lazer style) */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="w-7 h-7 rounded-full bg-osu-surface border border-osu-pink flex items-center justify-center font-bold text-[10px] text-white overflow-hidden shadow-sm">
              🇧🇷
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-[11px] font-bold text-white leading-none">Capitão</span>
              <span className="text-[9px] font-mono text-osu-cyan leading-tight mt-0.5">#1 • 6WC</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Confirmation Modal for Resetting */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="relative w-full max-w-md bg-[#1d0e26] border border-red-500/50 rounded-xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2 text-red-400 font-black uppercase text-sm tracking-wider">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span>Resetar Mappool & Limpar Banco</span>
              </div>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="text-white/50 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-white/80 leading-relaxed mb-4">
              Você tem certeza de que deseja apagar todos os beatmaps carregados e limpar o banco de dados IndexedDB?
              <br />
              <span className="text-red-400 font-bold block mt-2">
                Esta ação é irreversível e excluirá todos os mapas em cache local.
              </span>
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 rounded text-xs font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleConfirmReset}
                className="px-4 py-1.5 rounded text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isResetting ? 'Limpando...' : 'Confirmar e Resetar Tudo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
