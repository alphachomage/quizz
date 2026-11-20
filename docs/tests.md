# Tests

## Commandes

```bash
npm test                 # toute la suite Vitest (104 tests)
npm run test:partie     # UNIQUEMENT le flux solo (~2 s) — la commande de confiance
npm run test:partie:duel / :survie / :quotidien
npm run test:unit        # tests/unit/**  ·  npm run test:integration  ·  npm run test:data
npm run test:scoring / :tirage / :similarite / :comptes
npm run test:legacy      # 26 tests historiques node (test-unitaire.mjs)
npm run test:coverage    # couverture (vitest --coverage)
```

## Arborescence

```
tests/
├── setup.js                     # mocks : localStorage nettoyé, AudioContext, vibrate,
│                                # matchMedia, crypto.subtle (webcrypto), fetch, canvas
├── fixtures/questions.fixture.js  # makeQuestion/makeTheme/mulberry32 — JAMAIS les vrais fichiers
├── unit/lib/                    # scoring, tirage, quotidien, similarite, comptes, badges, schema, repositories
├── unit/features/               # partie-tirage, resultat-persistance, stats-calculs
├── integration/                 # partie-solo, partie-duel, partie-survie, partie-quotidien,
│                                # app-shell (parcours complet invité -> partie)
└── data/questions-schema.test.js  # SEUL test sur le vrai corpus (schéma + doublons)
```

## Règles

- `vitest.config.js` séparé (jsdom, globals, alias `@*` identiques à Vite, AUCUN plugin
  Cloudflare/PWA en test).
- Écrans en React.lazy : dans les tests d'intégration, pré-charger le mock @data/questions.js
  + les 9 écrans avec les VRAIS timers AVANT `vi.useFakeTimers()`, puis attendre en avançant
  les timers (`vi.advanceTimersByTimeAsync`) — sinon les import() dynamiques de Vitest
  et le scheduler React restent bloqués.
- Timers factices (`vi.useFakeTimers()`) pour le minuteur ; `Math.random` mocké
  (`mulberry32(seed)`) pour des tirages déterministes ; `localStorage.clear()` entre tests.
- Un seul test charge le vrai corpus (`tests/data/`) : les autres utilisent les fixtures.
- Les scores exacts sont vérifiés (solo 285 pts/10 bonnes, duel 175/joueur, quotidien 245).
- CI : `npm run lint` + `lint:arch` + `npm test` + `test:legacy` + `build` sur chaque push/PR.
