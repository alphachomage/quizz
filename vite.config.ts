import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

import react from '@vitejs/plugin-react';

import { cloudflare } from '@cloudflare/vite-plugin';

import { VitePWA } from 'vite-plugin-pwa';

// Vite = l'outil qui fait tourner le projet en local et fabrique la version finale.
// @cloudflare/vite-plugin = adaptateur officiel Cloudflare : en développement,
//   l'appli tourne dans le vrai runtime Workers (workerd) ; au build, il produit
//   le Worker + les assets prêts pour `npx wrangler deploy` (config : wrangler.toml).
// vite-plugin-pwa = ce qui transforme le site en "WPA" (appli installable, hors-ligne).

export default defineConfig({
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
  plugins: [
    cloudflare(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        // En développement, on désactive le service worker : un vieux SW du navigateur
        // pouvait servir des fichiers périmés après un redémarrage du serveur (écran noir).
        // La WPA (installable + hors-ligne) reste active en production (npm run build).
        enabled: false,
        type: 'module',
      },
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],

      manifest: {
        name: 'VoltQuiz',
        short_name: 'VoltQuiz',
        description: 'Le quiz rapide façon QuizUp : solo avec niveaux de difficulté, ou duel 1v1, directement dans ton navigateur.',
        lang: 'fr',
        theme_color: '#0a1a40',
        background_color: '#0a1a40',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,json,woff2}'],
        // Repli SPA propre : toute URL sans extension renvoie index.html,
        // sauf l'API (qui doit renvoyer sa vraie réponse, y compris les 404).
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // Le fichier de questions grossit à mesure que les thèmes atteignent 1000 questions :
        // on autorise le precache WPA à dépasser la limite par défaut de 2 Mo.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: 'hidden',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.1.0'),
  },
});
