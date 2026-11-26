# Tests

## Commandes

```bash
npm test                 # toute la suite Vitest (tests/unit + tests/integration + tests/data)
npm run test:game      # UNIQUEMENT le flux solo (tests/integration/game-solo.test.tsx)
npm run test:game:duel / :rogue / :daily   # game-duel / game-rogue / game-daily
npm run test:unit        # tests/unit/**  ·  npm run test:integration  ·  npm run test:data
npm run test:scoring / :draw / :similarity / :accounts
npx vitest run tests/scripts   # scripts du corpus : règles qualité, lint avec dette, import inbox
npm run questions:lint   # qualité du corpus (aussi lancé par npm run lint)
npm run test:coverage    # couverture avec seuils appliqués (échoue si en dessous)
npm run typecheck        # tsc --noEmit (strict TS) — avant chaque merge
npm run check:repo       # garde-fous repo (aussi lancé par npm run lint) : emojis,
                         # chemins cités dans la doc, fichiers des scripts npm, termes périmés
```

## Couverture (seuils + ratchet)

`vitest.config.ts` (séparé de `vite.config.ts`) définit les seuils appliqués par
`npm run test:coverage` avant chaque merge :

- global : statements 55 %, branches 48 %, functions 52 %, lignes 58 % ;
- `src/lib/**` : statements 62 %, branches 62 %, functions 74 %, lignes 63 % ;
- exclus : `src/data/**` (validé par `test:data`) et `src/main.tsx` (bootstrap PWA).

C'est un **plancher, à relever (ratchet)** quand la couverture monte — ne jamais le
baisser. La commande échoue si les seuils ne sont pas atteints.

## Arborescence

```
tests/
├── setup.ts                      # mocks : localStorage nettoyé, AudioContext, vibrate,
│                                 # matchMedia, crypto.subtle (webcrypto), fetch, canvas
├── fixtures/questions.fixture.ts # makeQuestion/makeTheme/mulberry32 — JAMAIS les vrais fichiers
├── unit/lib/                     # scoring, draw, daily, similarity, accounts, suggestions, badges, titles, schema, repositories, storage-d1 (file d'attente D1)
├── unit/shared/                  # useStorage : snapshots stables (régression React #185)
├── unit/worker/                  # api-kv : route /api/kv (D1 factice) — POST/GET/DELETE, plafonds body
├── unit/features/                # game-draw, result-persist, stats-compute
├── integration/                  # game-solo, game-duel, game-rogue, game-daily, game-quit,
│                                 # app-shell (parcours complet invité -> partie)
├── scripts/                      # quality (règles), questions-import, questions-lint : racine de
│                                 #   contenu temporaire (tmp-content.ts), jamais le vrai corpus
└── data/                         # content.test.ts (structure de content/, ids) +
                                  #   questions-schema.test.ts + corpus-draw.test.ts :
                                  #   seuls tests sur le vrai corpus (schéma zod, doublons,
                                  #   diversité du tirage : sujets / thèmes)
```

## Règles

- `vitest.config.ts` : jsdom, globals, alias `@*` identiques à Vite, AUCUN plugin
  Cloudflare/PWA en test. Fichiers `.test.{ts,tsx}` (100 % TS).
- Écrans en React.lazy : dans les tests d'intégration, pré-charger le mock
  `@data/questions.ts` + les 9 écrans avec les VRAIS timers AVANT `vi.useFakeTimers()`,
  puis attendre en avançant les timers (`vi.advanceTimersByTimeAsync`) — sinon les
  import() dynamiques de Vitest et le scheduler React restent bloqués.
- Timers factices (`vi.useFakeTimers()`) pour le minuteur ; `Math.random` mocké
  (`mulberry32(seed)`) pour des tirages déterministes ; `localStorage.clear()` entre tests.
- Seuls les tests `tests/data/` chargent le vrai corpus : les autres utilisent les fixtures.
- Les scores exacts sont vérifiés (solo 285 pts/10 bonnes, duel 175/joueur,
  quotidien 245).
- Avant chaque merge (règle 11, en local — plus de CI GitHub) : `npm run lint` +
  `typecheck` + `lint:arch` + `test` + `build` + `wrangler deploy --dry-run`
  (voir `docs/deploiement.md`).
- Une seule façon de tester : Vitest (`npm test`). Plus de suite « legacy » séparée.
