# Tests

## Commandes

```bash
npm test                 # toute la suite Vitest (tests/unit + tests/integration + tests/data)
npm run test:game      # UNIQUEMENT le flux solo (tests/integration/game-solo.test.tsx)
npm run test:game:duel / :survival / :daily   # game-duel / game-survival / game-daily
npm run test:unit        # tests/unit/**  ·  npm run test:integration  ·  npm run test:data
npm run test:scoring / :draw / :similarity / :accounts
npm run test:coverage    # couverture avec seuils appliqués (échoue si en dessous)
npm run typecheck        # tsc --noEmit (strict TS) — aussi en CI
```

## Couverture (seuils + ratchet)

`vitest.config.js` (séparé de `vite.config.js`) définit les seuils appliqués par
`npm run test:coverage` et en CI (job `coverage`) :

- global : statements 45 %, branches 40 %, functions 48 %, lignes 50 % ;
- `src/lib/**` : statements 50 %, branches 35 %, functions 55 %, lignes 50 % ;
- exclus : `src/data/**` (validé par `test:data`) et `src/main.tsx` (bootstrap PWA).

C'est un **plancher, à relever (ratchet)** quand la couverture monte — ne jamais le
baisser. La CI échoue si les seuils ne sont pas atteints.

## Arborescence

```
tests/
├── setup.ts                      # mocks : localStorage nettoyé, AudioContext, vibrate,
│                                 # matchMedia, crypto.subtle (webcrypto), fetch, canvas
├── fixtures/questions.fixture.js # makeQuestion/makeTheme/mulberry32 — JAMAIS les vrais fichiers
├── unit/lib/                     # scoring, draw, daily, similarity, accounts, suggestions, badges, titles, schema, repositories
├── unit/features/                # game-draw, result-persist, stats-compute
├── integration/                  # game-solo, game-duel, game-survival, game-daily,
│                                 # app-shell (parcours complet invité -> partie)
└── data/                         # questions-schema.test.ts + corpus-draw.test.ts :
                                  #   seuls tests sur le vrai corpus (schéma zod, doublons,
                                  #   diversité du tirage : sujets / thèmes)
```

## Règles

- `vitest.config.js` : jsdom, globals, alias `@*` identiques à Vite, AUCUN plugin
  Cloudflare/PWA en test. Fichiers `.test.{ts,tsx}` (100 % TS).
- Écrans en React.lazy : dans les tests d'intégration, pré-charger le mock
  `@data/questions.js` + les 9 écrans avec les VRAIS timers AVANT `vi.useFakeTimers()`,
  puis attendre en avançant les timers (`vi.advanceTimersByTimeAsync`) — sinon les
  import() dynamiques de Vitest et le scheduler React restent bloqués.
- Timers factices (`vi.useFakeTimers()`) pour le minuteur ; `Math.random` mocké
  (`mulberry32(seed)`) pour des tirages déterministes ; `localStorage.clear()` entre tests.
- Seuls les tests `tests/data/` chargent le vrai corpus : les autres utilisent les fixtures.
- Les scores exacts sont vérifiés (solo 285 pts/10 bonnes, duel 175/joueur,
  quotidien 245).
- CI : `npm run lint` + `lint:arch` + `test:unit` + `test:data` + `build` +
  matrice d'intégration + couverture sur chaque push/PR (voir `docs/deploiement.md`).
- Une seule façon de tester : Vitest (`npm test`). Plus de suite « legacy » séparée.
