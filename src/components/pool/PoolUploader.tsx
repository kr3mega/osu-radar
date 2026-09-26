import React, { useState, useRef } from 'react';
import { UploadCloud, FolderUp, FileText, AlertCircle, Loader2, Link2, Upload } from 'lucide-react';
import { extractOsuFilesFromZip } from '../../utils/unzip';
import { analyzeBeatmap } from '../../engine/analyzer';
import { usePoolStore } from '../../store/usePoolStore';
import { BeatmapAnalysisResult } from '../../engine/types';
import { PoolSheetSync } from './PoolSheetSync';

export const PoolUploader: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sheet' | 'files'>('sheet');
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const { addBeatmaps, isAnalyzing, setIsAnalyzing, progress, setProgress } = usePoolStore();

  const processFiles = async (fileList: FileList | File[]) => {
    setErrorMessage(null);
    const files = Array.from(fileList);

    if (files.length === 0) return;

    if (files.length > 70) {
      setErrorMessage(
        `Limite de segurança excedido: você selecionou ${files.length} arquivos. Para manter a performance ideal em torneios, envie no máximo 60 mapas por lote.`
      );
      return;
    }

    setIsAnalyzing(true);
    const results: BeatmapAnalysisResult[] = [];

    try {
      const pendingOsuFiles: Array<{ fileName: string; text: string; bytes?: Uint8Array }> = [];

      for (const file of files) {
        const lowerName = file.name.toLowerCase();

        if (lowerName.endsWith('.osu')) {
          const text = await file.text();
          const bytes = new Uint8Array(await file.arrayBuffer());
          pendingOsuFiles.push({ fileName: file.name, text, bytes });
        } else if (lowerName.endsWith('.osz') || lowerName.endsWith('.zip')) {
          const buffer = await file.arrayBuffer();
          const extracted = await extractOsuFilesFromZip(buffer);
          pendingOsuFiles.push(...extracted);
        }
      }

      if (pendingOsuFiles.length === 0) {
        setErrorMessage('Nenhum arquivo válido (.osu, .osz ou .zip) foi encontrado nos arquivos selecionados.');
        setIsAnalyzing(false);
        return;
      }

      const total = pendingOsuFiles.length;

      for (let i = 0; i < total; i++) {
        const item = pendingOsuFiles[i];
        setProgress({
          current: i + 1,
          total,
          fileName: item.fileName,
        });

        await new Promise((resolve) => setTimeout(resolve, 5));

        const analysis = await analyzeBeatmap(item.text, item.fileName, item.bytes);
        results.push(analysis);
      }

      await addBeatmaps(results);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Erro ao processar mapas: ${msg}`);
    } finally {
      setIsAnalyzing(false);
      setProgress(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('sheet')}
          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
            activeTab === 'sheet'
              ? 'bg-osu-pink text-white shadow-glowPink'
              : 'bg-white/5 text-white/60 hover:text-white'
          }`}
        >
          <Link2 className="w-4 h-4 text-osu-cyan" />
          <span>Planilha de Torneio (Google Sheets)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('files')}
          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
            activeTab === 'files'
              ? 'bg-osu-pink text-white shadow-glowPink'
              : 'bg-white/5 text-white/60 hover:text-white'
          }`}
        >
          <Upload className="w-4 h-4 text-osu-pink" />
          <span>Arquivos Manuais (.osz / .osu)</span>
        </button>
      </div>

      {/* Tab 1: Google Sheets Sync & Folder Filter */}
      {activeTab === 'sheet' && <PoolSheetSync />}

      {/* Tab 2: Manual Drag & Drop */}
      {activeTab === 'files' && (
        <div className="w-full flex flex-col gap-3">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-card p-6 flex flex-col items-center justify-center text-center transition-all duration-200 ${
              isDragging
                ? 'border-osu-pink bg-osu-pink/10 shadow-glowPink scale-[1.01]'
                : 'border-white/10 hover:border-osu-pink/40 bg-osu-panel/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".osu,.osz,.zip"
              onChange={(e) => e.target.files && processFiles(e.target.files)}
              className="hidden"
            />
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error webkitdirectory is standard in modern browsers
              webkitdirectory="true"
              directory=""
              multiple
              onChange={(e) => e.target.files && processFiles(e.target.files)}
              className="hidden"
            />

            {isAnalyzing ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="w-8 h-8 text-osu-pink animate-spin" />
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-white">
                    Escaneando física dos mapas...
                  </span>
                  {progress && (
                    <span className="text-xs text-osu-cyan mt-1 font-mono">
                      {progress.current} de {progress.total} — {progress.fileName}
                    </span>
                  )}
                </div>
                {progress && (
                  <div className="w-64 bg-osu-base h-2 rounded-full overflow-hidden mt-1 border border-osu-border">
                    <div
                      className="bg-gradient-to-r from-osu-pink to-osu-cyan h-full transition-all duration-150"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-osu-surface rounded-full text-osu-pink border border-osu-border">
                  <UploadCloud className="w-6 h-6" />
                </div>

                <div>
                  <p className="text-sm font-bold text-white">
                    Arraste pacotes <span className="text-osu-pink">.osz</span>, arquivos{' '}
                    <span className="text-osu-cyan">.osu</span> ou pastas de beatmaps aqui
                  </p>
                  <p className="text-xs text-osu-text-muted mt-1">
                    Processamento 100% no seu navegador em microssegundos (áudios e vídeos são descartados na memória)
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-card bg-osu-surface hover:bg-osu-hover text-xs font-semibold text-osu-text-primary border border-osu-border flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-osu-pink" />
                    Selecionar Arquivos
                  </button>

                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-card bg-osu-surface hover:bg-osu-hover text-xs font-semibold text-osu-text-primary border border-osu-border flex items-center gap-1.5 transition-colors"
                  >
                    <FolderUp className="w-3.5 h-3.5 text-osu-cyan" />
                    Selecionar Pasta de Mapas
                  </button>
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 rounded-card bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
