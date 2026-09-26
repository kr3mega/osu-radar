import React, { useRef, useState } from 'react';
import { Download, Upload, Copy, Check, Trash2 } from 'lucide-react';
import { usePoolStore } from '../../store/usePoolStore';

export const PoolExportBar: React.FC = () => {
  const { currentPool, exportPoolJson, importPoolJson, clearPool } = usePoolStore();
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportDownload = () => {
    const jsonStr = exportPoolJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (currentPool.name || 'osu-radar-pool').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    a.download = `${safeName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyClipboard = async () => {
    const jsonStr = exportPoolJson();
    await navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const success = await importPoolJson(text);
    if (!success) {
      alert('Arquivo JSON inválido para formato de mappool do osu!Radar.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-osu-surface/60 border border-osu-border rounded-card text-xs">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-center gap-2 text-osu-text-secondary">
        <span className="font-bold text-white uppercase text-[10px] tracking-wider">
          Compartilhamento Zero-Server:
        </span>
        <span className="text-osu-text-muted">
          Envie o arquivo .json para capitães e árbitros sem necessidade de login.
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleExportDownload}
          disabled={currentPool.maps.length === 0}
          className="px-3 py-1.5 rounded bg-osu-panel hover:bg-osu-hover text-white border border-osu-border flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Baixar arquivo JSON com os cálculos salvos"
        >
          <Download className="w-3.5 h-3.5 text-osu-pink" />
          <span>Exportar Pool (.json)</span>
        </button>

        <button
          type="button"
          onClick={handleCopyClipboard}
          disabled={currentPool.maps.length === 0}
          className="px-3 py-1.5 rounded bg-osu-panel hover:bg-osu-hover text-white border border-osu-border flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Copiar JSON para a área de transferência"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-osu-cyan" />}
          <span>{copied ? 'Copiado!' : 'Copiar JSON'}</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 rounded bg-osu-panel hover:bg-osu-hover text-white border border-osu-border flex items-center gap-1.5 transition-colors"
          title="Carregar arquivo JSON com uma pool pré-calculada"
        >
          <Upload className="w-3.5 h-3.5 text-osu-cyan" />
          <span>Importar Pool</span>
        </button>

        {currentPool.maps.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Deseja limpar todos os mapas da pool atual?')) {
                clearPool();
              }
            }}
            className="p-1.5 rounded bg-osu-panel hover:bg-red-500/20 text-osu-text-muted hover:text-red-400 border border-osu-border transition-colors ml-2"
            title="Limpar pool atual"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
