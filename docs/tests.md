# Tests

## Commandes

```bash
npm test                 # toute la suite Vitest (tests/unit + tests/integration + tests/data)
npm run test:game      # UNIQUEMENT le flux solo (tests/integration/game-solo.test.jsx)
npm run test:game:duel / :survival / :daily   # game-duel / game-survival / game-daily
npm run test:unit        # tests/unit/**  ·  npm run test:integration  ·  npm run test:data
npm run test:scoring / :tirage / :similarite / :comptes
npm run test:legacy      # 26 tests historiques node (scripts/legacy-tests.mjs)
npm run test:coverage    # couverture avec seuils appliqués (échoue si en dessous)
```

## Couverture (seuils + ratchet)

`vitest.config.js` (séparé de `vite.config.js`) définit les seuils appliqués par
`npm run test:coverage` et en CI (job `coverage`) :

- global : statements 45 %, branches 40 %, functions 48 %, lignes 50 % ;
- `src/lib/**` : statements 50 %, branches 35 %, functions 55 %, lignes 50 % ;
- exclus : `src/data/**` (validé par `test:data`) et `src/main.jsx` (bootstrap PWA).

C'est un **plancher, à relever (ratchet)** quand la couverture monte — ne jamais le
baisser. La CI échoue si les seuils ne sont pas atteints.

## Arborescence

```
tests/
├── setup.js                      # mocks : localStorage nettoyé, AudioContext, vibrate,
│                                 # matchMedia, crypto.subtle (webcrypto), fetch, canvas
├── fixtures/questions.fixture.js # makeQuestion/makeTheme/mulberry32 — JAMAIS les vrais fichiers
├── unit/lib/                     # scoring, tirage, quotidien, similarite, comptes, badges, schema, repositories
├── unit/features/                # game-draw, result-persist, stats-compute
├── integration/                  # game-solo, game-duel, game-survival, game-daily,
│                                 # app-shell (parcours complet invité -> partie)
└── data/questions-schema.test.js # SEUL test sur le vrai corpus (schéma zod + doublons)
```

## Règles

- `vitest.config.js` : jsdom, globals, alias `@*` identiques à Vite, AUCUN plugin
  Cloudflare/PWA en test.
- Écrans en React.lazy : dans les tests d'intégration, pré-charger le mock
  `@data/questions.js` + les 9 écrans avec les VRAIS timers AVANT `vi.useFakeTimers()`,
  puis attendre en avançant les timers (`vi.advanceTimersByTimeAsync`) — sinon les
  import() dynamiques de Vitest et le scheduler React restent bloqués.
- Timers factices (`vi.useFakeTimers()`) pour le minuteur ; `Math.random` mocké
  (`mulberry32(seed)`) pour des tirages déterministes ; `localStorage.clear()` entre tests.
- Un seul test charge le vrai corpus (`tests/data/`) : les autres utilisent les fixtures.
- Les scores exacts sont vérifiés (solo 285 pts/10 bonnes, duel 175/joueur,
  quotidien 245).
- CI : `npm run lint` + `lint:arch` + `test:unit` + `test:data` + `test:legacy` +
  `build` + matrice d'intégration + couverture sur chaque push/PR (voir
  `docs/deploiement.md`).
