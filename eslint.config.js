// eslint.config.js — configuration ESLint "flat" de VoltQuiz.
// - react-hooks/rules-of-hooks en erreur, exhaustive-deps en warning
// - aucun console.log, aucune variable inutilisée (warning)
// - règles d'architecture R1-R5 en ERREUR (no-restricted-imports / globals / properties)
// - .ts/.tsx : parser typescript-eslint (bloc dédié), mêmes règles de base
//   R1  lib/ n'importe JAMAIS react, app/, features/, shared/
//   R2  data/ n'importe que lib/ ; lib/ n'importe jamais data/
//   R3  shared/ n'importe que lib/ + react (+ shared/ en interne)
//   R4  features/X n'importe que react, lib/, shared/, app/contexts/ (lecture seule)
//       et app/urlFlags.js (exception) — jamais features/Y
//   R5  aucun composant ne touche localStorage / window.location directement
//       → lib/storage, lib/nav et app/urlFlags uniquement
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const SRC_ANY = 'src/**/*.{js,jsx,ts,tsx}';
const WORKER_ANY = ['worker.{js,ts}', 'worker-api.{js,ts}', 'durable-objects/**/*.{js,ts}'];
const CONFIG_ANY = ['vite.config.{js,ts}', 'vitest.config.{js,ts}', 'eslint.config.{js,ts}'];

const baseRules = {
  ...js.configs.recommended.rules,
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
  'react-refresh/only-export-components': 'warn',
  'no-console': 'error',
  // R5 : localStorage/sessionStorage/location en ERREUR partout (le bloc exemption
  // plus bas ré-autorise la couche stockage/nav/flags, point d'accès légitime).
  'no-restricted-globals': ['error', 'localStorage', 'sessionStorage', 'location'],
};

const basePlugins = {
  'react-hooks': reactHooks,
  'react-refresh': reactRefresh,
};

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'backups/**', 'coverage/**', '.wrangler/**', 'public/**', 'package-lock.json'],
  },
  {
    // Scripts Node (build) : console autorisé (ce ne sont pas des écrans).
    files: ['scripts/**/*.{mjs,ts}'],
    rules: { 'no-console': 'off' },
  },
  {
    // Bloc JS/JSX (parser espree par défaut).
    files: ['src/**/*.{js,jsx}', ...WORKER_ANY.map((f) => f.replace(/\.(js|ts)\}?/, '.js')).filter((f) => f.endsWith('.js')), ...CONFIG_ANY.map((f) => f.replace(/\.(js|ts)\}?/, '.js'))],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: basePlugins,
    rules: { ...baseRules, 'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] },
  },
  {
    // Bloc TypeScript : parser dédié, mêmes règles (no-unused-vars version TS).
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}', 'worker.ts', 'worker-api.ts', 'durable-objects/**/*.ts', 'vite.config.ts', 'vitest.config.ts', 'eslint.config.ts'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { ...basePlugins, '@typescript-eslint': tseslint.plugin },
    rules: {
      ...baseRules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Ratchet futur : passer à 'error' une fois la migration TS terminée.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // ===== R1 + R2 : lib/ n'importe jamais react/app/features/shared/data =====
  {
    files: ['src/lib/**/*.{js,jsx,ts,tsx}'],
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
    files: ['src/data/**/*.{js,jsx,ts,tsx}'],
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
    files: ['src/shared/**/*.{js,jsx,ts,tsx}'],
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
  // (lecture seule) et app/urlFlags (exception) — JAMAIS features/Y =====
  {
    files: ['src/features/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [],
          patterns: [
            { group: ['@features/*'], message: 'R4 : features/X n’importe jamais features/Y — passer par shared/ ou app/.' },
            { group: ['../features/*', '../../features/*'], message: 'R4 : features/X n’importe jamais features/Y.' },
            {
              // Negative lookahead : tout @app/* est interdit SAUF urlFlags et contexts/
              regex: '^@app/(?!urlFlags\\.(js|ts)|contexts/)',
              message: 'R4 : depuis features/, seuls app/urlFlags et app/contexts/ (lecture seule) sont autorisés.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [SRC_ANY, ...WORKER_ANY],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'location', message: 'R5 : window.location est interdit hors app/urlFlags et lib/nav — passer par une fonction de ces modules.' },
        { object: 'window', property: 'history', message: 'R5 : window.history est interdit hors app/urlFlags — utiliser clearUrlFlags().' },
        { object: 'document', property: 'location', message: 'R5 : document.location est interdit hors app/urlFlags et lib/nav.' },
      ],
    },
  },

  // ===== R5 : points d'accès autorisés aux globales "bas niveau" =====
  {
    files: ['src/lib/storage.{js,ts}', 'src/lib/nav.{js,ts}', 'src/app/urlFlags.{js,ts}'],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
    },
  },
];
