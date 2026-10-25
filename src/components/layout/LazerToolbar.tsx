import React, { useState, useRef, useEffect } from 'react';
import { usePoolStore } from '../../store/usePoolStore';
import { useAudioStore } from '../../store/useAudioStore';

interface LazerToolbarProps {
  activeTab: 'select' | 'overview';
  onTabChange: (tab: 'select' | 'overview') => void;
  onOpenUpload?: () => void;
}

export const LazerToolbar: React.FC<LazerToolbarProps> = ({
  activeTab,
  onTabChange,
  onOpenUpload,
}) => {
  const {
    resetAllData,
    currentPool,
    audioSyncStatus,
    startAudioSync,
    clearAudioCache,
    exportPoolJson,
    importPoolJson,
  } = usePoolStore();

  const { volume, isMuted, setVolume, toggleMute } = useAudioStore();

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [isClearingAudio, setIsClearingAudio] = useState(false);
  const audioMenuRef = useRef<HTMLDivElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const maps = currentPool.maps;
  const cachedAudioCount = maps.filter((m) => m.audioBlob).length;
  const totalMaps = maps.length;
  const cachedBytes = maps.reduce((acc, m) => acc + (m.audioBlob?.size || 0), 0);
  const cachedMb = (cachedBytes / (1024 * 1024)).toFixed(1);

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

  const handleExportJson = () => {
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

  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const ok = await importPoolJson(text);
    if (!ok) {
      alert('Arquivo JSON inválido para osu!radar.');
    }
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  };

  return (
    <>
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json"
        onChange={handleImportJsonFile}
        style={{ display: 'none' }}
      />

      {/* Official ppy/osu-web Pinned Top Navbar (layout/header.blade.php + _nav2.blade.php) */}
      <div className="js-pinned-header no-print nav2-header">
        <div className="nav2-header__body">
          <div className="nav2-header__menu-bg" data-visibility="hidden" />
          <div className="nav2-header__triangles" />
          <div className="nav2-header__transition-overlay" />

          <div className="osu-page">
            <div className="nav2">
              <div className="nav2__colgroup nav2__colgroup--menu">
                {/* Official osu!lazer Logo */}
                <div className="nav2__col nav2__col--logo">
                  <a
                    href="#select"
                    onClick={(e) => {
                      e.preventDefault();
                      onTabChange('select');
                    }}
                    className="nav2__logo-link"
                    title="osu!radar"
                  >
                    <div className="nav2__logo nav2__logo--bg" />
                    <div className="nav2__logo" />
                  </a>
                </div>

                {/* Menu Item 1: Beatmaps / Mappool */}
                <div className="nav2__col nav2__col--menu">
                  <a
                    href="#select"
                    onClick={(e) => {
                      e.preventDefault();
                      onTabChange('select');
                    }}
                    className={`nav2__menu-link-main ${activeTab === 'select' ? 'js-menu--active' : ''}`}
                  >
                    <span className="u-relative">
                      beatmaps
                      {activeTab === 'select' && (
                        <span className="nav2__menu-link-bar u-section--bg-normal" />
                      )}
                    </span>
                  </a>
                </div>

                {/* Menu Item 2: Rankings / Radar da Pool */}
                <div className="nav2__col nav2__col--menu">
                  <a
                    href="#overview"
                    onClick={(e) => {
                      e.preventDefault();
                      onTabChange('overview');
                    }}
                    className={`nav2__menu-link-main ${activeTab === 'overview' ? 'js-menu--active' : ''}`}
                  >
                    <span className="u-relative">
                      radar da pool
                      {activeTab === 'overview' && (
                        <span className="nav2__menu-link-bar u-section--bg-normal" />
                      )}
                    </span>
                  </a>
                </div>

                {/* Menu Item 3: Importar / Google Sheets */}
                {onOpenUpload && (
                  <div className="nav2__col nav2__col--menu">
                    <a
                      href="#import"
                      onClick={(e) => {
                        e.preventDefault();
                        onOpenUpload();
                      }}
                      className="nav2__menu-link-main"
                    >
                      <span className="u-relative">Importação</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Right Icons & User Avatar */}
              <div className="nav2__colgroup nav2__colgroup--icons">
                {onOpenUpload && (
                  <div className="nav2__col">
                    <button
                      type="button"
                      onClick={onOpenUpload}
                      className="nav-button"
                      title="Importar Beatmaps (.osz / .osu) ou Sincronizar Planilha Google Sheets"
                    >
                      <span className="fas fa-cloud-upload-alt" />
                    </button>
                  </div>
                )}

                <div className="nav2__col">
                  <button
                    type="button"
                    onClick={handleExportJson}
                    disabled={totalMaps === 0}
                    className="nav-button"
                    title="Exportar telemetria da pool (.JSON)"
                  >
                    <span className="fas fa-download" />
                  </button>
                </div>

                <div className="nav2__col">
                  <button
                    type="button"
                    onClick={() => jsonInputRef.current?.click()}
                    className="nav-button"
                    title="Carregar arquivo .JSON da pool"
                  >
                    <span className="fas fa-folder-open" />
                  </button>
                </div>

                {/* Global Page Volume Control */}
                <div
                  className="nav2__col"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '0 6px',
                  }}
                >
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="nav-button"
                    title={
                      isMuted
                        ? 'Som global mutado (Clique para ativar som)'
                        : `Som Global da Página: ${Math.round(volume * 100)}% (Clique para mutar)`
                    }
                  >
                    <span
                      className={`fas fa-volume-${
                        isMuted || volume === 0 ? 'mute' : volume < 0.5 ? 'down' : 'up'
                      }`}
                    />
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="osu-radar-global-volume-slider"
                    style={{
                      width: '60px',
                      height: '4px',
                      cursor: 'pointer',
                      accentColor: 'hsl(var(--hsl-h1))',
                    }}
                    title={`Som Global da Página: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                  />
                </div>

                {/* Audio Cache Status Pill (osu-web notification container style) */}
                {totalMaps > 0 && (
                  <div className="nav2__col nav2__col--notifications" ref={audioMenuRef} style={{ position: 'relative' }}>
                    <div className="nav2__notification-container">
                      <button
                        type="button"
                        onClick={() => setShowAudioMenu(!showAudioMenu)}
                        className="nav-button nav-button--notifications"
                        title="Gerenciador de Áudios em Cache (IndexedDB)"
                      >
                        <span className="notification-icon">
                          <i
                            className={
                              audioSyncStatus?.isSyncing
                                ? 'fas fa-circle-notch fa-spin'
                                : 'fas fa-music'
                            }
                          />
                          <span className="notification-icon__count">
                            {audioSyncStatus?.isSyncing
                              ? `${audioSyncStatus.current}/${audioSyncStatus.total}`
                              : `${cachedAudioCount}/${totalMaps}`}
                          </span>
                        </span>
                      </button>
                    </div>

                    {showAudioMenu && (
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          marginTop: '8px',
                          width: '280px',
                          backgroundColor: 'hsl(var(--hsl-b4))',
                          borderRadius: '10px',
                          padding: '14px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                          zIndex: 1000,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingBottom: '8px',
                            marginBottom: '8px',
                            borderBottom: '1px solid hsl(var(--hsl-b2))',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          <span>
                            <i className="fas fa-hdd" style={{ marginRight: '6px', color: 'hsl(var(--hsl-h1))' }} />
                            Cache de Áudio (IndexedDB)
                          </span>
                          <span style={{ color: 'hsl(var(--hsl-l2))' }}>{cachedMb} MB</span>
                        </div>

                        <p style={{ fontSize: '11px', color: 'hsl(var(--hsl-l2))', margin: '0 0 10px' }}>
                          Os áudios são baixados automaticamente via mirrors e armazenados no seu navegador.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {cachedAudioCount < totalMaps && (
                            <button
                              type="button"
                              onClick={() => {
                                startAudioSync();
                                setShowAudioMenu(false);
                              }}
                              disabled={audioSyncStatus?.isSyncing}
                              className="btn-osu-big btn-osu-big--full btn-osu-big--rounded-thin"
                            >
                              <div className="btn-osu-big__content btn-osu-big__content--center">
                                <span className="btn-osu-big__icon-inline btn-osu-big__icon-inline--left">
                                  <i className="fas fa-cloud-download-alt" />
                                </span>
                                <span>Baixar Áudios Restantes</span>
                              </div>
                            </button>
                          )}

                          {cachedAudioCount > 0 && (
                            <button
                              type="button"
                              onClick={handleClearAudio}
                              disabled={isClearingAudio}
                              className="btn-osu-big btn-osu-big--danger btn-osu-big--full btn-osu-big--rounded-thin"
                            >
                              <div className="btn-osu-big__content btn-osu-big__content--center">
                                <span className="btn-osu-big__icon-inline btn-osu-big__icon-inline--left">
                                  <i className="fas fa-trash" />
                                </span>
                                <span>{isClearingAudio ? 'Limpando...' : 'Limpar Cache de Áudio'}</span>
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Reset All Button */}
                <div className="nav2__col">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="nav-button"
                    title="Resetar todos os mapas e limpar banco IndexedDB"
                  >
                    <span className="fas fa-redo-alt" />
                  </button>
                </div>

                {/* Official osu-web User Avatar */}
                <div className="nav2__col nav2__col--avatar">
                  <span
                    className="avatar avatar--nav2"
                    style={{
                      backgroundImage: 'url(/images/layout/avatar-guest@2x.png)',
                    }}
                    title="Capitão • 6WC"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Official ppy/osu-web Page Header v4 (layout/_page_header_v4.blade.php) */}
      <div className={`header-v4 ${activeTab === 'select' ? 'header-v4--beatmapsets' : 'header-v4--rankings'}`}>
        <div
          className="header-v4__container header-v4__container--main"
          style={{ paddingTop: '50px', minHeight: '105px' }}
        >
          <div className="header-v4__bg-container">
            <div className="header-v4__bg" />
          </div>

          <div className="header-v4__content">
            <div
              className="header-v4__row header-v4__row--title"
              style={{ justifyContent: 'space-between', gap: '12px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <div className="header-v4__icon" />
                <div className="header-v4__title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>
                    {activeTab === 'select' ? 'listagem de beatmaps' : 'radar & inteligência da pool'}
                  </span>
                </div>
              </div>

              {/* Action Buttons in Header Title Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {onOpenUpload && (
                  <button
                    type="button"
                    onClick={onOpenUpload}
                    className="btn-osu-big btn-osu-big--rounded-small"
                  >
                    <div className="btn-osu-big__content">
                      <span className="btn-osu-big__icon-inline btn-osu-big__icon-inline--left">
                        <i className="fas fa-plus-circle" />
                      </span>
                      <span>Importação</span>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="btn-osu-big btn-osu-big--danger btn-osu-big--rounded-small"
                >
                  <div className="btn-osu-big__content">
                    <span className="btn-osu-big__icon-inline btn-osu-big__icon-inline--left">
                      <i className="fas fa-trash-alt" />
                    </span>
                    <span>resetar tudo</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-navigation bar (header-v4__row--bar + header-nav-v4) */}
        <div className="header-v4__container">
          <div className="header-v4__content">
            <div
              className="header-v4__row header-v4__row--bar"
              style={{ justifyContent: 'space-between', gap: '15px' }}
            >
              <ul className="header-nav-v4 header-nav-v4--list" style={{ display: 'flex' }}>
                <li className="header-nav-v4__item">
                  <a
                    href="#select"
                    onClick={(e) => {
                      e.preventDefault();
                      onTabChange('select');
                    }}
                    className={`header-nav-v4__link ${
                      activeTab === 'select' ? 'header-nav-v4__link--active' : ''
                    }`}
                  >
                    <span className="fake-bold" data-content="listagem e visualizador">
                      listagem e visualizador
                    </span>
                    <span className="header-nav-item-count">{totalMaps}</span>
                  </a>
                </li>

                <li className="header-nav-v4__item">
                  <a
                    href="#overview"
                    onClick={(e) => {
                      e.preventDefault();
                      onTabChange('overview');
                    }}
                    className={`header-nav-v4__link ${
                      activeTab === 'overview' ? 'header-nav-v4__link--active' : ''
                    }`}
                  >
                    <span className="fake-bold" data-content="radar de skills & anomalias">
                      radar de skills & anomalias
                    </span>
                  </a>
                </li>

                {onOpenUpload && (
                  <li className="header-nav-v4__item">
                    <a
                      href="#upload"
                      onClick={(e) => {
                        e.preventDefault();
                        onOpenUpload();
                      }}
                      className="header-nav-v4__link"
                    >
                      <span className="fake-bold" data-content="sincronizar google sheets">
                        sincronizar google sheets
                      </span>
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div
          className="osu-radar-modal-backdrop"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="osu-radar-modal"
            style={{ maxWidth: '460px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="osu-radar-modal__header">
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>
                <i className="fas fa-exclamation-triangle" style={{ color: '#ed1221', marginRight: '8px' }} />
                Resetar Mappool & Limpar Banco
              </span>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="btn-osu-big btn-osu-big--rounded-small"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="osu-radar-modal__body">
              <p style={{ fontSize: '13px', color: 'hsl(var(--hsl-l1))', marginBottom: '12px' }}>
                Você tem certeza de que deseja apagar todos os beatmaps carregados e limpar o banco de dados IndexedDB?
              </p>
              <div className="warning-box" style={{ marginBottom: '16px' }}>
                Esta ação é irreversível e excluirá todos os mapas e áudios em cache local.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="btn-osu-big btn-osu-big--rounded-thin"
                >
                  <span>Cancelar</span>
                </button>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={handleConfirmReset}
                  className="btn-osu-big btn-osu-big--danger btn-osu-big--rounded-thin"
                >
                  <div className="btn-osu-big__content">
                    <span className="btn-osu-big__icon-inline btn-osu-big__icon-inline--left">
                      <i className="fas fa-redo-alt" />
                    </span>
                    <span>{isResetting ? 'Limpando...' : 'Confirmar e Resetar Tudo'}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
