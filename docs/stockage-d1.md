# Stockage local -> Cloudflare D1 (migration V2)

**Principe : le localStorage reste le cache local.** Toute la persistance passe par une couche
d'abstraction (`lib/storage.js` + `lib/repositories.js`) qui peut basculer sur D1 via l'API
sans toucher aux composants.

## Côté client

- `src/lib/storage.js` — **unique point d'accès** : registre `CLES` (17 clés), `lire` /
  `ecrire` / `supprimer` (JSON, compat ancien format brut), `sabonner`/`notifier`.
  Le hook réactif est `useStockage` (`src/shared/hooks/useStockage.js`,
  `useSyncExternalStore` + event `storage` cross-onglet).
- `src/lib/repositories.js` — **1 repo par clé CLES** (RecordsRepo, XpRepo, PartiesRepo,
  SoumissionsRepo...) avec méthodes métier. Aucun appel direct `lire(CLES.*)` hors
  storage/repositories (les modules lib migrés). Le défaut est cloné à la lecture.
- **Flag** : `MODE_STOCKAGE` dans `storage.js` = `'local'` par défaut, `'d1'` avec
  `?stockage=d1` dans l'URL (test). En `'d1'` :
  - `ecrire()` pousse aussi au serveur en arrière-plan : `POST /api/kv/<cle>` (best-effort) ;
  - `prechargerDepuisServeur()` (appelé dans `main.jsx`) remplit le cache local depuis
    `GET /api/kv/<cle>` pour chaque clé CLES au démarrage.
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
  `/api/ping|health`, `/api/csp-report`. Toutes : validation, `Cache-Control: no-store`,
  rate limit 30/min/IP (dans `worker.js`).
- `durable-objects/DuelRoom.js` : room de duel temps réel (présence + relais d'actions).
- `src/lib/api.js` : client fetch de ces routes (`kvGet`/`kvSet` utilisés par storage.js).

**Testé en local** (wrangler dev + D1/miniflare) : `POST /api/kv/voltquiz_test` ->
`{"ok":true}`, puis `GET /api/kv/voltquiz_test` -> `{"ok":true,"valeur":42}`.

**Ne PAS activer `?stockage=d1` en prod tant que la V2 (comptes serveur) n'est pas prête** :
le flag reste un outil de test.
