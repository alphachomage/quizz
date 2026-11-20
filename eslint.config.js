// eslint.config.js — configuration ESLint "flat" de VoltQuiz.
// Basée sur le plan de refactorisation (§6.3) :
// - react-hooks/rules-of-hooks en erreur, exhaustive-deps en warning
// - aucun console.log, aucune variable inutilisée (warning)
// - règles d'architecture R1-R5 en ERREUR (no-restricted-imports / globals / properties) :
//   R1  lib/ n'importe JAMAIS react, app/, features/, shared/
//   R2  data/ n'importe que lib/ ; lib/ n'importe jamais data/
//   R3  shared/ n'importe que lib/ + react (+ shared/ en interne)
//   R4  features/X n'importe que react, lib/, shared/, app/contexts/ (lecture seule)
//       et app/urlFlags.js (exception) — jamais features/Y
//   R5  aucun composant ne touche localStorage / window.location directement
//       → lib/storage.js, lib/nav.js et app/urlFlags.js uniquement
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'backups/**',
      'coverage/**',
      '.wrangler/**',
      'public/**',
      'package-lock.json',
    ],
  },
  {
    // Scripts Node (build) : console autorisé (ce ne sont pas des écrans).
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['src/**/*.{js,jsx}', 'worker.js', 'worker-api.js', 'durable-objects/**/*.js', 'vite.config.js', 'vitest.config.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'error',
      // R5 : localStorage/sessionStorage en ERREUR partout (le bloc src/lib/** plus
      // bas ré-autorise la couche stockage, qui est le point d'accès légitime).
      'no-restricted-globals': ['error', 'localStorage', 'sessionStorage'],
    },
  },

  // ===== R1 + R2 : lib/ n'importe jamais react/app/features/shared/data =====
  {
    files: ['src/lib/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'R1 : lib/ n’importe jamais react.' },
            { name: 'react-dom', message: 'R1 : lib/ n’importe jamais react-dom.' },
          ],
          patterns: [
            { group: ['@app/*', '@features/*', '@shared/*'], message: 'R1 : lib/ n’importe jamais app/, features/ ni shared/.' },
            { group: ['@data/*', '../data/*', '../../data/*'], message: 'R2 : lib/ n’importe jamais data/.' },
            { group: ['../app/*', '../features/*', '../shared/*', '../components/*'], message: 'R1 : lib/ n’importe jamais app/, features/ ni shared/.' },
          ],
        },
      ],
    },
  },

  // ===== R2 : data/ n'importe QUE lib/ (et ses propres fichiers) =====
  {
    files: ['src/data/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [],
          patterns: [
            { group: ['@app/*', '@features/*', '@shared/*', 'react', 'react-dom'], message: 'R2 : data/ n’importe que lib/ (et ses fichiers internes).' },
            { group: ['../app/*', '../features/*', '../shared/*'], message: 'R2 : data/ n’importe que lib/.' },
          ],
        },
      ],
    },
  },

  // ===== R3 : shared/ n'importe QUE lib/ + react (+ shared/ en interne) =====
  {
    files: ['src/shared/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [],
          patterns: [
            { group: ['@app/*', '@features/*', '@data/*'], message: 'R3 : shared/ n’importe que lib/ + react (+ shared/ en interne).' },
            { group: ['../app/*', '../features/*', '../data/*', '../../app/*', '../../features/*', '../../data/*'], message: 'R3 : shared/ n’importe que lib/ + react.' },
          ],
        },
      ],
    },
  },

  // ===== R4 : features/X n'importe QUE react, lib/, shared/, app/contexts/
  // (lecture seule) et app/urlFlags.js (exception) — JAMAIS features/Y =====
  {
    files: ['src/features/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [],
          patterns: [
            { group: ['@features/*'], message: 'R4 : features/X n’importe jamais features/Y — passer par shared/ ou app/.' },
            { group: ['../features/*', '../../features/*'], message: 'R4 : features/X n’importe jamais features/Y.' },
            {
              // Negative lookahead : tout @app/* est interdit SAUF urlFlags.js et contexts/
              regex: '^@app/(?!urlFlags\\.js|contexts/)',
              message: 'R4 : depuis features/, seuls app/urlFlags.js et app/contexts/ (lecture seule) sont autorisés.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{js,jsx}', 'worker.js', 'worker-api.js', 'durable-objects/**/*.js'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'location',
          message: 'R5 : window.location est interdit hors app/urlFlags.js et lib/nav.js — passer par une fonction de ces modules.',
        },
        {
          object: 'window',
          property: 'history',
          message: 'R5 : window.history est interdit hors app/urlFlags.js — utiliser retirerFlagsUrl().',
        },
        {
          object: 'document',
          property: 'location',
          message: 'R5 : document.location est interdit hors app/urlFlags.js et lib/nav.js.',
        },
      ],
    },
  },

  // ===== R5 : points d'accès autorisés aux globales "bas niveau" =====
  // lib/ (stockage + nav) et app/urlFlags.js sont les SEULS modules autorisés.
  {
    files: ['src/lib/**/*.{js,jsx}', 'src/app/urlFlags.js'],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
    },
  },
];
