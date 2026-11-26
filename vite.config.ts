import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { defineConfig, type Plugin } from 'vite';

import react from '@vitejs/plugin-react';

import { cloudflare } from '@cloudflare/vite-plugin';

import { VitePWA } from 'vite-plugin-pwa';

// Vite = l'outil qui fait tourner le projet en local et fabrique la version finale.
// @cloudflare/vite-plugin = adaptateur officiel Cloudflare : en développement,
//   l'appli tourne dans le vrai runtime Workers (workerd) ; au build, il produit
//   le Worker + les assets prêts pour `npx wrangler deploy` (config : wrangler.toml).
// vite-plugin-pwa = ce qui transforme le site en "PWA" (appli installable, hors-ligne).

// Génère src/data/theme-manifest.js et public/corpus.json au démarrage de CHAQUE
// `vite` / `vite build`, quelle que soit la commande qui lance Vite (npm run build,
// npm run deploy, ou la commande de build configurée chez Cloudflare). Avant, c'était
// des hooks npm predev/prebuild, sautés par `vite build` direct : corpus.json devait
// alors être versionné dans git (~6 Mo par lot de questions). Coût : ~0,5 s.
function generateCorpus(): Plugin {
  return {
    name: 'voltquiz-generate-corpus',
    enforce: 'pre',
    config() {
      // Vite recharge cette config plusieurs fois par build (environnements client et
      // worker) : un drapeau de processus évite de régénérer 4 fois les mêmes fichiers.
      if (process.env.VQUIZZ_CORPUS_GENERATED) return;
      process.env.VQUIZZ_CORPUS_GENERATED = '1';
      for (const script of ['scripts/gen-manifest.mjs', 'scripts/gen-corpus-json.mjs']) {
        execFileSync(process.execPath, [fileURLToPath(new URL(`./${script}`, import.meta.url))], {
          stdio: 'inherit',
        });
      }
    },
  };
}

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
    generateCorpus(),
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
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-48.png'],

      manifest: {
        name: 'VQuizz',
        short_name: 'VQuizz',
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
        // Les chunks questions-*.js dupliquent corpus.json (précaché) : ils ne servent
        // qu'en repli en ligne si corpus.json est indisponible ou d'une autre version.
        // Pas de runtimeCaching : le corpus est ensuite persisté en IndexedDB, donc inutile.
        globIgnores: ['**/questions-*.js'],
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
