import React, { useRef } from 'react';
import { usePoolStore } from '../../store/usePoolStore';
import { ArrowLeft, Download, Upload, PlusCircle, Link2 } from 'lucide-react';
import { formatTimestamp } from '../../engine/strains';

interface LazerBottomBarProps {
  onBackClick: () => void;
  onOpenUpload: () => void;
}

export const LazerBottomBar: React.FC<LazerBottomBarProps> = ({
  onBackClick,
  onOpenUpload,
}) => {
  const { currentPool, exportPoolJson, importPoolJson } = usePoolStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maps = currentPool.maps;
  const count = maps.length;
  const avgSr = count > 0 ? maps.reduce((acc, m) => acc + m.stats.starRating, 0) / count : 0;
  const totalDuration = maps.reduce((acc, m) => acc + m.stats.drainTimeMs, 0);

  const handleExport = () => {
    const jsonStr = exportPoolJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (currentPool.name || 'osu-pool').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    a.download = `${safeName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const ok = await importPoolJson(text);
    if (!ok) {
      alert('Arquivo JSON inválido para osu!Radar.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#120819]/95 backdrop-blur border-t border-white/10 h-12 flex items-center justify-between px-3 sm:px-6 select-none shadow-2xl">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFile}
        className="hidden"
      />

      {/* Left: Classic osu! Slanted Pink "BACK" Button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBackClick}
          className="relative px-5 py-1.5 bg-gradient-to-r from-osu-pink to-[#e03888] hover:from-[#ff77b5] hover:to-[#eb4d96] text-white font-extrabold text-xs tracking-wider uppercase flex items-center gap-2 shadow-glowPink transition-all duration-150 active:scale-95 -skew-x-12 rounded"
          title="Voltar"
        >
          <span className="skew-x-12 flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" />
            <span>Voltar</span>
          </span>
        </button>

        {/* Upload / Add Maps Button */}
        <button
          type="button"
          onClick={onOpenUpload}
          className="px-3 py-1.5 rounded bg-[#231230] hover:bg-[#321945] border border-white/10 hover:border-osu-pink text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
        >
          <PlusCircle className="w-3.5 h-3.5 text-osu-pink" />
          <span>Importar Beatmaps</span>
        </button>

        {/* Sync Google Sheets Button */}
        <button
          type="button"
          onClick={onOpenUpload}
          className="px-3 py-1.5 rounded bg-[#132338] hover:bg-[#1b3250] border border-osu-cyan/40 hover:border-osu-cyan text-osu-cyan text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          title="Sincronizar e filtrar mapas via Google Sheets"
        >
          <Link2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Planilha (Google Sheets)</span>
        </button>
      </div>

      {/* Center: JSON Sharing Actions */}
      <div className="hidden sm:flex items-center gap-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={count === 0}
          className="px-3 py-1 rounded bg-[#1e0f2b] hover:bg-[#2b163d] border border-white/10 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
          title="Exportar dados de telemetria da pool em JSON"
        >
          <Download className="w-3 h-3 text-osu-cyan" />
          <span>Exportar .JSON</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1 rounded bg-[#1e0f2b] hover:bg-[#2b163d] border border-white/10 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          title="Carregar pool pré-calculada de um arquivo .json"
        >
          <Upload className="w-3 h-3 text-osu-cyan" />
          <span>Importar .JSON</span>
        </button>
      </div>

      {/* Right: Pool Metrics Counters */}
      <div className="flex items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-white/70">
          <span>Mapas:</span>
          <strong className="text-white font-bold">{count}</strong>
        </div>

        <div className="flex items-center gap-1.5 text-white/70">
          <span>Média:</span>
          <strong className="text-yellow-400 font-bold">★ {avgSr.toFixed(2).replace('.', ',')}</strong>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-white/70">
          <span>Duração:</span>
          <strong className="text-osu-cyan font-bold">{formatTimestamp(totalDuration)}</strong>
        </div>
      </div>
    </footer>
  );
};
