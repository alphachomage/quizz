# Stockage local -> Cloudflare D1 (migration V2)

**Principe : le localStorage reste le cache local.** Toute la persistance passe par une
couche d'abstraction (`src/lib/storage.js` + `src/lib/repositories.js`) qui peut basculer
sur D1 via l'API sans toucher aux composants.

## Côté client

- `src/lib/storage.js` — **unique point d'accès** : registre `STORAGE_KEYS` (17 clés,
  noms français conservés : `voltquiz_prefs`, `voltquiz_comptes`, `voltquiz_parties`...),
  `read` / `write` / `remove` (JSON, compat ancien format brut), `subscribe`/`notifier`.
  Le hook réactif est `useStorage` (`src/shared/hooks/useStorage.js`,
  `useSyncExternalStore` + event `storage` cross-onglet).
- `src/lib/repositories.js` — **1 repo par clé STORAGE_KEYS** (PrefsRepo, SessionRepo,
  AccountsRepo, RecordsRepo, XpRepo, GamesRepo (500 max), SubmissionsRepo, ApprovedRepo,
  ReportsRepo, SuggestionsRepo, ExcludedRepo, SeriesRepo, DailyStreakRepo, TutorialRepo,
  FavoriteBadgeRepo, ActiveTitleRepo, ResetSubmissionsRepo) + `clearAll()`. Aucun appel
  direct `read(STORAGE_KEYS.*)` hors storage/repositories. Le défaut est cloné à la lecture.
- **Flag** : `STORAGE_MODE` dans `storage.js` = `'local'` par défaut, `'d1'` avec
  `?stockage=d1` dans l'URL (test). En `'d1'` :
  - `write()` pousse aussi au serveur en arrière-plan : `POST /api/kv/<cle>` (best-effort) ;
  - `preloadFromServer()` (appelé dans `src/main.jsx`) remplit le cache local depuis
    `GET /api/kv/<cle>` pour chaque clé STORAGE_KEYS au démarrage (no-op en `'local'`).
  L'appli reste 100 % utilisable hors-ligne ; la synchro serveur reprend au prochain write.
- R5 (lint en error) : aucun composant n'appelle le stockage ni `localStorage` directement.

## Côté serveur (en place, testé)

- `wrangler.toml` : bindings `DB` (D1 `voltquiz`, id `3b0a1123-13c6-4d55-8872-d817138fdbd7`),
  `ROOMS` (KV id `2e95c8f1ba2449b5b83f9614d1aa12a9`), `DUEL_ROOMS` (Durable Object) +
  migration `v1`. IDs créés avec `npx wrangler d1 create voltquiz` et
  `npx wrangler kv namespace create ROOMS`.
- `migrations/0001_init.sql` : tables comptes, parties, records, xp, soumissions, kv.
  Appliquée en local ET en remote :
  `npx wrangler d1 migrations apply voltquiz --local` puis `--remote`.
- `worker-api.js` : routes `/api/kv/:cle`, `/api/auth/*` (PBKDF2 210k), `/api/parties`,
  `/api/records`, `/api/xp`, `/api/room*` (KV), `/api/duel/:room` (WebSocket -> DO),
  `/api/ping|health`, `/api/csp-report`. Toutes : validation, body cap 64 Ko,
  `Cache-Control: no-store`, rate limit 30/min/IP (dans `worker.js`), porte
  **V2_ENABLED** (hors routes de santé -> 503 si désactivé).
- `durable-objects/DuelRoom.js` : room de duel temps réel (présence + relais d'actions).
- `src/lib/api.js` : client fetch de ces routes (`kvGet`/`kvSet` utilisés par storage.js,
  `authSignup`/`authLogin`, `apiAddGame`/`apiGames`, `apiRecord`/`apiSaveRecord`,
  `apiXp`/`apiSaveXp`, `apiCreateRoom`/`apiJoinRoom`/`apiRoom`, `apiDuelSocket`).

**Testé en local** (wrangler dev + D1/miniflare, env preview `V2_ENABLED=true`) :
`POST /api/kv/voltquiz_test` -> `{"ok":true}`, puis `GET /api/kv/voltquiz_test` ->
`{"ok":true,"valeur":42}`.

## DÉCISION localStorage (POC web) vs mobile

- **Web (POC actuel)** : localStorage comme **cache local** (rapide, hors-ligne, zéro
  serveur). Coût : un PC = une « base », pas de synchro multi-appareils.
- **Mobile (Capacitor natif, V3)** : remplacer la couche `storage.js` par
  `@capacitor/preferences` (données simples) et `@capacitor/secure-storage` (données
  sensibles) — **jamais de hash ni de mot de passe en clair** dans Preferences. Le web
  garde localStorage ; le natif garde le même contrat `read`/`write`/`remove`.
- **`?stockage=d1`** pousse le cache local vers `/api/kv/<cle>` (D1 côté serveur) ;
  la porte **V2_ENABLED** est posée côté serveur (prod `false`, preview `true`).
  Ne PAS activer la V2 en prod tant que les comptes serveur ne sont pas validés.
