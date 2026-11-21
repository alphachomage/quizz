/// <reference types="vite/client" />

// Module virtuel injecté par vite-plugin-pwa (registerSW) :
declare module 'virtual:pwa-register' {
  export function registerSW(options?: { immediate?: boolean }): void;
}
