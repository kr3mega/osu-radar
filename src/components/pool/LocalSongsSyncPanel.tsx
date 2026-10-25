import React, { useEffect, useRef, useState } from 'react';
import {
  detectLocalOsuSongsFolder,
  LocalBridgeDetection,
  LocalLibrarySyncProgress,
  syncFromBrowserDirectoryFiles,
  syncFromLocalServerBridge,
} from '../../lib/localLibrarySync';
import { usePoolStore } from '../../store/usePoolStore';

export const LocalSongsSyncPanel: React.FC = () => {
  const {
    currentPool,
    upsertLocalBeatmaps,
    clearLocalSongs,
    setFilterOrigin,
  } = usePoolStore();

  const [detection, setDetection] = useState<LocalBridgeDetection | null>(null);
  const [songsPath, setSongsPath] = useState<string>('');
  const [forceReindex, setForceReindex] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<LocalLibrarySyncProgress | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const abortCtrlRef = useRef<AbortController | null>(null);
  const browserFolderRef = useRef<HTMLInputElement | null>(null);

  const localMapsCount = currentPool.maps.filter((m) => m.origin === 'local_songs').length;

  useEffect(() => {
    let mounted = true;
    detectLocalOsuSongsFolder().then((info) => {
      if (!mounted) return;
      setDetection(info);
      if (info.detectedPath) {
        setSongsPath(info.detectedPath);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleStartServerSync = async () => {
    setStatusMsg(null);
    setIsSyncing(true);
    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;

    try {
      const res = await syncFromLocalServerBridge({
        songsDir: songsPath.trim() || undefined,
        existingMaps: usePoolStore.getState().currentPool.maps,
        forceReindex,
        signal: ctrl.signal,
        onProgress: (p) => setSyncProgress(p),
        onCommitBatch: async (maps, removedIds) => {
          await upsertLocalBeatmaps(maps, removedIds);
        },
      });

      setFilterOrigin('local_songs');

      if (res.cancelled) {
        setStatusMsg({
          type: 'success',
          text: `Sincronização pausada. ${res.indexedStandard} mapas osu!standard já analisados foram salvos na sua biblioteca!`,
        });
      } else {
        setStatusMsg({
          type: 'success',
          text:
            res.indexedStandard === 0 && res.skippedCached > 0
              ? `Sua pasta Songs já está 100% atualizada (${res.skippedCached} mapas em cache)!`
              : `Sincronização concluída! ${res.indexedStandard} novos mapas osu!standard indexados (${res.skippedCached} em cache, ${res.skippedNonStandard} outros modos ignorados).`,
        });
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        setStatusMsg({
          type: 'success',
          text: 'Sincronização interrompida pelo usuário.',
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: err instanceof Error ? err.message : String(err),
        });
      }
    } finally {
      setIsSyncing(false);
      abortCtrlRef.current = null;
    }
  };

  const handleBrowserFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setStatusMsg(null);
    setIsSyncing(true);
    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;

    try {
      const res = await syncFromBrowserDirectoryFiles({
        files: fileList,
        signal: ctrl.signal,
        onProgress: (p) => setSyncProgress(p),
        onCommitBatch: async (maps) => {
          await upsertLocalBeatmaps(maps);
        },
      });

      setFilterOrigin('local_songs');
      setStatusMsg({
        type: 'success',
        text: `${res.indexedStandard} mapas osu!standard importados da pasta selecionada (${res.skippedNonStandard} outros modos ignorados)!`,
      });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsSyncing(false);
      abortCtrlRef.current = null;
      if (browserFolderRef.current) browserFolderRef.current.value = '';
    }
  };

  const handleCancelSync = () => {
    abortCtrlRef.current?.abort();
  };

  const progressRatio =
    syncProgress && syncProgress.totalToAnalyze > 0
      ? Math.min(100, Math.round((syncProgress.processed / syncProgress.totalToAnalyze) * 100))
      : 0;

  return (
    <div
      className="osu-radar-training-form"
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
    >
      <input
        ref={browserFolderRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard across modern browsers
        webkitdirectory="true"
        directory=""
        multiple
        onChange={handleBrowserFolderChange}
        style={{ display: 'none' }}
      />

      {/* Primary Card: Direct Local osu!stable Songs Bridge */}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'hsl(var(--hsl-b4))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'hsl(var(--hsl-h1))',
                fontSize: '18px',
              }}
            >
              <i className="fas fa-hdd" />
            </div>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff', display: 'block' }}>
                Sincronizar Pasta Songs do osu!stable
              </span>
              <span style={{ fontSize: '11px', color: 'hsl(var(--hsl-l2))' }}>
                Indexa automaticamente todos os seus mapas instalados para treino de Stream, Jump, Speed, Tech e Accuracy
              </span>
            </div>
          </div>

          {localMapsCount > 0 && (
            <span
              className="osu-radar-mod-pill"
              style={{
                backgroundColor: 'hsl(var(--hsl-b3))',
                color: 'hsl(var(--hsl-lime-1))',
                padding: '4px 10px',
              }}
            >
              <i className="fas fa-check" style={{ marginRight: '5px', fontSize: '9px' }} />
              {localMapsCount} mapas indexados
            </span>
          )}
        </div>

        {detection?.available ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <label
                  htmlFor="osu-songs-path-input"
                  style={{ fontSize: '11px', fontWeight: 700, color: 'hsl(var(--hsl-l1))' }}
                >
                  Caminho da pasta Songs do seu osu!:
                </label>
                {detection.exists && (
                  <span style={{ fontSize: '11px', color: 'hsl(var(--hsl-lime-1))', fontWeight: 600 }}>
                    <i className="fas fa-check-circle" style={{ marginRight: '4px' }} />
                    Detectada automaticamente ({detection.folderCount} pastas de mapas)
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  id="osu-songs-path-input"
                  type="text"
                  value={songsPath}
                  disabled={isSyncing}
                  onChange={(e) => setSongsPath(e.target.value)}
                  placeholder="Ex: C:\Users\Usuário\AppData\Local\osu!\Songs"
                  style={{
                    flex: 1,
                    minWidth: '240px',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'hsl(var(--hsl-b6))',
                    border: '1px solid hsl(var(--hsl-b2))',
                    color: '#fff',
                    fontSize: '12px',
                    fontFamily: 'AzeretMono, monospace',
                    outline: 'none',
                  }}
                />
                {typeof window !== 'undefined' && window.osuRadarDesktop?.isElectron && (
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={async () => {
                      const picked = await window.osuRadarDesktop?.selectDirectory({
                        title: 'Selecionar pasta Songs do osu!',
                        defaultPath: songsPath.trim() || undefined,
                      });
                      if (picked) {
                        setSongsPath(picked);
                      }
                    }}
                    className="btn-osu-big btn-osu-big--rounded-small"
                    style={{ padding: '0 14px', backgroundColor: 'hsl(var(--hsl-b3))' }}
                    title="Abrir seletor nativo de pastas do sistema"
                  >
                    <i className="fas fa-folder-open" style={{ marginRight: '6px' }} />
                    <span>Procurar...</span>
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <label
                htmlFor="force-reindex-checkbox"
                className="osu-radar-brand-checkbox"
                style={{ fontSize: '12px', color: 'hsl(var(--hsl-l1))', cursor: 'pointer' }}
              >
                <input
                  id="force-reindex-checkbox"
                  type="checkbox"
                  className="osu-radar-fallback-check"
                  checked={forceReindex}
                  disabled={isSyncing}
                  onChange={(e) => setForceReindex(e.target.checked)}
                />
                <span>Forçar reanálise completa (ignorar cache incremental)</span>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {!isSyncing ? (
                  <button
                    type="button"
                    onClick={handleStartServerSync}
                    className="btn-osu-big btn-osu-big--beatmapset-header"
                    style={{ width: 'auto', padding: '9px 18px' }}
                  >
                    <span className="btn-osu-big__content">
                      <span className="btn-osu-big__left">
                        <span className="btn-osu-big__text-top">Sincronizar Meu osu! (Songs)</span>
                        <span className="btn-osu-big__text-bottom">Leitura direta em alta velocidade</span>
                      </span>
                      <span className="btn-osu-big__icon">
                        <i className="fas fa-sync-alt" />
                      </span>
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCancelSync}
                    className="btn-osu-big btn-osu-big--beatmapset-header"
                    style={{
                      width: 'auto',
                      padding: '9px 18px',
                      backgroundColor: 'hsl(var(--hsl-red-3))',
                    }}
                  >
                    <span className="btn-osu-big__content">
                      <span className="btn-osu-big__left">
                        <span className="btn-osu-big__text-top">Pausar / Salvar Parcial</span>
                      </span>
                      <span className="btn-osu-big__icon">
                        <i className="fas fa-pause" />
                      </span>
                    </span>
                  </button>
                )}

                {localMapsCount > 0 && !isSyncing && (
                  <button
                    type="button"
                    onClick={() => clearLocalSongs()}
                    className="osu-radar-player__mod-btn"
                    style={{ padding: '8px 12px', fontSize: '11px' }}
                    title="Remove apenas os mapas indexados da pasta Songs, mantendo suas pools de torneios intactas"
                  >
                    <i className="fas fa-trash-alt" style={{ marginRight: '5px' }} />
                    Limpar Índice Local
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: '12px', color: 'hsl(var(--hsl-l2))' }}>
            Modo web estático detectado. Utilize o seletor de pastas abaixo para apontar sua pasta <strong>osu!\Songs</strong> diretamente pelo navegador.
          </div>
        )}
      </div>

      {/* Progress Telemetry */}
      {isSyncing && syncProgress && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '8px',
            backgroundColor: 'hsl(var(--hsl-b5))',
            borderLeft: '3px solid hsl(var(--hsl-h1))',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', gap: '8px' }}>
            <span style={{ color: '#fff', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <i className="fas fa-circle-notch fa-spin" style={{ marginRight: '6px', color: 'hsl(var(--hsl-h1))' }} />
              {syncProgress.currentFileName}
            </span>
            <span style={{ fontFamily: 'AzeretMono, monospace', color: 'hsl(var(--hsl-c1))', flexShrink: 0 }}>
              {syncProgress.totalToAnalyze > 0
                ? `${syncProgress.processed} / ${syncProgress.totalToAnalyze} (${progressRatio}%)`
                : 'Escaneando...'}
            </span>
          </div>

          <progress
            className="osu-radar-progress"
            max={100}
            value={syncProgress.totalToAnalyze > 0 ? progressRatio : 15}
            style={{ width: '100%' }}
          >
            {progressRatio}%
          </progress>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '11px', color: 'hsl(var(--hsl-l2))' }}>
            <span>
              <strong style={{ color: '#fff' }}>{syncProgress.indexedStandard}</strong> osu!std analisados
            </span>
            {syncProgress.skippedCached > 0 && (
              <span>
                <strong style={{ color: 'hsl(var(--hsl-lime-1))' }}>{syncProgress.skippedCached}</strong> já em cache
              </span>
            )}
            {syncProgress.skippedNonStandard > 0 && (
              <span>
                <strong>{syncProgress.skippedNonStandard}</strong> Taiko/Catch/Mania pulados
              </span>
            )}
          </div>
        </div>
      )}

      {/* Browser Folder Picker Fallback */}
      <div
        style={{
          padding: '14px 18px',
          borderRadius: '8px',
          backgroundColor: 'hsl(var(--hsl-b5))',
          border: '1px solid hsl(var(--hsl-b3))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', display: 'block' }}>
            Alternativa: Selecionar Pasta Songs manualmente pelo Navegador
          </span>
          <span style={{ fontSize: '11px', color: 'hsl(var(--hsl-l2))' }}>
            Funciona mesmo sem servidor local — lê os arquivos <code>.osu</code> em lotes leves sem travar a memória
          </span>
        </div>

        <button
          type="button"
          disabled={isSyncing}
          onClick={() => browserFolderRef.current?.click()}
          className="osu-radar-player__mod-btn"
          style={{ padding: '8px 14px', fontSize: '11px', fontWeight: 700 }}
        >
          <i className="fas fa-folder-open" style={{ marginRight: '6px' }} />
          Escolher Pasta...
        </button>
      </div>

      {/* Status Alert */}
      {statusMsg && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '6px',
            backgroundColor: 'hsl(var(--hsl-b5))',
            borderLeft: `3px solid ${
              statusMsg.type === 'success' ? 'hsl(var(--hsl-lime-1))' : 'hsl(var(--hsl-red-1))'
            }`,
            fontSize: '12px',
            color:
              statusMsg.type === 'success' ? 'hsl(var(--hsl-lime-1))' : 'hsl(var(--hsl-red-1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span>
            <i
              className={`fas ${
                statusMsg.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'
              }`}
              style={{ marginRight: '6px' }}
            />
            {statusMsg.text}
          </span>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <i className="fas fa-times" />
          </button>
        </div>
      )}
    </div>
  );
};
