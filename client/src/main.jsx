import React from 'react';
import ReactDOM from 'react-dom/client';

import './i18n';
import App from './App.jsx';
import './index.css';
import { markSwUpdateAvailable, setSwUpdater } from './lib/swUpdate.js';

// PWA: autoUpdate activates updated service workers on navigation/reload;
// keep fallback update prompt wired so any waiting worker activates on Refresh.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      onNeedRefresh() {
        markSwUpdateAvailable();
      },
    });
    setSwUpdater(updateSW);
    navigator.serviceWorker.getRegistration?.().then((reg) => {
      if (reg?.waiting) markSwUpdateAvailable();
    }).catch(() => {});
  }).catch(() => { /* plugin unavailable */ });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
