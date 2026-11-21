// tests/setup.ts — mocks globaux exécutés avant chaque test.
// Objectif : que les modules de l'appli (sons Web Audio, vibrations, stockage,
// canvas, matchMedia, fetch) tournent en jsdom sans navigateur.
import '@testing-library/jest-dom/vitest';

import { webcrypto } from 'node:crypto';
import { beforeEach } from 'vitest';

// --- Stockage propre à chaque test ---
// (window.localStorage plutôt que la globale : no-restricted-globals bloque
// `localStorage` dans les fichiers TS.)
beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

// --- crypto.subtle (hachage des mots de passe) : celui de Node si jsdom ne l'a pas ---
if (!globalThis.crypto || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

// --- Web Audio : context factice avec la chaîne de nœuds utilisée par sons.ts ---
interface FakeParam {
  value: number;
  setValueAtTime(): void;
  linearRampToValueAtTime(): void;
  exponentialRampToValueAtTime(): void;
}
interface FakeGainParam extends FakeParam {
  cancelScheduledValues(): void;
}
interface FakeNode {
  connect(): void;
  disconnect(): void;
  start(): void;
  stop(): void;
  gain: FakeGainParam;
  frequency: FakeParam;
  detune: { value: number };
  Q: { value: number };
  type: string;
}
function nœudFactice(): FakeNode {
  return {
    connect() {},
    disconnect() {},
    start() {},
    stop() {},
    gain: {
      value: 0,
      cancelScheduledValues() {},
      setValueAtTime() {},
      linearRampToValueAtTime() {},
      exponentialRampToValueAtTime() {},
    } satisfies FakeGainParam,
    frequency: {
      value: 0,
      setValueAtTime() {},
      linearRampToValueAtTime() {},
      exponentialRampToValueAtTime() {},
    },
    detune: { value: 0 },
    Q: { value: 0 },
    type: 'sine',
  };
}
class AudioContextFactice {
  currentTime = 0;
  destination: FakeNode = nœudFactice();
  state: 'running' | 'suspended' | 'closed' = 'running';
  createOscillator(): FakeNode {
    return nœudFactice();
  }
  createGain(): FakeNode {
    return nœudFactice();
  }
  createBiquadFilter(): FakeNode {
    return nœudFactice();
  }
  createBuffer(): { getChannelData: () => Float32Array; length: number } {
    return { getChannelData: () => new Float32Array(128), length: 128 };
  }
  createBufferSource(): FakeNode & { buffer: null; loop: boolean } {
    return { ...nœudFactice(), buffer: null, loop: false };
  }
  resume(): Promise<void> {
    return Promise.resolve();
  }
  close(): Promise<void> {
    return Promise.resolve();
  }
}
// On remplace systématiquement (jsdom peut définir un AudioContext partiel).
window.AudioContext = AudioContextFactice as unknown as typeof AudioContext;
Object.defineProperty(window, 'webkitAudioContext', {
  value: AudioContextFactice,
  configurable: true,
});

// --- Presse-papiers (src/lib/share.ts : copier le résultat) ---
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
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// --- fetch : aucune réponse réseau en test (404 par défaut) ---
if (typeof globalThis.fetch !== 'function') {
  globalThis.fetch = (() =>
    Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve(null),
    })) as unknown as typeof fetch;
}

// --- Canvas (génération de l'image de partage) : context factice sans effets ---
window.HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof window.HTMLCanvasElement.prototype.getContext;

// --- Divers appels navigateur utilisés par l'interface ---
window.HTMLElement.prototype.scrollIntoView = () => {};
Object.defineProperty(window.URL, 'createObjectURL', {
  value: () => 'blob:factice',
  configurable: true,
});
Object.defineProperty(window.URL, 'revokeObjectURL', { value: () => {}, configurable: true });
