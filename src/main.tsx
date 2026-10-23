import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './osu-web/css/entrypoints/app.less';
import './osu-radar.less';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
