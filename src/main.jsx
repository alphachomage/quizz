import { createRoot } from 'react-dom/client';

import App from './App.jsx';

import ErrorBoundary from './components/ErrorBoundary.jsx';

import './styles.css';

import { registerSW } from 'virtual:pwa-register';

// registerSW = enregistre le "service worker" : c'est le morceau de code
// qui permet à l'appli de s'installer (WPA) et de fonctionner hors-ligne.
registerSW({ immediate: true });

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
