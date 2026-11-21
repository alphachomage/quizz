// tests/setup.js — mocks globaux exécutés avant chaque test.
// Objectif : que les modules de l'appli (sons Web Audio, vibrations, stockage,
// canvas, matchMedia, fetch) tournent en jsdom sans navigateur.
import '@testing-library/jest-dom/vitest';

import { webcrypto } from 'node:crypto';

// --- Stockage propre à chaque test ---
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

// --- crypto.subtle (hachage des mots de passe) : celui de Node si jsdom ne l'a pas ---
if (!globalThis.crypto || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

// --- Web Audio : contexte factice avec la chaîne de nœuds utilisée par sons.js ---
function nœudFactice() {
  return {
    connect() {},
    disconnect() {},
    start() {},
    stop() {},
    gain: { value: 0, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
    frequency: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
    detune: { value: 0 },
    Q: { value: 0 },
    type: 'sine',
  };
}
class AudioContextFactice {
  constructor() {
    this.currentTime = 0;
    this.destination = nœudFactice();
    this.state = 'running';
  }
  createOscillator() { return nœudFactice(); }
  createGain() { return nœudFactice(); }
  createBiquadFilter() { return nœudFactice(); }
  createBuffer() { return { getChannelData: () => new Float32Array(128), length: 128 }; }
  createBufferSource() { return { ...nœudFactice(), buffer: null, loop: false }; }
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}
// On remplace systématiquement (jsdom peut définir un AudioContext partiel).
window.AudioContext = AudioContextFactice;
window.webkitAudioContext = AudioContextFactice;

// --- Presse-papiers (src/lib/share.js : copier le résultat) ---
if (!window.navigator.clipboard) {
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText: () => Promise.resolve(), readText: () => Promise.resolve('') },
    configurable: true,
  });
}

// --- Vibrations ---
Object.defineProperty(window.navigator, 'vibrate', {
  value: () => true,
  configurable: true,
});

// --- matchMedia (requêtes média) ---
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  });
}

// --- fetch : aucune réponse réseau en test (404 par défaut) ---
if (typeof globalThis.fetch !== 'function') {
  globalThis.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
}

// --- Canvas (génération de l'image de partage) : contexte factice sans effets ---
window.HTMLCanvasElement.prototype.getContext = () => null;

// --- Divers appels navigateur utilisés par l'interface ---
window.HTMLElement.prototype.scrollIntoView = () => {};
Object.defineProperty(window.URL, 'createObjectURL', { value: () => 'blob:factice', configurable: true });
Object.defineProperty(window.URL, 'revokeObjectURL', { value: () => {}, configurable: true });
