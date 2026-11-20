// eslint.config.js — configuration ESLint "flat" de VoltQuiz.
// Basée sur le plan de refactorisation (§6.3) :
// - react-hooks/rules-of-hooks en erreur, exhaustive-deps en warning
// - aucun console.log, aucune variable inutilisée (warning)
// - R5 : aucun accès direct à localStorage/sessionStorage hors de la couche
//   de stockage. Tant que src/lib/storage.js n'existe pas (phase 2 du plan),
//   la couche src/lib/ reste le point d'accès légitime : warning ailleurs.
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
      'no-restricted-globals': ['warn', 'localStorage', 'sessionStorage'],
    },
  },
];
