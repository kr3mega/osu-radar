import React, { useEffect, useState } from 'react';

interface ElectronTitlebarProps {
  activeSubtitle?: string;
}

/**
 * Custom frameless osu!lazer-inspired titlebar rendered exclusively inside the Electron desktop app.
 * In standard web browsers (`!window.osuRadarDesktop?.isElectron`), renders nothing.
 */
export const ElectronTitlebar: React.FC<ElectronTitlebarProps> = ({ activeSubtitle }) => {
  const bridge = typeof window !== 'undefined' ? window.osuRadarDesktop : undefined;
  const isCustomFrame = Boolean(bridge?.isElectron && bridge.platform !== 'darwin');

  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isCustomFrame || !bridge) return;

    document.body.classList.add('osu-radar-is-electron');

    let mounted = true;
    bridge.isMaximized().then((val) => {
      if (mounted) setIsMaximized(val);
    });

    const unsubscribe = bridge.onMaximizedChange((val) => {
      if (mounted) setIsMaximized(val);
    });

    return () => {
      mounted = false;
      unsubscribe();
      document.body.classList.remove('osu-radar-is-electron');
    };
  }, [isCustomFrame, bridge]);

  if (!isCustomFrame || !bridge) {
    return null;
  }

  return (
    <header className="osu-radar-titlebar" role="banner" aria-label="Barra de janela osu!radar">
      <div className="osu-radar-titlebar__brand">
        <img
          src="/images/layout/osu-logo.png"
          alt=""
          className="osu-radar-titlebar__logo"
        />
        <span className="osu-radar-titlebar__title">osu!radar</span>
        <span className="osu-radar-titlebar__badge">desktop</span>
        {activeSubtitle && (
          <span className="osu-radar-titlebar__subtitle u-ellipsis-overflow">
            {activeSubtitle}
          </span>
        )}
      </div>

      <div className="osu-radar-titlebar__controls">
        <button
          type="button"
          onClick={() => bridge.minimize()}
          className="osu-radar-titlebar__btn"
          aria-label="Minimizar janela"
          title="Minimizar"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M1 5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>

        <button
          type="button"
          onClick={async () => {
            const next = await bridge.toggleMaximize();
            setIsMaximized(next);
          }}
          className="osu-radar-titlebar__btn"
          aria-label={isMaximized ? 'Restaurar janela' : 'Maximizar janela'}
          title={isMaximized ? 'Restaurar' : 'Maximizar'}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path
                d="M3 1.5h5.5V7H7M1.5 3H7v5.5H1.5z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
              />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <rect
                x="1.5"
                y="1.5"
                width="7"
                height="7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
              />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => bridge.close()}
          className="osu-radar-titlebar__btn osu-radar-titlebar__btn--close"
          aria-label="Fechar osu!radar"
          title="Fechar"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path
              d="M1.8 1.8l6.4 6.4M8.2 1.8L1.8 8.2"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </header>
  );
};
