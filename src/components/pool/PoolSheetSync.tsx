import React, { useState, useRef } from 'react';
import {
  parseGoogleSheetUrl,
  fetchSheetCsv,
  parseMappoolCsv,
  fetchOsuFileById,
  extractQuickOsuMeta,
  SheetStageGroup,
  SheetBeatmapEntry,
} from '../../utils/sheetParser';
import { extractOsuFilesFromZip } from '../../utils/unzip';
import { analyzeBeatmap } from '../../engine/analyzer';
import { usePoolStore } from '../../store/usePoolStore';
import { BeatmapAnalysisResult } from '../../engine/types';
import {
  Link2,
  FolderSearch,
  CloudDownload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { TOURNAMENT_MOD_COLORS } from '../../utils/osuColors';

const DEFAULT_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1-TX1ykmECyrxFKbNDCI9Z60-hSZ0shG99hxuVnvay2k/edit?gid=217539883#gid=217539883';

export const PoolSheetSync: React.FC = () => {
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [stages, setStages] = useState<SheetStageGroup[]>([]);
  const [selectedStageName, setSelectedStageName] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState<{ current: number; total: number; label: string } | null>(null);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const { addBeatmaps, setPoolMetadata } = usePoolStore();

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
      setSelectedStageName(parsedStages[0].stageName);
      setStatusMessage(`Planilha carregada com sucesso! ${parsedStages.length} etapas encontradas.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingSheet(false);
    }
  };

  const selectedStage = stages.find((s) => s.stageName === selectedStageName) || stages[0];

  // 1. Process files from selected local osu!/Songs folder
  const handleLocalFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedStage) return;

    const files = Array.from(e.target.files);
    setErrorMessage(null);
    setStatusMessage(null);
    setIsProcessing(true);

    try {
      const requiredEntries = selectedStage.entries;
      const idToEntry = new Map<number, SheetBeatmapEntry>();
      for (const entry of requiredEntries) {
        if (entry.beatmapId > 0) idToEntry.set(entry.beatmapId, entry);
      }

      const osuFiles = files.filter((f) => f.name.toLowerCase().endsWith('.osu'));
      const oszFiles = files.filter((f) => f.name.toLowerCase().endsWith('.osz') || f.name.toLowerCase().endsWith('.zip'));

      setProcessProgress({
        current: 0,
        total: osuFiles.length,
        label: `Escaneando ${osuFiles.length} arquivos .osu na pasta...`,
      });

      const matchedOsuItems: Array<{ text: string; fileName: string; entry: SheetBeatmapEntry }> = [];
      const foundIds = new Set<number>();

      // Scan .osu files
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

        let matched = idToEntry.get(meta.beatmapId);
        if (!matched && meta.title && meta.version) {
          matched = requiredEntries.find(
            (entry) =>
              entry.songInfo.toLowerCase().includes(meta.version.toLowerCase()) &&
              (entry.songInfo.toLowerCase().includes(meta.title.toLowerCase()) ||
                meta.title.toLowerCase().includes(entry.songInfo.toLowerCase()))
          );
        }

        if (matched && !foundIds.has(matched.beatmapId)) {
          foundIds.add(matched.beatmapId);
          matchedOsuItems.push({ text, fileName: file.name, entry: matched });
        }

        // If we found all maps in the stage, stop early!
        if (matchedOsuItems.length === requiredEntries.length) break;
      }

      // If still missing maps, inspect .osz files
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
            let matched = idToEntry.get(meta.beatmapId);
            if (!matched && meta.title && meta.version) {
              matched = requiredEntries.find(
                (entry) =>
                  entry.songInfo.toLowerCase().includes(meta.version.toLowerCase()) &&
                  (entry.songInfo.toLowerCase().includes(meta.title.toLowerCase()) ||
                    meta.title.toLowerCase().includes(entry.songInfo.toLowerCase()))
              );
            }
            if (matched && !foundIds.has(matched.beatmapId)) {
              foundIds.add(matched.beatmapId);
              matchedOsuItems.push({ text: item.text, fileName: item.fileName, entry: matched });
            }
          }
        }
      }

      if (matchedOsuItems.length === 0) {
        throw new Error(
          `Nenhum dos ${requiredEntries.length} mapas da etapa "${selectedStage.stageName}" foi encontrado na pasta selecionada.`
        );
      }

      // Analyze matched beatmaps and assign their sheet slots
      const results: BeatmapAnalysisResult[] = [];
      for (let i = 0; i < matchedOsuItems.length; i++) {
        const item = matchedOsuItems[i];
        setProcessProgress({
          current: i + 1,
          total: matchedOsuItems.length,
          label: `Analisando física de ${item.entry.slot}: ${item.entry.songInfo.slice(0, 35)}...`,
        });
        await new Promise((r) => setTimeout(r, 5));

        const analysis = await analyzeBeatmap(item.text, item.fileName);
        analysis.modSlot = item.entry.slot;
        results.push(analysis);
      }

      setPoolMetadata('6 Digit World Cup 2026', selectedStage.stageName);
      await addBeatmaps(results);

      setStatusMessage(
        `Sucesso! ${results.length} de ${requiredEntries.length} mapas da etapa "${selectedStage.stageName}" foram filtrados da sua pasta local e importados com seus slots exatos!`
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessing(false);
      setProcessProgress(null);
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  // 2. Download directly from mirrors
  const handleDownloadFromWeb = async () => {
    if (!selectedStage) return;
    setErrorMessage(null);
    setStatusMessage(null);
    setIsProcessing(true);

    try {
      const requiredEntries = selectedStage.entries;
      const results: BeatmapAnalysisResult[] = [];
      const errors: string[] = [];

      for (let i = 0; i < requiredEntries.length; i++) {
        const entry = requiredEntries[i];
        setProcessProgress({
          current: i + 1,
          total: requiredEntries.length,
          label: `Baixando ${entry.slot} (#${entry.beatmapId}) via mirror...`,
        });

        try {
          const osuText = await fetchOsuFileById(entry.beatmapId);
          const analysis = await analyzeBeatmap(osuText, `${entry.slot}_${entry.beatmapId}.osu`);
          analysis.modSlot = entry.slot;
          results.push(analysis);
        } catch {
          errors.push(entry.slot);
        }

        await new Promise((r) => setTimeout(r, 60));
      }

      if (results.length > 0) {
        setPoolMetadata('6 Digit World Cup 2026', selectedStage.stageName);
        await addBeatmaps(results);
        setStatusMessage(
          `Download concluído! ${results.length} de ${requiredEntries.length} mapas foram baixados e analisados com sucesso.`
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
    <div className="w-full flex flex-col gap-4 text-white">
      {/* Hidden Folder Input */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard in modern browsers
        webkitdirectory="true"
        directory=""
        multiple
        onChange={handleLocalFolderSelect}
        className="hidden"
      />

      {/* URL Input Bar */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-osu-cyan" />
            Link da Planilha de Torneio (Google Sheets)
          </span>
          <button
            type="button"
            onClick={() => setSheetUrl(DEFAULT_SHEET_URL)}
            className="text-[11px] text-osu-pink hover:underline flex items-center gap-1 font-semibold"
          >
            <Sparkles className="w-3 h-3" />
            Preencher 6WC 2026
          </button>
        </label>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="Cole o link da planilha do Google Sheets aqui..."
            className="flex-1 px-3 py-2 rounded-lg bg-[#140a1d] border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-osu-pink transition-colors font-mono"
          />

          <button
            type="button"
            onClick={handleFetchSheet}
            disabled={isLoadingSheet || !sheetUrl.trim()}
            className="px-4 py-2 rounded-lg bg-osu-pink hover:bg-osu-pink/80 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-glowPink transition-all"
          >
            {isLoadingSheet ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Carregando...</span>
              </>
            ) : (
              <span>Carregar Planilha</span>
            )}
          </button>
        </div>
      </div>

      {/* Stage Selector and Beatmap Checklist */}
      {stages.length > 0 && selectedStage && (
        <div className="flex flex-col gap-3 bg-[#13071b]/90 border border-white/10 rounded-xl p-3.5 animate-in fade-in">
          {/* Stage Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap border-b border-white/10 pb-2.5">
            <span className="text-[11px] font-bold uppercase text-white/50 mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-osu-cyan" />
              Etapas:
            </span>
            {stages.map((stage) => {
              const isSelected = stage.stageName === selectedStage.stageName;
              return (
                <button
                  key={stage.stageName}
                  type="button"
                  onClick={() => setSelectedStageName(stage.stageName)}
                  className={`px-2.5 py-1 rounded text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-osu-pink text-white shadow-glowPink'
                      : 'bg-white/5 hover:bg-white/10 text-white/70'
                  }`}
                >
                  <span>{stage.stageName}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-white/40'}`}>
                    {stage.entries.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Buttons to Source the Beatmaps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* Action A: Filter from Local Folder (User Request) */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => folderInputRef.current?.click()}
              className="p-3 rounded-lg bg-[#241334] hover:bg-[#321948] border border-osu-pink/40 hover:border-osu-pink text-white flex items-center gap-3 transition-all text-left shadow-sm disabled:opacity-50 group"
            >
              <div className="p-2.5 rounded-lg bg-osu-pink/20 text-osu-pink group-hover:scale-105 transition-transform">
                <FolderSearch className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black uppercase tracking-wider text-white block">
                  Filtrar da Pasta do osu! (Songs)
                </span>
                <span className="text-[10px] text-white/60 block mt-0.5 truncate">
                  Detecta e importa somente os {selectedStage.entries.length} mapas desta etapa
                </span>
              </div>
            </button>

            {/* Action B: Download from Web Mirrors */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleDownloadFromWeb}
              className="p-3 rounded-lg bg-[#152336] hover:bg-[#1d324e] border border-osu-cyan/40 hover:border-osu-cyan text-white flex items-center gap-3 transition-all text-left shadow-sm disabled:opacity-50 group"
            >
              <div className="p-2.5 rounded-lg bg-osu-cyan/20 text-osu-cyan group-hover:scale-105 transition-transform">
                <CloudDownload className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black uppercase tracking-wider text-white block">
                  Baixar da Web via Mirrors
                </span>
                <span className="text-[10px] text-white/60 block mt-0.5 truncate">
                  Download direto dos {selectedStage.entries.length} arquivos .osu por ID
                </span>
              </div>
            </button>
          </div>

          {/* Required Beatmaps Preview Grid */}
          <div className="mt-2">
            <span className="text-[11px] font-bold uppercase text-white/60 block mb-1.5">
              Mapas definidos para {selectedStage.stageName} ({selectedStage.entries.length} mapas):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {selectedStage.entries.map((entry) => {
                const modPrefix = entry.slot.slice(0, 2).toUpperCase();
                const modColor = TOURNAMENT_MOD_COLORS[modPrefix] || TOURNAMENT_MOD_COLORS.NM;

                return (
                  <div
                    key={`${entry.slot}-${entry.beatmapId}`}
                    className="p-1.5 rounded bg-[#180b23] border border-white/5 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase shrink-0"
                        style={{ backgroundColor: modColor.bg, color: modColor.text }}
                      >
                        {entry.slot}
                      </span>
                      <span className="text-xs text-white/90 truncate font-medium">
                        {entry.songInfo}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-osu-cyan/80 shrink-0">
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
        <div className="p-3.5 rounded-xl bg-[#190d23] border border-osu-pink/40 flex flex-col gap-2 shadow-lg animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-white flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-osu-pink animate-spin" />
              {processProgress.label}
            </span>
            <span className="text-osu-cyan font-mono">
              {processProgress.current} / {processProgress.total}
            </span>
          </div>
          <div className="w-full bg-[#120619] h-2 rounded-full overflow-hidden border border-white/10">
            <div
              className="bg-gradient-to-r from-osu-pink to-osu-cyan h-full transition-all duration-150"
              style={{
                width: `${Math.min(100, (processProgress.current / Math.max(1, processProgress.total)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Success Notification */}
      {statusMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-200">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
