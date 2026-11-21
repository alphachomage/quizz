# Stockage local <-> Cloudflare D1 (ACTIVÉ)

**Principe : le localStorage reste le cache local, D1 est la base serveur.** Toute la
persistance passe par une couche d'abstraction (`src/lib/storage.ts` + `src/lib/repositories.ts`) :
aucun composant ne touche au stockage directement.

## Dev local (D1 locale)

`npm run dev` tourne dans **workerd** (via `@cloudflare/vite-plugin`) avec une **D1 locale**
(sqlite dans `.wrangler/state/`, simulée par miniflare) : `V2_ENABLED=true` hérité des
`[vars]` top-level de `wrangler.toml`, donc `/api/*` répond en local comme en prod.

```bash
npm run db:migrate:local   # applique migrations/ sur la D1 LOCALE (une fois, puis à chaque nouvelle migration)
npm run dev                # http://localhost:5173 — /api/kv fonctionne contre la D1 locale
npm run db:migrate         # applique sur la D1 distante (prod) — nécessite wrangler login ou CLOUDFLARE_API_TOKEN
```

Smoke test local : `curl -X POST localhost:5173/api/kv/test -d '{"value":42}' -H 'Content-Type: application/json'`
puis `curl localhost:5173/api/kv/test` -> `{"ok":true,"key":"test","value":42}`.

## Côté client

- `src/lib/storage.ts` — **unique point d'accès** : registre `STORAGE_KEYS` (17 clés,
  noms français conservés : `voltquiz_prefs`, `voltquiz_comptes`, `voltquiz_parties`...),
  `read` / `write` / `remove` (JSON, compat ancien format brut), `subscribe`/`notifier`.
  Le hook réactif est `useStorage` (`src/shared/hooks/useStorage.ts`,
  `useSyncExternalStore` + event `storage` cross-onglet).
- `src/lib/repositories.ts` — **1 repo par clé STORAGE_KEYS** (PrefsRepo, SessionRepo,
  AccountsRepo, RecordsRepo, XpRepo, GamesRepo (500 max), SubmissionsRepo, ApprovedRepo,
  ReportsRepo, SuggestionsRepo, ExcludedRepo, SeriesRepo, DailyStreakRepo, TutorialRepo,
  FavoriteBadgeRepo, ActiveTitleRepo, ResetSubmissionsRepo) + `clearAll()`. Aucun appel
  direct `read(STORAGE_KEYS.*)` hors storage/repositories. Le défaut est cloné à la lecture.
- **Mode par défaut** : `STORAGE_MODE` dans `src/lib/storage.ts` = `'d1'` (synchro serveur
  active). Échappatoire hors-ligne : `?stockage=local` dans l'URL. En `'d1'` :
  - `write()` pousse aussi au serveur en arrière-plan : `POST /api/kv/<cle>` (best-effort) ;
  - `preloadFromServer()` (appelé dans `src/main.tsx`) remplit le cache local depuis
    `GET /api/kv/<cle>` pour chaque clé STORAGE_KEYS au démarrage (no-op en `'local'`).
  L'appli reste 100 % utilisable hors-ligne (cache localStorage + write best-effort) ;
  la synchro serveur reprend au prochain write. `npm run preview` (vite preview sans worker)
  n'a pas d'API : le mode d1 y retombe silencieusement sur le cache local.
- R5 (lint en error) : aucun composant n'appelle le stockage ni `localStorage` directement.

## Côté serveur (en place, testé)

- `wrangler.toml` : bindings `DB` (D1 `voltquiz`, id `3b0a1123-13c6-4d55-8872-d817138fdbd7`),
  `ROOMS` (KV id `2e95c8f1ba2449b5b83f9614d1aa12a9`), `DUEL_ROOMS` (Durable Object) +
  migration `v1`. IDs créés avec `npx wrangler d1 create voltquiz` et
  `npx wrangler kv namespace create ROOMS`.
- `migrations/0001_init.sql` : tables comptes, parties, records, xp, soumissions, kv.
  Appliquée en local ET en remote :
  `npx wrangler d1 migrations apply voltquiz --local` puis `--remote`.
- `worker-api.ts` : routes `/api/kv/:cle`, `/api/auth/*` (PBKDF2 210k), `/api/parties`,
  `/api/records`, `/api/xp`, `/api/room*` (KV), `/api/duel/:room` (WebSocket -> DO),
  `/api/ping|health`, `/api/csp-report`. Toutes : validation, body cap 64 Ko,
  `Cache-Control: no-store`, rate limit 30/min/IP (dans `worker.js`), porte
  **V2_ENABLED** (hors routes de santé -> 503 si désactivé).
- `durable-objects/DuelRoom.ts` : room de duel temps réel (présence + relais d'actions).
- `src/lib/api.ts` : client fetch de ces routes (`kvGet`/`kvSet` utilisés par storage.js,
  `authSignup`/`authLogin`, `apiAddGame`/`apiGames`, `apiRecord`/`apiSaveRecord`,
  `apiXp`/`apiSaveXp`, `apiCreateRoom`/`apiJoinRoom`/`apiRoom`, `apiDuelSocket`).

**Testé en local** (dev workerd + D1 locale, `V2_ENABLED=true`) : POST puis GET
`/api/kv/<cle>` -> valeur persistée en D1 ; POST sans `value` -> 400.

## DÉCISION localStorage (POC web) vs mobile

- **Web (POC actuel)** : localStorage comme **cache local** (rapide, hors-ligne, zéro
  serveur). Coût : un PC = une « base », pas de synchro multi-appareils.
- **Mobile (Capacitor natif, V3)** : remplacer la couche `storage.js` par
  `@capacitor/preferences` (données simples) et `@capacitor/secure-storage` (données
  sensibles) — **jamais de hash ni de mot de passe en clair** dans Preferences. Le web
  garde localStorage ; le natif garde le même contrat `read`/`write`/`remove`.
- **Activé partout** (2026-11) : `V2_ENABLED="true"` en prod et preview ; `?stockage=local`
  pour forcer le mode hors-ligne. La porte V2 reste dans `worker-api.ts` (routes de santé
  ouvertes, le reste -> 503 si `V2_ENABLED` repasse à `"false"`).
