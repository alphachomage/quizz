# Stockage local -> Cloudflare D1 (migration V2)

**Principe : le localStorage est TEMPORAIRE.** Toute la persistance passe par une couche
d'abstraction qui bascule sur D1 sans toucher aux composants.

## Côté client

- `src/lib/storage.js` — **unique point d'accès** : registre `CLES` (17 clés), `lire` /
  `ecrire` / `supprimer` (JSON, compat ancien format brut), `sabonner`/`notifier`.
  Le hook réactif est `useStockage` (`src/shared/hooks/useStockage.js`,
  `useSyncExternalStore` + event `storage` cross-onglet).
- Quand le flag `VOLTQUIZ_STOCKAGE=d1` sera posé : `lire`/`ecrire` font
  `fetch('/api/kv/<cle>')` (voir `src/lib/api.js`) avec repli localStorage hors-ligne.
- Aucun composant n'appelle le stockage directement (règle R5, lint `no-restricted-globals`).

## Côté serveur (déjà en place)

- `wrangler.toml` : bindings `DB` (D1), `ROOMS` (KV), `DUEL_ROOMS` (Durable Object) +
  migration `v1`. IDs en placeholder `A_REMPLACER` (à remplacer après
  `npx wrangler d1 create voltquiz` / `npx wrangler kv namespace create ROOMS`).
- `migrations/0001_init.sql` : tables comptes, parties, records, xp, soumissions, kv.
  Appliquer : `npx wrangler d1 migrations apply voltquiz --local` (dev) puis `--remote`.
- `worker-api.js` : routes `/api/kv/:cle`, `/api/auth/*` (PBKDF2 210k), `/api/parties`,
  `/api/records`, `/api/xp`, `/api/room*` (KV), `/api/duel/:room` (WebSocket -> DO),
  `/api/ping|health`, `/api/csp-report`. Toutes : validation, `Cache-Control: no-store`,
  rate limit 30/min/IP (dans `worker.js`).
- `durable-objects/DuelRoom.js` : room de duel temps réel (présence + relais d'actions).
- `src/lib/api.js` : client fetch de ces routes.

**Ne PAS migrer les données maintenant** : basculer derrière le flag quand la V2 démarre.
Testé en local (workerd + D1 émulé) : kv, auth, parties, records, rooms OK.
