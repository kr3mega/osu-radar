import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './osu-web/css/entrypoints/app.less';
import './osu-radar.less';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackTitle="Erro inesperado na aplicação osu!radar">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
