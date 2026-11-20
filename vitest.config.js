// vitest.config.js — configuration de la suite de tests, SÉPARÉE de vite.config.js.
// Aucun plugin Cloudflare/PWA ici : les tests tournent en jsdom pur.
// Alias identique à l'appli : '@' -> src/.
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
      '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx}'],
    coverage: {
      reporter: ['text'],
      include: ['src/lib/**', 'src/components/**'],
    },
  },
});
