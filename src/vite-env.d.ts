/// <reference types="vite/client" />

// Module virtuel injecté par vite-plugin-pwa (registerSW) : on réutilise le vrai type
// RegisterSWOptions (onRegisteredSW, onNeedRefresh...) au lieu d'un sous-ensemble.
declare module 'virtual:pwa-register' {
  import type { RegisterSWOptions } from 'vite-plugin-pwa/types';
  export function registerSW(options?: RegisterSWOptions): void;
}
