import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './app/App.jsx';

import ErrorBoundary from './shared/ui/ErrorBoundary.jsx';

import './styles.css';

import { registerSW } from 'virtual:pwa-register';

import { preloadFromServer } from '@lib/storage.js';

// registerSW = enregistre le "service worker" : c'est le morceau de code
// qui permet à l'appli de s'installer (WPA) et de fonctionner hors-ligne.
registerSW({ immediate: true });

// En mode stockage 'd1' (?stockage=d1) : pré-charge les clés depuis le serveur
// dans le cache local AVANT le rendu (en 'local', c'est un no-op).
preloadFromServer();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
