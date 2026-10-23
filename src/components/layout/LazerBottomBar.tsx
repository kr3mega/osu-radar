import React from 'react';

interface LazerBottomBarProps {
  onBackClick: () => void;
  onOpenUpload: () => void;
}

/**
 * Official ppy/osu-web Footer (resources/views/layout/footer.blade.php)
 */
export const LazerBottomBar: React.FC<LazerBottomBarProps> = ({
  onBackClick,
  onOpenUpload,
}) => {
  return (
    <footer className="no-print footer">
      <div className="footer__row">
        <a
          className="footer__link"
          href="#select"
          onClick={(e) => {
            e.preventDefault();
            onBackClick();
          }}
        >
          Listagem de Beatmaps
        </a>
        <a
          className="footer__link"
          href="#upload"
          onClick={(e) => {
            e.preventDefault();
            onOpenUpload();
          }}
        >
          Importar Mappool / Google Sheets
        </a>
        <a
          className="footer__link"
          href="https://osu.ppy.sh"
          target="_blank"
          rel="noopener noreferrer"
        >
          osu.ppy.sh
        </a>
        <a
          className="footer__link"
          href="https://github.com/ppy/osu-web"
          target="_blank"
          rel="noopener noreferrer"
        >
          ppy/osu-web
        </a>
      </div>
      <div className="footer__row">ppy powered · osu!radar mappool intelligence</div>
    </footer>
  );
};
