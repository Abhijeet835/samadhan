import React from 'react';
import ReactDOM from 'react-dom/client';

import './i18n';
import App from './App.jsx';
import './index.css';

// PWA: prompt-based update (never silently reload mid-wizard/payment).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      onNeedRefresh() {
        window.dispatchEvent(new CustomEvent('samadhan:sw-update'));
      },
    });
  }).catch(() => { /* plugin unavailable */ });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
