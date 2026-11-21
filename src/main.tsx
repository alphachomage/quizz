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

// En mode stockage 'd1' (défaut ; ?stockage=local pour forcer le local) : pré-charge les clés depuis le serveur
// dans le cache local AVANT le rendu (en 'local', c'est un no-op).
preloadFromServer();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Élément #root introuvable dans index.html');
createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
