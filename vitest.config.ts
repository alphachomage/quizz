// vitest.config.ts — configuration de la suite de tests, SÉPARÉE de vite.config.ts.
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
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{js,jsx,ts,tsx}'],
    coverage: {
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: ['src/data/**', 'src/main.tsx'], // data = validé par test:data ; main = bootstrap PWA
      // Seuils appliqués en CI (npm run test:coverage) : plancher actuel, à relever
      // (ratchet) quand la couverture monte. Ne jamais les baisser.
      thresholds: {
        global: { statements: 55, branches: 48, functions: 52, lines: 58 },
        'src/lib/**': { statements: 62, branches: 62, functions: 74, lines: 63 },
      },
    },
  },
});
