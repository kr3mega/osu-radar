import React, { useState, useRef } from 'react';
import { extractOsuFilesFromZip } from '../../utils/unzip';
import { analyzeBeatmap } from '../../engine/analyzer';
import { usePoolStore } from '../../store/usePoolStore';
import { BeatmapAnalysisResult } from '../../engine/types';
import { extractQuickOsuMeta, matchOsuFileToTournamentEntry } from '../../utils/sheetParser';
import { PoolSheetSync } from './PoolSheetSync';

export const PoolUploader: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sheet' | 'files'>('sheet');
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const { addBeatmaps, isAnalyzing, setIsAnalyzing, progress, setProgress, activeTournamentFilter } = usePoolStore();

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
      const pendingOsuFiles: Array<{
        fileName: string;
        text: string;
        bytes?: Uint8Array;
        audioBlob?: Blob;
      }> = [];

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

      let filesToAnalyze: Array<{
        fileName: string;
        text: string;
        bytes?: Uint8Array;
        audioBlob?: Blob;
        officialSr?: number;
        officialBpm?: number;
        modSlot?: string;
      }> = [];

      if (activeTournamentFilter && activeTournamentFilter.entries.length > 0) {
        const requiredEntries = activeTournamentFilter.entries;
        for (const item of pendingOsuFiles) {
          const meta = extractQuickOsuMeta(item.text);
          const matched = matchOsuFileToTournamentEntry(meta, requiredEntries);
          if (matched) {
            filesToAnalyze.push({
              fileName: item.fileName,
              text: item.text,
              bytes: item.bytes,
              audioBlob: item.audioBlob,
              officialSr: matched.sr,
              officialBpm: matched.bpm,
              modSlot: matched.slot,
            });
          }
        }

        if (filesToAnalyze.length === 0) {
          setErrorMessage(
            `Nenhuma das dificuldades selecionadas pertence à etapa ativa "${activeTournamentFilter.stageName}". As dificuldades avulsas fora da pool foram ignoradas.`
          );
          setIsAnalyzing(false);
          return;
        }
      } else {
        filesToAnalyze = pendingOsuFiles;
      }

      const total = filesToAnalyze.length;

      for (let i = 0; i < total; i++) {
        const item = filesToAnalyze[i];
        setProgress({
          current: i + 1,
          total,
          fileName: item.fileName,
        });

        await new Promise((resolve) => setTimeout(resolve, 5));

        const analysis = await analyzeBeatmap(
          item.text,
          item.fileName,
          item.bytes,
          item.officialSr,
          item.audioBlob
        );
        if (item.modSlot) analysis.modSlot = item.modSlot;
        if (item.officialSr) analysis.stats.starRating = item.officialSr;
        if (item.officialBpm) analysis.stats.bpmMode = item.officialBpm;
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Official osu-web .page-mode Tab Switcher */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          paddingBottom: '10px',
          borderBottom: '1px solid hsl(var(--hsl-b3))',
        }}
      >
        <ul className="page-mode" style={{ justifyContent: 'flex-start' }}>
          <li className="page-mode__item">
            <button
              type="button"
              onClick={() => setActiveTab('sheet')}
              className={`page-mode__link ${activeTab === 'sheet' ? 'page-mode__link--is-active' : ''}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <i className="fas fa-table" style={{ marginRight: '6px' }} />
              Planilha de Torneio (Google Sheets)
              <span className="page-mode__underline" />
            </button>
          </li>
          <li className="page-mode__item">
            <button
              type="button"
              onClick={() => setActiveTab('files')}
              className={`page-mode__link ${activeTab === 'files' ? 'page-mode__link--is-active' : ''}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <i className="fas fa-file-upload" style={{ marginRight: '6px' }} />
              Arquivos Manuais (.osz / .osu)
              <span className="page-mode__underline" />
            </button>
          </li>
        </ul>
      </div>

      {/* Tab 1: Google Sheets Sync & Folder Filter */}
      {activeTab === 'sheet' && <PoolSheetSync />}

      {/* Tab 2: Manual Drag & Drop */}
      {activeTab === 'files' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          {activeTournamentFilter && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: 'hsl(var(--hsl-b5))',
                borderLeft: '3px solid hsl(var(--hsl-blue-1))',
                fontSize: '12px',
                color: 'hsl(var(--hsl-l1))',
              }}
            >
              <i className="fas fa-filter" style={{ color: 'hsl(var(--hsl-blue-1))' }} />
              <span>
                <strong>Filtro de Torneio Ativo:</strong> {activeTournamentFilter.stageName} ({activeTournamentFilter.entries.length} mapas). Dificuldades fora da pool serão ignoradas automaticamente durante a importação.
              </span>
            </div>
          )}

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              position: 'relative',
              border: isDragging ? '2px dashed hsl(var(--hsl-h1))' : '2px dashed hsl(var(--hsl-b2))',
              borderRadius: '10px',
              padding: '28px 20px',
              backgroundColor: isDragging ? 'hsla(var(--hsl-h1), 0.1)' : 'hsl(var(--hsl-b5))',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              transition: 'all 150ms ease',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".osu,.osz,.zip"
              onChange={(e) => e.target.files && processFiles(e.target.files)}
              style={{ display: 'none' }}
            />
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error webkitdirectory is standard in modern browsers
              webkitdirectory="true"
              directory=""
              multiple
              onChange={(e) => e.target.files && processFiles(e.target.files)}
              style={{ display: 'none' }}
            />

            {isAnalyzing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '16px 0' }}>
                <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '28px', color: 'hsl(var(--hsl-h1))' }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                    Escaneando física dos mapas...
                  </div>
                  {progress && (
                    <div style={{ fontSize: '12px', color: 'hsl(var(--hsl-c1))', marginTop: '4px', fontFamily: 'AzeretMono, monospace' }}>
                      {progress.current} de {progress.total} — {progress.fileName}
                    </div>
                  )}
                </div>
                {progress && (
                  <div className="bar bar--beatmap-stats" style={{ width: '260px', height: '6px' }}>
                    <div
                      className="bar__fill"
                      style={{
                        width: `${(progress.current / progress.total) * 100}%`,
                        backgroundColor: 'hsl(var(--hsl-h1))',
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'hsl(var(--hsl-b4))',
                    color: 'hsl(var(--hsl-h1))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                  }}
                >
                  <i className="fas fa-cloud-upload-alt" />
                </div>

                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0 }}>
                    Arraste pacotes <span style={{ color: 'hsl(var(--hsl-h1))' }}>.osz</span>, arquivos{' '}
                    <span style={{ color: 'hsl(var(--hsl-blue-1))' }}>.osu</span> ou pastas de beatmaps aqui
                  </p>
                  <p style={{ fontSize: '12px', color: 'hsl(var(--hsl-l2))', margin: '4px 0 0' }}>
                    Processamento 100% no seu navegador (áudios e mapas lidos diretamente na memória)
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-osu-big btn-osu-big--beatmapset-header-square"
                    style={{ padding: '8px 16px', width: 'auto' }}
                  >
                    <span className="btn-osu-big__content" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fas fa-file-alt" />
                      <span>Selecionar Arquivos</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="btn-osu-big btn-osu-big--beatmapset-header-square"
                    style={{ padding: '8px 16px', width: 'auto' }}
                  >
                    <span className="btn-osu-big__content" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fas fa-folder-open" />
                      <span>Selecionar Pasta de Mapas</span>
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '6px',
                backgroundColor: 'hsl(var(--hsl-b5))',
                borderLeft: '3px solid hsl(var(--hsl-red-1))',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '12px',
                color: 'hsl(var(--hsl-red-1))',
              }}
            >
              <i className="fas fa-exclamation-circle" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
