import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './app/App.jsx';

import ErrorBoundary from './shared/ui/ErrorBoundary.jsx';

import './styles.css';

import { registerSW } from 'virtual:pwa-register';

import { preloadFromServer, flushPendingWrites } from '@lib/storage.js';
import { migrateRogue } from '@lib/migrate.js';

// registerSW = enregistre le "service worker" : c'est le morceau de code
// qui permet à l'appli de s'installer (WPA) et de fonctionner hors-ligne.
// autoUpdate vérifie les mises à jour du SW environ toutes les heures : on resserre
// à 5 min pour qu'un onglet ouvert longtemps ne reste pas sur un vieux bundle
// (un vieux SW servait indéfiniment son ancien precache, d'où « ça ne marche
// qu'après avoir vidé le cache »).
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, r) {
    if (r) setInterval(() => r.update(), 5 * 60 * 1000);
  },
});

// En mode stockage 'd1' (défaut ; ?stockage=local pour forcer le local) : pré-charge les clés depuis le serveur
// dans le cache local AVANT le rendu (en 'local', c'est un no-op). Les écritures locales
// en attente d'envoi serveur (file pending) sont poussées juste après, et à chaque
// reconnexion ('online').
// Migration one-shot (purge de l'ancien mode Survie, remplacé par Rogue Quizz).
migrateRogue();
preloadFromServer();
window.addEventListener('online', () => {
  void flushPendingWrites();
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Élément #root introuvable dans index.html');
createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
