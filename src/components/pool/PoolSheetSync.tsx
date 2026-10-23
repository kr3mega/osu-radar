import React, { useState, useRef } from 'react';
import {
  parseGoogleSheetUrl,
  fetchSheetCsv,
  parseMappoolCsv,
  fetchOsuFileById,
  extractQuickOsuMeta,
  matchOsuFileToTournamentEntry,
  SheetStageGroup,
  SheetBeatmapEntry,
} from '../../utils/sheetParser';
import { extractOsuFilesFromZip } from '../../utils/unzip';
import { analyzeBeatmap } from '../../engine/analyzer';
import { usePoolStore } from '../../store/usePoolStore';
import { BeatmapAnalysisResult } from '../../engine/types';
import { TOURNAMENT_MOD_COLORS } from '../../utils/osuColors';

const DEFAULT_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1-TX1ykmECyrxFKbNDCI9Z60-hSZ0shG99hxuVnvay2k/edit?gid=217539883#gid=217539883';

export const PoolSheetSync: React.FC = () => {
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [tournamentName, setTournamentName] = useState('6 Digit World Cup 2026');
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [stages, setStages] = useState<SheetStageGroup[]>([]);
  const [selectedStageNames, setSelectedStageNames] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState<{ current: number; total: number; label: string } | null>(null);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const { addBeatmaps, setPoolMetadata, setActiveTournamentFilter } = usePoolStore();

  const selectedStages = React.useMemo(() => {
    return stages.filter((s) => selectedStageNames.has(s.stageName));
  }, [stages, selectedStageNames]);

  const totalMapCount = React.useMemo(() => {
    return stages.reduce((acc, s) => acc + s.entries.length, 0);
  }, [stages]);

  // Flattened list of all entries from the selected stages
  const selectedEntries = React.useMemo(() => {
    const list: Array<SheetBeatmapEntry & { stageName: string }> = [];
    for (const stage of selectedStages) {
      for (const entry of stage.entries) {
        list.push({
          ...entry,
          stageName: stage.stageName,
        });
      }
    }
    return list;
  }, [selectedStages]);

  const isAllSelected = stages.length > 0 && selectedStageNames.size === stages.length;

  const toggleAllStages = () => {
    if (isAllSelected) {
      setSelectedStageNames(new Set());
    } else {
      setSelectedStageNames(new Set(stages.map((s) => s.stageName)));
    }
  };

  const toggleStage = (stageName: string) => {
    setSelectedStageNames((prev) => {
      const next = new Set(prev);
      if (next.has(stageName)) {
        next.delete(stageName);
      } else {
        next.add(stageName);
      }
      return next;
    });
  };

  React.useEffect(() => {
    if (stages.length > 0 && selectedEntries.length > 0) {
      setActiveTournamentFilter({
        stageName: selectedStages.map((s) => s.stageName).join(', '),
        entries: selectedEntries,
      });
    }
  }, [selectedEntries, selectedStages, stages.length, setActiveTournamentFilter]);

  const handleFetchSheet = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    setIsLoadingSheet(true);

    try {
      const parsed = parseGoogleSheetUrl(sheetUrl);
      if (!parsed) {
        throw new Error('Link inválido de planilha do Google Sheets. Certifique-se de que contenha /spreadsheets/d/...');
      }

      const csvText = await fetchSheetCsv(parsed.spreadsheetId, parsed.gid);
      const parsedStages = parseMappoolCsv(csvText);

      if (parsedStages.length === 0) {
        throw new Error('Nenhuma etapa com slots de torneio (NM, HD, HR, DT, TB) ou Beatmap IDs foi encontrada na planilha.');
      }

      setStages(parsedStages);
      // Select all stages by default for convenience
      setSelectedStageNames(new Set(parsedStages.map((s) => s.stageName)));
      const count = parsedStages.reduce((acc, s) => acc + s.entries.length, 0);
      setStatusMessage(`Planilha carregada com sucesso! ${parsedStages.length} etapas encontradas (${count} mapas no total).`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingSheet(false);
    }
  };

  const handleLocalFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || selectedEntries.length === 0) {
      if (selectedEntries.length === 0) {
        setErrorMessage('Selecione pelo menos uma etapa para importar.');
      }
      return;
    }

    const files = Array.from(e.target.files);
    setErrorMessage(null);
    setStatusMessage(null);
    setIsProcessing(true);

    try {
      const requiredEntries = selectedEntries;
      const osuFiles = files.filter((f) => f.name.toLowerCase().endsWith('.osu'));
      const oszFiles = files.filter((f) => f.name.toLowerCase().endsWith('.osz') || f.name.toLowerCase().endsWith('.zip'));

      setProcessProgress({
        current: 0,
        total: osuFiles.length,
        label: `Escaneando ${osuFiles.length} arquivos .osu na pasta...`,
      });

      const matchedOsuItems: Array<{
        text: string;
        fileName: string;
        entry: SheetBeatmapEntry & { stageName: string };
        audioBlob?: Blob;
      }> = [];
      const foundCompositeKeys = new Set<string>();

      for (let i = 0; i < osuFiles.length; i++) {
        const file = osuFiles[i];
        if (i % 25 === 0) {
          setProcessProgress({
            current: i + 1,
            total: osuFiles.length,
            label: `Buscando mapas correspondentes (${i + 1}/${osuFiles.length})...`,
          });
          await new Promise((r) => setTimeout(r, 0));
        }

        const text = await file.text();
        const meta = extractQuickOsuMeta(text);
        const matched = matchOsuFileToTournamentEntry(meta, requiredEntries) as (SheetBeatmapEntry & { stageName: string }) | undefined;

        if (matched) {
          const compKey = `${matched.stageName}-${matched.beatmapId || matched.slot}`;
          if (!foundCompositeKeys.has(compKey)) {
            foundCompositeKeys.add(compKey);

            const dirPath = (file as any).webkitRelativePath
              ? (file as any).webkitRelativePath.split('/').slice(0, -1).join('/')
              : '';
            let audioBlob: Blob | undefined;
            if (dirPath) {
              const companionAudio = files.find((f: any) => {
                const fDir = f.webkitRelativePath ? f.webkitRelativePath.split('/').slice(0, -1).join('/') : '';
                return fDir === dirPath && (f.name.endsWith('.mp3') || f.name.endsWith('.ogg'));
              });
              if (companionAudio) {
                audioBlob = new Blob([await companionAudio.arrayBuffer()], { type: 'audio/mpeg' });
              }
            }

            matchedOsuItems.push({ text, fileName: file.name, entry: matched, audioBlob });
          }
        }

        if (matchedOsuItems.length === requiredEntries.length) break;
      }

      if (matchedOsuItems.length < requiredEntries.length && oszFiles.length > 0) {
        setProcessProgress({
          current: 0,
          total: oszFiles.length,
          label: 'Buscando mapas faltantes nos pacotes .osz...',
        });

        for (const osz of oszFiles) {
          if (matchedOsuItems.length >= requiredEntries.length) break;
          const buf = await osz.arrayBuffer();
          const extracted = await extractOsuFilesFromZip(buf);
          for (const item of extracted) {
            const meta = extractQuickOsuMeta(item.text);
            const matched = matchOsuFileToTournamentEntry(meta, requiredEntries) as (SheetBeatmapEntry & { stageName: string }) | undefined;
            if (matched) {
              const compKey = `${matched.stageName}-${matched.beatmapId || matched.slot}`;
              if (!foundCompositeKeys.has(compKey)) {
                foundCompositeKeys.add(compKey);
                matchedOsuItems.push({
                  text: item.text,
                  fileName: item.fileName,
                  entry: matched,
                  audioBlob: item.audioBlob,
                });
              }
            }
          }
        }
      }

      if (matchedOsuItems.length === 0) {
        throw new Error(
          `Nenhum dos ${requiredEntries.length} mapas das etapas selecionadas foi encontrado na pasta.`
        );
      }

      const results: BeatmapAnalysisResult[] = [];
      const cleanTourney = tournamentName.trim() || 'Torneio';

      for (let i = 0; i < matchedOsuItems.length; i++) {
        const item = matchedOsuItems[i];
        setProcessProgress({
          current: i + 1,
          total: matchedOsuItems.length,
          label: `Analisando [${item.entry.stageName}] ${item.entry.slot}: ${item.entry.songInfo.slice(0, 30)}...`,
        });
        await new Promise((r) => setTimeout(r, 5));

        const analysis = await analyzeBeatmap(item.text, item.fileName, undefined, item.entry.sr, item.audioBlob);
        analysis.modSlot = item.entry.slot;
        analysis.tournamentName = cleanTourney;
        analysis.stageName = item.entry.stageName;
        analysis.id = `${item.entry.beatmapId || analysis.id}_${cleanTourney}_${item.entry.stageName}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        if (item.entry.sr) analysis.stats.starRating = item.entry.sr;
        if (item.entry.bpm) analysis.stats.bpmMode = item.entry.bpm;
        results.push(analysis);
      }

      setPoolMetadata(cleanTourney, selectedStages.map((s) => s.stageName).join(', '));
      await addBeatmaps(results);

      setStatusMessage(
        `Sucesso! ${results.length} de ${requiredEntries.length} mapas das ${selectedStages.length} etapas selecionadas do torneio "${cleanTourney}" foram importados!`
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessing(false);
      setProcessProgress(null);
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleDownloadFromWeb = async () => {
    if (selectedEntries.length === 0) {
      setErrorMessage('Selecione pelo menos uma etapa para baixar.');
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setIsProcessing(true);

    try {
      const requiredEntries = selectedEntries;
      const results: BeatmapAnalysisResult[] = [];
      const errors: string[] = [];
      const cleanTourney = tournamentName.trim() || 'Torneio';

      for (let i = 0; i < requiredEntries.length; i++) {
        const entry = requiredEntries[i];
        setProcessProgress({
          current: i + 1,
          total: requiredEntries.length,
          label: `Baixando [${entry.stageName}] ${entry.slot} (#${entry.beatmapId}) via mirror...`,
        });

        try {
          const osuText = await fetchOsuFileById(entry.beatmapId);
          const analysis = await analyzeBeatmap(osuText, `${entry.slot}_${entry.beatmapId}.osu`, undefined, entry.sr);
          analysis.modSlot = entry.slot;
          analysis.tournamentName = cleanTourney;
          analysis.stageName = entry.stageName;
          analysis.id = `${entry.beatmapId}_${cleanTourney}_${entry.stageName}`.replace(/[^a-zA-Z0-9_-]/g, '_');
          if (entry.sr) analysis.stats.starRating = entry.sr;
          if (entry.bpm) analysis.stats.bpmMode = entry.bpm;
          results.push(analysis);
        } catch {
          errors.push(`[${entry.stageName}] ${entry.slot}`);
        }

        await new Promise((r) => setTimeout(r, 60));
      }

      if (results.length > 0) {
        setPoolMetadata(cleanTourney, selectedStages.map((s) => s.stageName).join(', '));
        await addBeatmaps(results);
        setStatusMessage(
          `Download concluído! ${results.length} de ${requiredEntries.length} mapas foram baixados para o torneio "${cleanTourney}"!`
        );
      }

      if (errors.length > 0) {
        setErrorMessage(`Não foi possível baixar automaticamente os slots: ${errors.join(', ')}. Você pode importá-los via pasta local.`);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessing(false);
      setProcessProgress(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Hidden Folder Input */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard in modern browsers
        webkitdirectory="true"
        directory=""
        multiple
        onChange={handleLocalFolderSelect}
        style={{ display: 'none' }}
      />

      {/* Tournament Name & Sheet URL Input Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            fontWeight: 700,
            color: 'hsl(var(--hsl-l1))',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fas fa-trophy" style={{ color: '#e5b32e' }} />
            Importação de Planilhas e Etapas de Torneio (Google Sheets)
          </span>
          <button
            type="button"
            onClick={() => {
              setSheetUrl(DEFAULT_SHEET_URL);
              setTournamentName('6 Digit World Cup 2026');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'hsl(var(--hsl-h1))',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <i className="fas fa-magic" />
            Preencher 6WC 2026
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
          {/* Tournament Name Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px', flex: '0 1 240px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(var(--hsl-l2))' }}>
              Nome do Torneio:
            </label>
            <input
              type="text"
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              placeholder="Ex: 6WC 2026, OWC 2025..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'hsl(var(--hsl-b5))',
                border: '1px solid hsl(var(--hsl-b2))',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                outline: 'none',
              }}
            />
          </div>

          {/* Sheet URL Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '260px', flex: 1 }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(var(--hsl-l2))' }}>
              Link da Planilha (Google Sheets):
            </label>
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="Cole o link da planilha do Google Sheets aqui..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'hsl(var(--hsl-b5))',
                border: '1px solid hsl(var(--hsl-b2))',
                color: '#fff',
                fontSize: '12px',
                fontFamily: 'AzeretMono, monospace',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleFetchSheet}
            disabled={isLoadingSheet || !sheetUrl.trim()}
            className="btn-osu-big btn-osu-big--beatmapset-header"
            style={{ padding: '8px 18px', width: 'auto', height: '35px' }}
          >
            <span className="btn-osu-big__content">
              <span className="btn-osu-big__left">
                <span className="btn-osu-big__text-top">
                  {isLoadingSheet ? 'Importando...' : 'Carregar Planilha'}
                </span>
              </span>
              <span className="btn-osu-big__icon">
                <i className={`fas ${isLoadingSheet ? 'fa-circle-notch fa-spin' : 'fa-sync-alt'}`} />
              </span>
            </span>
          </button>
        </div>
      </div>

      {/* Stage Selector and Beatmap Checklist */}
      {stages.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            backgroundColor: 'hsl(var(--hsl-b5))',
            borderRadius: '8px',
            padding: '15px',
          }}
        >
          {/* Stage Tabs & Multi-select Buttons */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              paddingBottom: '10px',
              borderBottom: '1px solid hsl(var(--hsl-b3))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'hsl(var(--hsl-l2))' }}>
                <i className="fas fa-layer-group" style={{ marginRight: '5px', color: 'hsl(var(--hsl-h1))' }} />
                Selecionar Etapas para Importar:
              </span>
              <span style={{ fontSize: '11px', color: 'hsl(var(--hsl-c1))', fontWeight: 600 }}>
                {selectedStages.length === stages.length
                  ? `Todas as ${stages.length} etapas selecionadas (${selectedEntries.length} mapas)`
                  : `${selectedStages.length} de ${stages.length} etapas selecionadas (${selectedEntries.length} mapas)`}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Select All Button */}
              <button
                type="button"
                onClick={toggleAllStages}
                className={`osu-radar-player__mod-btn ${isAllSelected ? 'osu-radar-player__mod-btn--active' : ''}`}
                style={{ padding: '5px 12px', fontSize: '11px', fontWeight: 800 }}
              >
                <i className={`fas ${isAllSelected ? 'fa-check-square' : 'fa-square'}`} style={{ marginRight: '6px' }} />
                TODAS AS ETAPAS ({totalMapCount})
              </button>

              {/* Individual Stage Toggle Buttons */}
              {stages.map((stage) => {
                const isSelected = selectedStageNames.has(stage.stageName);
                return (
                  <button
                    key={stage.stageName}
                    type="button"
                    onClick={() => toggleStage(stage.stageName)}
                    className={`osu-radar-player__mod-btn ${isSelected ? 'osu-radar-player__mod-btn--active' : ''}`}
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                  >
                    <i
                      className={`fas ${isSelected ? 'fa-check-circle' : 'fa-circle'}`}
                      style={{ marginRight: '5px', fontSize: '9px', opacity: isSelected ? 1 : 0.4 }}
                    />
                    {stage.stageName} ({stage.entries.length})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons to Source the Beatmaps */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '10px',
            }}
          >
            <button
              type="button"
              disabled={isProcessing || selectedEntries.length === 0}
              onClick={() => folderInputRef.current?.click()}
              className="btn-osu-big btn-osu-big--beatmapset-header"
              style={{ padding: '10px 16px' }}
            >
              <span className="btn-osu-big__content">
                <span className="btn-osu-big__left">
                  <span className="btn-osu-big__text-top">Filtrar da Pasta do osu! (Songs)</span>
                  <span className="btn-osu-big__text-bottom">
                    Importa os {selectedEntries.length} mapas das {selectedStages.length} etapas selecionadas
                  </span>
                </span>
                <span className="btn-osu-big__icon">
                  <i className="fas fa-folder-open" />
                </span>
              </span>
            </button>

            <button
              type="button"
              disabled={isProcessing || selectedEntries.length === 0}
              onClick={handleDownloadFromWeb}
              className="btn-osu-big btn-osu-big--beatmapset-header"
              style={{ padding: '10px 16px' }}
            >
              <span className="btn-osu-big__content">
                <span className="btn-osu-big__left">
                  <span className="btn-osu-big__text-top">Baixar da Web via Mirrors</span>
                  <span className="btn-osu-big__text-bottom">
                    Download direto dos {selectedEntries.length} arquivos .osu por ID
                  </span>
                </span>
                <span className="btn-osu-big__icon">
                  <i className="fas fa-cloud-download-alt" />
                </span>
              </span>
            </button>
          </div>

          {/* Required Beatmaps Preview Grid */}
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'hsl(var(--hsl-l2))',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Mapas a importar ({selectedEntries.length} mapas em {selectedStages.length} etapas):
            </span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '6px',
                maxHeight: '220px',
                overflowY: 'auto',
                paddingRight: '4px',
              }}
            >
              {selectedEntries.map((entry) => {
                const modPrefix = entry.slot.slice(0, 2).toUpperCase();
                const modColor = TOURNAMENT_MOD_COLORS[modPrefix] || TOURNAMENT_MOD_COLORS.NM;

                return (
                  <div
                    key={`${entry.stageName}-${entry.slot}-${entry.beatmapId}`}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'hsl(var(--hsl-b4))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <span
                        className="osu-radar-mod-pill"
                        style={{ backgroundColor: modColor.bg, color: modColor.text }}
                      >
                        {entry.slot}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: 'hsl(var(--hsl-b3))',
                          color: 'hsl(var(--hsl-h1))',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {entry.stageName}
                      </span>
                      <span
                        className="u-ellipsis-overflow"
                        style={{ fontSize: '11px', color: '#fff', fontWeight: 600 }}
                      >
                        {entry.songInfo}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontFamily: 'AzeretMono, monospace',
                        color: 'hsl(var(--hsl-l2))',
                        flexShrink: 0,
                      }}
                    >
                      #{entry.beatmapId}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Processing Loader */}
      {isProcessing && processProgress && (
        <div
          style={{
            padding: '12px 15px',
            borderRadius: '8px',
            backgroundColor: 'hsl(var(--hsl-b5))',
            borderLeft: '3px solid hsl(var(--hsl-h1))',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
            <span style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-circle-notch fa-spin" style={{ color: 'hsl(var(--hsl-h1))' }} />
              {processProgress.label}
            </span>
            <span style={{ color: 'hsl(var(--hsl-c1))', fontFamily: 'AzeretMono, monospace' }}>
              {processProgress.current} / {processProgress.total}
            </span>
          </div>
          <div className="bar bar--beatmap-stats" style={{ width: '100%', height: '6px' }}>
            <div
              className="bar__fill"
              style={{
                width: `${Math.min(100, (processProgress.current / Math.max(1, processProgress.total)) * 100)}%`,
                backgroundColor: 'hsl(var(--hsl-h1))',
              }}
            />
          </div>
        </div>
      )}

      {/* Success Notification */}
      {statusMessage && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '6px',
            backgroundColor: 'hsl(var(--hsl-b5))',
            borderLeft: '3px solid hsl(var(--hsl-lime-1))',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12px',
            color: 'hsl(var(--hsl-lime-1))',
          }}
        >
          <i className="fas fa-check-circle" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Error Alert */}
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
  );
};
