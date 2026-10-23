import React, { useEffect, useState } from 'react';
import { previewAudioManager, PreviewAudioSnapshot } from '../../lib/osu-preview';
import { usePoolStore } from '../../store/usePoolStore';
import { useAudioStore } from '../../store/useAudioStore';

export const LazerFloatingAudioPlayer: React.FC = () => {
  const [snapshot, setSnapshot] = useState<PreviewAudioSnapshot>(previewAudioManager.getSnapshot());
  const { currentPool } = usePoolStore();
  const { volume, isMuted, setVolume, toggleMute } = useAudioStore();

  useEffect(() => {
    return previewAudioManager.subscribe((snap) => {
      setSnapshot(snap);
    });
  }, []);

  const activeMap = currentPool.maps.find((m) => m.id === snapshot.activeMapId);
  const isVisible = snapshot.state !== 'stopped' && activeMap !== undefined;

  if (!isVisible || !activeMap) return null;

  return (
    <div className="audio-player-floating">
      <div
        className="audio-player audio-player--main"
        data-audio-visible="1"
        data-audio-volume={isMuted || volume === 0 ? 'muted' : volume < 0.33 ? 'silent' : volume < 0.66 ? 'quiet' : 'normal'}
        style={
          {
            '--progress': snapshot.progress,
            '--volume': isMuted ? 0 : volume,
          } as React.CSSProperties
        }
      >
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={() => previewAudioManager.toggle(activeMap)}
          className="audio-player__button audio-player__button--play"
          title={snapshot.state === 'playing' ? 'Pausar preview' : 'Tocar preview'}
        >
          <i
            className={
              snapshot.state === 'loading'
                ? 'fas fa-circle-notch fa-spin'
                : snapshot.state === 'playing'
                ? 'fas fa-pause'
                : 'fas fa-play'
            }
          />
        </button>

        {/* Track Title & Artist */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            margin: '0 8px',
            maxWidth: '180px',
            lineHeight: 1.2,
          }}
        >
          <strong
            className="u-ellipsis-overflow"
            style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}
            title={activeMap.metadata.title}
          >
            {activeMap.metadata.title}
          </strong>
          <span
            className="u-ellipsis-overflow"
            style={{ color: 'hsl(var(--hsl-l2))', fontSize: '10px' }}
          >
            {activeMap.metadata.artist}
          </span>
        </div>

        {/* Progress Bar */}
        <div
          className="audio-player__bar audio-player__bar--progress"
          style={{ cursor: 'default' }}
        >
          <div className="audio-player__bar-current" />
        </div>

        {/* Global Volume Control */}
        <div className="audio-player__volume-control" style={{ gap: '6px' }}>
          <button
            type="button"
            onClick={toggleMute}
            className="audio-player__volume-button"
            title={isMuted ? 'Desmutar som global' : `Som global: ${Math.round(volume * 100)}%`}
          />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{
              width: '50px',
              height: '4px',
              cursor: 'pointer',
              accentColor: 'hsl(var(--hsl-h1))',
            }}
            title={`Som global da página: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => previewAudioManager.stop()}
          className="audio-player__button"
          title="Fechar preview de áudio"
          style={{ marginLeft: '6px', color: 'hsl(var(--hsl-l2))' }}
        >
          <i className="fas fa-times" />
        </button>
      </div>
    </div>
  );
};
