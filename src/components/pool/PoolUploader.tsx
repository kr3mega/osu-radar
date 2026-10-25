import React, { useState, useRef } from 'react';
import { PoolSheetSync } from './PoolSheetSync';
import { LocalSongsSyncPanel } from './LocalSongsSyncPanel';
import { extractOsuFilesFromZip } from '../../utils/unzip';
import { analyzeBeatmap } from '../../engine/analyzer';
import { usePoolStore } from '../../store/usePoolStore';
import { BeatmapAnalysisResult } from '../../engine/types';
import { ErrorBoundary } from '../common/ErrorBoundary';

export type UploaderTab = 'osu_songs' | 'sheet' | 'files' | 'json';

interface PoolUploaderProps {
  initialTab?: UploaderTab;
}

export const PoolUploader: React.FC<PoolUploaderProps> = ({ initialTab = 'osu_songs' }) => {
  const [activeTab, setActiveTab] = useState<UploaderTab>(initialTab);
  const [isDragging, setIsDragging] = useState(false);
  const [localTournamentName, setLocalTournamentName] = useState('Coleção Local');
  const [localStageName, setLocalStageName] = useState('Mappool');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const {
    currentPool,
    addBeatmaps,
    exportPoolJson,
    importPoolJson,
    isAnalyzing,
    setIsAnalyzing,
    progress,
    setProgress,
  } = usePoolStore();

  const handleProcessLocalFiles = async (fileList: FileList | File[]) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsAnalyzing(true);
    try {
      const pendingOsuFiles: Array<{
        fileName: string;
        text: string;
        bytes?: Uint8Array;
        audioBlob?: Blob;
      }> = [];

      setProgress({
        current: 0,
        total: files.length,
        fileName: 'Lendo arquivos...',
      });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
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
        throw new Error('Nenhum arquivo válido (.osu ou .osz) foi encontrado nos arquivos selecionados.');
      }

      const results: BeatmapAnalysisResult[] = [];
      const cleanTourney = localTournamentName.trim() || 'Coleção Local';
      const cleanStage = localStageName.trim() || 'Mappool';

      for (let i = 0; i < pendingOsuFiles.length; i++) {
        const item = pendingOsuFiles[i];
        setProgress({
          current: i + 1,
          total: pendingOsuFiles.length,
          fileName: item.fileName,
        });

        await new Promise((r) => setTimeout(r, 5));

        const analysis = await analyzeBeatmap(item.text, item.fileName, item.bytes, undefined, item.audioBlob);
        analysis.tournamentName = cleanTourney;
        analysis.stageName = cleanStage;
        analysis.id = `${analysis.id}_${cleanTourney}_${cleanStage}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        results.push(analysis);
      }

      await addBeatmaps(results);
      setSuccessMessage(`${results.length} beatmap(s) foram processados e adicionados com sucesso à pool!`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAnalyzing(false);
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleExportJson = () => {
    try {
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
      setSuccessMessage(`Arquivo ${safeName}.json exportado com sucesso!`);
    } catch (err) {
      setErrorMessage(`Erro ao exportar: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const text = await file.text();
      const ok = await importPoolJson(text);
      if (ok) {
        setSuccessMessage(`Mappool importada com sucesso do arquivo ${file.name}!`);
      } else {
        setErrorMessage('O arquivo JSON selecionado não possui uma estrutura válida de mappool.');
      }
    } catch (err) {
      setErrorMessage(`Erro ao importar JSON: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
    }
  };

  return (
    <ErrorBoundary fallbackTitle="Erro no módulo de importação">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid hsl(var(--hsl-b3))',
            paddingBottom: '12px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('osu_songs')}
            className={`osu-radar-player__mod-btn ${activeTab === 'osu_songs' ? 'osu-radar-player__mod-btn--active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700 }}
          >
            <i className="fas fa-hdd" style={{ marginRight: '6px' }} />
            Pasta Songs do osu! (Treino)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sheet')}
            className={`osu-radar-player__mod-btn ${activeTab === 'sheet' ? 'osu-radar-player__mod-btn--active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700 }}
          >
            <i className="fas fa-table" style={{ marginRight: '6px' }} />
            Planilha Google Sheets
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`osu-radar-player__mod-btn ${activeTab === 'files' ? 'osu-radar-player__mod-btn--active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700 }}
          >
            <i className="fas fa-folder-open" style={{ marginRight: '6px' }} />
            Arquivos Locais (.osz / .osu)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`osu-radar-player__mod-btn ${activeTab === 'json' ? 'osu-radar-player__mod-btn--active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700 }}
          >
            <i className="fas fa-file-code" style={{ marginRight: '6px' }} />
            Backup JSON (Exportar / Importar)
          </button>
        </div>

        {/* Tab 0: Local osu!stable Songs Library Sync */}
        {activeTab === 'osu_songs' && <LocalSongsSyncPanel />}

        {/* Tab 1: Google Sheets Sync */}
        {activeTab === 'sheet' && <PoolSheetSync />}

        {/* Tab 2: Local Files (.osz / .osu / Folders) */}
        {activeTab === 'files' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".osu,.osz,.zip"
              multiple
              onChange={(e) => e.target.files && handleProcessLocalFiles(e.target.files)}
              style={{ display: 'none' }}
            />
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error webkitdirectory is standard in browsers
              webkitdirectory="true"
              directory=""
              multiple
              onChange={(e) => e.target.files && handleProcessLocalFiles(e.target.files)}
              style={{ display: 'none' }}
            />

            {/* Custom Tournament and Stage Inputs for Local Files */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(var(--hsl-l2))' }}>
                  Nome do Torneio / Coleção:
                </label>
                <input
                  type="text"
                  value={localTournamentName}
                  onChange={(e) => setLocalTournamentName(e.target.value)}
                  placeholder="Ex: Treino Solo, Torneio Comunitário..."
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'hsl(var(--hsl-b5))',
                    border: '1px solid hsl(var(--hsl-b2))',
                    color: '#fff',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(var(--hsl-l2))' }}>
                  Etapa / Categoria:
                </label>
                <input
                  type="text"
                  value={localStageName}
                  onChange={(e) => setLocalStageName(e.target.value)}
                  placeholder="Ex: Mappool, Warmup, Finals..."
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'hsl(var(--hsl-b5))',
                    border: '1px solid hsl(var(--hsl-b2))',
                    color: '#fff',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Drag & Drop Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                if (e.relatedTarget === null) setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files) handleProcessLocalFiles(e.dataTransfer.files);
              }}
              style={{
                padding: '30px 20px',
                borderRadius: '8px',
                backgroundColor: isDragging ? 'hsl(var(--hsl-b3))' : 'hsl(var(--hsl-b5))',
                border: isDragging ? '2px dashed hsl(var(--hsl-h1))' : '2px dashed hsl(var(--hsl-b2))',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                textAlign: 'center',
                transition: 'all .15s ease',
              }}
            >
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  backgroundColor: 'hsl(var(--hsl-b4))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  color: 'hsl(var(--hsl-h1))',
                }}
              >
                <i className="fas fa-cloud-upload-alt" />
              </div>

              <div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff', display: 'block' }}>
                  Arraste arquivos <span style={{ color: 'hsl(var(--hsl-h1))' }}>.osz</span>,{' '}
                  <span style={{ color: 'hsl(var(--hsl-c1))' }}>.osu</span> ou pastas aqui
                </span>
                <span style={{ fontSize: '12px', color: 'hsl(var(--hsl-l2))', marginTop: '4px', display: 'block' }}>
                  Processamento instantâneo no navegador com cálculo de strain, cinemática e padrões rítmicos
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-osu-big btn-osu-big--beatmapset-header"
                  style={{ padding: '8px 16px', width: 'auto' }}
                >
                  <span className="btn-osu-big__content">
                    <span className="btn-osu-big__left">
                      <span className="btn-osu-big__text-top">Selecionar Arquivos</span>
                    </span>
                    <span className="btn-osu-big__icon">
                      <i className="fas fa-file-alt" />
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => folderInputRef.current?.click()}
                  className="btn-osu-big btn-osu-big--beatmapset-header"
                  style={{ padding: '8px 16px', width: 'auto' }}
                >
                  <span className="btn-osu-big__content">
                    <span className="btn-osu-big__left">
                      <span className="btn-osu-big__text-top">Selecionar Pasta (Songs)</span>
                    </span>
                    <span className="btn-osu-big__icon">
                      <i className="fas fa-folder-open" />
                    </span>
                  </span>
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {isAnalyzing && progress && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'hsl(var(--hsl-b5))',
                  borderLeft: '3px solid hsl(var(--hsl-h1))',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#fff', fontWeight: 600 }}>
                    <i className="fas fa-circle-notch fa-spin" style={{ marginRight: '6px', color: 'hsl(var(--hsl-h1))' }} />
                    {progress.fileName}
                  </span>
                  <span style={{ fontFamily: 'AzeretMono, monospace', color: 'hsl(var(--hsl-c1))' }}>
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div className="bar bar--beatmap-stats" style={{ width: '100%', height: '6px' }}>
                  <div
                    className="bar__fill"
                    style={{
                      width: `${Math.min(100, (progress.current / Math.max(1, progress.total)) * 100)}%`,
                      backgroundColor: 'hsl(var(--hsl-h1))',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: JSON Backup & Telemetry */}
        {activeTab === 'json' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input
              ref={jsonFileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportJsonFile}
              style={{ display: 'none' }}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '14px',
              }}
            >
              {/* Export Card */}
              <div
                style={{
                  padding: '18px',
                  borderRadius: '8px',
                  backgroundColor: 'hsl(var(--hsl-b5))',
                  border: '1px solid hsl(var(--hsl-b3))',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      backgroundColor: 'hsl(var(--hsl-b4))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'hsl(var(--hsl-h1))',
                      fontSize: '16px',
                    }}
                  >
                    <i className="fas fa-download" />
                  </div>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff', display: 'block' }}>
                      Exportar Pool Atual
                    </span>
                    <span style={{ fontSize: '11px', color: 'hsl(var(--hsl-l2))' }}>
                      Baixa todos os {currentPool.maps.length} mapas com física calculada em formato .JSON
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'hsl(var(--hsl-b4))',
                    fontSize: '11px',
                    color: 'hsl(var(--hsl-l1))',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div><strong>Torneio / Pool:</strong> {currentPool.name}</div>
                  <div><strong>Total de Beatmaps:</strong> {currentPool.maps.length} mapas analisados</div>
                </div>

                <button
                  type="button"
                  disabled={currentPool.maps.length === 0}
                  onClick={handleExportJson}
                  className="btn-osu-big btn-osu-big--beatmapset-header"
                  style={{ width: '100%', padding: '10px' }}
                >
                  <span className="btn-osu-big__content">
                    <span className="btn-osu-big__left">
                      <span className="btn-osu-big__text-top">Exportar Arquivo .JSON</span>
                    </span>
                    <span className="btn-osu-big__icon">
                      <i className="fas fa-file-download" />
                    </span>
                  </span>
                </button>
              </div>

              {/* Import Card */}
              <div
                style={{
                  padding: '18px',
                  borderRadius: '8px',
                  backgroundColor: 'hsl(var(--hsl-b5))',
                  border: '1px solid hsl(var(--hsl-b3))',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      backgroundColor: 'hsl(var(--hsl-b4))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'hsl(var(--hsl-c1))',
                      fontSize: '16px',
                    }}
                  >
                    <i className="fas fa-file-upload" />
                  </div>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff', display: 'block' }}>
                      Importar Backup .JSON
                    </span>
                    <span style={{ fontSize: '11px', color: 'hsl(var(--hsl-l2))' }}>
                      Restaura uma mappool exportada com 100% dos dados e telemetria intactos
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'hsl(var(--hsl-b4))',
                    fontSize: '11px',
                    color: 'hsl(var(--hsl-l1))',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <span>Compatível com backups gerados pelo osu!radar (formato Mappool Schema v1).</span>
                </div>

                <button
                  type="button"
                  onClick={() => jsonFileInputRef.current?.click()}
                  className="btn-osu-big btn-osu-big--beatmapset-header"
                  style={{ width: '100%', padding: '10px' }}
                >
                  <span className="btn-osu-big__content">
                    <span className="btn-osu-big__left">
                      <span className="btn-osu-big__text-top">Carregar Arquivo .JSON</span>
                    </span>
                    <span className="btn-osu-big__icon">
                      <i className="fas fa-folder-open" />
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Success Alert */}
        {successMessage && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '6px',
              backgroundColor: 'hsl(var(--hsl-b5))',
              borderLeft: '3px solid hsl(var(--hsl-lime-1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: 'hsl(var(--hsl-lime-1))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-check-circle" />
              <span>{successMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              <i className="fas fa-times" />
            </button>
          </div>
        )}

        {/* Global Error Alert */}
        {errorMessage && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '6px',
              backgroundColor: 'hsl(var(--hsl-b5))',
              borderLeft: '3px solid hsl(var(--hsl-red-1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: 'hsl(var(--hsl-red-1))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-exclamation-circle" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              <i className="fas fa-times" />
            </button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};
