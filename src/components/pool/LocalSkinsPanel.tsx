import React, { useEffect, useRef, useState } from 'react';
import { useSkinStore } from '../../store/useSkinStore';

export const LocalSkinsPanel: React.FC = () => {
  const {
    availableSkins,
    selectedSkinId,
    detectedSkinsDir,
    localBridgeAvailable,
    isLoadingSkin,
    initSkins,
    refreshSkins,
    selectSkin,
    importSkinOskOrZip,
    importSkinFolder,
    removeImportedSkin,
  } = useSkinStore();

  const [skinsDirInput, setSkinsDirInput] = useState(detectedSkinsDir);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const oskInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    initSkins();
  }, [initSkins]);

  useEffect(() => {
    if (detectedSkinsDir && !skinsDirInput) {
      setSkinsDirInput(detectedSkinsDir);
    }
  }, [detectedSkinsDir, skinsDirInput]);

  const handleScanLocalSkins = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await refreshSkins(skinsDirInput.trim() || undefined);
      setStatusMessage('Pasta Skins do osu! sincronizada com sucesso!');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleOskFiles = async (fileList: FileList | File[]) => {
    setErrorMessage(null);
    setStatusMessage(null);
    const files = Array.from(fileList);
    if (files.length === 0) return;

    try {
      let importedCount = 0;
      let lastImportedName = '';
      for (const file of files) {
        const lower = file.name.toLowerCase();
        if (lower.endsWith('.osk') || lower.endsWith('.zip')) {
          const opt = await importSkinOskOrZip(file);
          importedCount++;
          lastImportedName = opt.name;
        }
      }

      if (importedCount === 0) {
        // Check if user dropped/selected unpacked skin files
        const opt = await importSkinFolder(files);
        setStatusMessage(`Skin "${opt.name}" importada e ativada no Preview!`);
      } else {
        setStatusMessage(
          importedCount === 1
            ? `Skin "${lastImportedName}" importada e ativada no Preview!`
            : `${importedCount} skins importadas com sucesso!`
        );
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      if (oskInputRef.current) oskInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <input
        ref={oskInputRef}
        type="file"
        accept=".osk,.zip"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => e.target.files && handleOskFiles(e.target.files)}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard in browsers
        webkitdirectory="true"
        directory=""
        multiple
        style={{ display: 'none' }}
        onChange={(e) => e.target.files && handleOskFiles(e.target.files)}
      />

      {/* Local osu! Skins Directory Auto-Sync */}
      {localBridgeAvailable && (
        <div
          style={{
            padding: '14px',
            borderRadius: '8px',
            backgroundColor: 'hsl(var(--hsl-b5))',
            border: '1px solid hsl(var(--hsl-b3))',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
              <i className="fas fa-palette" style={{ color: 'hsl(var(--hsl-h1))', marginRight: '6px' }} />
              Pasta <code style={{ color: 'hsl(var(--hsl-h1))' }}>Skins</code> instalada no osu!
            </span>
            <span style={{ fontSize: '11px', color: 'hsl(var(--hsl-l2))' }}>
              Detectada automaticamente
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={skinsDirInput}
              onChange={(e) => setSkinsDirInput(e.target.value)}
              placeholder="Ex: C:\Users\Usuário\AppData\Local\osu!\Skins"
              aria-label="Caminho da pasta Skins do osu!"
              style={{
                flex: 1,
                minWidth: '240px',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'hsl(var(--hsl-b6))',
                border: '1px solid hsl(var(--hsl-b2))',
                color: '#fff',
                fontSize: '12px',
              }}
            />
            {typeof window !== 'undefined' &&
              (window.osuSkillsDesktop || window.osuRadarDesktop)?.isElectron && (
              <button
                type="button"
                onClick={async () => {
                  const bridge = window.osuSkillsDesktop || window.osuRadarDesktop;
                  const picked = await bridge?.selectDirectory({
                    title: 'Selecionar pasta Skins do osu!',
                    defaultPath: skinsDirInput.trim() || undefined,
                  });
                  if (picked) {
                    setSkinsDirInput(picked);
                    await refreshSkins(picked);
                    setStatusMessage('Pasta Skins do osu! sincronizada com sucesso!');
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
            <button
              type="button"
              onClick={handleScanLocalSkins}
              className="btn-osu-big btn-osu-big--rounded-small"
              style={{ padding: '0 14px' }}
            >
              <i className="fas fa-sync-alt" style={{ marginRight: '6px' }} />
              <span>Atualizar Pasta Skins</span>
            </button>
          </div>
        </div>
      )}

      {/* Drag & Drop .osk / Skin Folder Importer */}
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
          if (e.dataTransfer.files) handleOskFiles(e.dataTransfer.files);
        }}
        style={{
          padding: '22px 18px',
          borderRadius: '8px',
          backgroundColor: isDragging ? 'hsl(var(--hsl-b3))' : 'hsl(var(--hsl-b5))',
          border: isDragging
            ? '2px dashed hsl(var(--hsl-h1))'
            : '2px dashed hsl(var(--hsl-b2))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '10px',
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
          Importar pacote de Skin <span style={{ color: 'hsl(var(--hsl-h1))' }}>.osk</span> /{' '}
          <span style={{ color: 'hsl(var(--hsl-c1))' }}>.zip</span> ou pasta descompactada
        </div>
        <div style={{ fontSize: '11px', color: 'hsl(var(--hsl-l2))', maxWidth: '500px' }}>
          Suporta sprites em alta definição (@2x), cores de combo, SliderTrackOverride, cursor + cursortrail e hitsounds customizados (.wav, .ogg, .mp3).
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => oskInputRef.current?.click()}
            className="btn-osu-big btn-osu-big--beatmapset-header"
            style={{ width: 'auto', padding: '8px 16px' }}
          >
            <span className="btn-osu-big__content">
              <span className="btn-osu-big__left">
                <span className="btn-osu-big__text-top">Importar Arquivo .osk / .zip</span>
              </span>
              <span className="btn-osu-big__icon">
                <i className="fas fa-file-archive" />
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="btn-osu-big btn-osu-big--beatmapset-header"
            style={{ width: 'auto', padding: '8px 16px' }}
          >
            <span className="btn-osu-big__content">
              <span className="btn-osu-big__left">
                <span className="btn-osu-big__text-top">Selecionar Pasta de Skin</span>
              </span>
              <span className="btn-osu-big__icon">
                <i className="fas fa-folder-open" />
              </span>
            </span>
          </button>
        </div>
      </div>

      {/* Installed & Imported Skins List (1-click switch) */}
      <div
        style={{
          padding: '14px',
          borderRadius: '8px',
          backgroundColor: 'hsl(var(--hsl-b5))',
          border: '1px solid hsl(var(--hsl-b3))',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'hsl(var(--hsl-c1))', textTransform: 'uppercase' }}>
            Skins Disponíveis para o Preview ({availableSkins.length})
          </span>
          {isLoadingSkin && (
            <span style={{ fontSize: '11px', color: 'hsl(var(--hsl-h1))' }}>
              <i className="fas fa-circle-notch fa-spin" style={{ marginRight: '5px' }} />
              Carregando sprites...
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
          {availableSkins.map((skinOpt) => {
            const isActive = skinOpt.id === selectedSkinId;
            return (
              <div
                key={skinOpt.id}
                onClick={() => selectSkin(skinOpt.id)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: isActive ? 'hsla(var(--hsl-h1), 0.16)' : 'hsl(var(--hsl-b4))',
                  border: isActive
                    ? '1px solid hsl(var(--hsl-h1))'
                    : '1px solid hsl(var(--hsl-b3))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <i
                    className={
                      skinOpt.source === 'default'
                        ? 'fas fa-star'
                        : skinOpt.source === 'local_osu'
                        ? 'fas fa-hdd'
                        : 'fas fa-box-open'
                    }
                    style={{
                      color: isActive ? 'hsl(var(--hsl-h1))' : 'hsl(var(--hsl-l2))',
                      fontSize: '12px',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    className="u-ellipsis-overflow"
                    style={{
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 600,
                      color: '#fff',
                    }}
                  >
                    {skinOpt.name}
                  </span>
                  <span
                    className="osu-skills-mod-pill"
                    style={{
                      backgroundColor: 'hsl(var(--hsl-b6))',
                      color: 'hsl(var(--hsl-l2))',
                      fontSize: '9px',
                    }}
                  >
                    {skinOpt.source === 'default'
                      ? 'PADRÃO'
                      : skinOpt.source === 'local_osu'
                      ? 'OSU! SKINS'
                      : 'IMPORTADA'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {isActive && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'hsl(var(--hsl-h1))',
                      }}
                    >
                      <i className="fas fa-check" style={{ marginRight: '4px' }} />
                      Em uso
                    </span>
                  )}
                  {skinOpt.source === 'imported' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImportedSkin(skinOpt.id);
                      }}
                      className="btn-osu-big btn-osu-big--rounded-small"
                      title="Remover skin importada"
                    >
                      <i className="fas fa-trash" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {statusMessage && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '6px',
            backgroundColor: 'hsl(var(--hsl-b5))',
            borderLeft: '3px solid hsl(var(--hsl-lime-1))',
            fontSize: '12px',
            color: 'hsl(var(--hsl-lime-1))',
          }}
        >
          <i className="fas fa-check-circle" style={{ marginRight: '6px' }} />
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '6px',
            backgroundColor: 'hsl(var(--hsl-b5))',
            borderLeft: '3px solid hsl(var(--hsl-red-1))',
            fontSize: '12px',
            color: 'hsl(var(--hsl-red-1))',
          }}
        >
          <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }} />
          {errorMessage}
        </div>
      )}
    </div>
  );
};
