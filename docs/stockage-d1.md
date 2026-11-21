# Stockage : localStorage (cache local) + Cloudflare D1 (base serveur, défaut)

**Principe : le localStorage reste le cache local, D1 est la base serveur.** Toute la
persistance passe par une couche d'abstraction (`src/lib/storage.ts` + `src/lib/repositories.ts`) :
aucun composant ne touche au stockage directement.

## Les tables D1 et leur rôle

| Table | Rôle | Structure | Branchée côté client |
|---|---|---|---|
| `sync_client` | **Miroir serveur des 17 clés localStorage** (préfs, session, records/XP/parties bruts, streak, badges favoris…) | `cle TEXT PRIMARY KEY, valeur TEXT` (JSON) — blob store **volontaire** : ces données n'ont pas de schéma relationnel | ✅ auto via `storage.ts` (`/api/kv/*`) |
| `comptes` | Comptes serveur (auth PBKDF2 210 000 itérations, hash `hash_version = 2`) | relationnelle, `pseudo_normalise UNIQUE` | ✅ `accounts.ts` → `/api/auth/*` |
| `parties` | Historique serveur des parties (multi-appareils, futur classement global) | relationnelle + **colonne `pseudo` indexée** | ✅ `game-history.ts` → `/api/parties` |
| `records` | Records serveur par mode × niveau × thème | `cle TEXT PRIMARY KEY` | ✅ `records.ts` → `/api/records` |
| `xp` | XP serveur par compte × thème | `pseudo_theme TEXT PRIMARY KEY` | ✅ `xp.ts` → `/api/xp` |
| `soumissions` | Questions proposées par les joueurs (modération admin cross-device) | relationnelle + index `etat`, `theme_id` | ✅ `submissions.ts` → `/api/soumissions` |

La table `sync_client` s'appelait `kv` (nom opaque) : renommée par la migration
`0002_sync_client.sql`. Ce n'est **pas** une base métier : c'est le sync brut du client.
Les données métier structurées (comptes, parties, records, XP, soumissions) ont leurs
tables dédiées, requêtables et indexables — et sont poussées côté client en
**best-effort** (un échec réseau ne bloque jamais le jeu : la donnée reste dans
`sync_client` + la file d'attente, voir plus bas).

## Pourquoi les questions restent côté client

Le corpus (thèmes + questions) est du **contenu statique versionné avec l'app** : servi
en chunks lazy par le worker via les assets (`src/data/questions-*.js`), cacheable par
le navigateur et le service worker, zéro requête D1 par question. Lire des milliers de
questions en base à chaque partie serait inutile et coûteux. Côté serveur ne vivent que
les **soumissions des joueurs** (table `soumissions`) et le fichier statique
`public/questions-utilisateur.json` (validé par zod, `src/lib/schema.ts`).

## Index (migration `0002`)

- `parties(date)` : utilisé par `ORDER BY date DESC` — OK.
- `parties(pseudo)` : **nouvelle colonne texte** (pseudo du compte connecté, normalisé
  côté serveur). L'ancien index portait sur la colonne JSON `joueurs` et était
  **inutilisable** (le filtre faisait `LIKE '%…%'`, wildcard initial = parcours complet).
  `GET /api/parties?pseudo=` filtre désormais sur cette colonne indexée.
- `soumissions(etat)` et `soumissions(theme_id)` : filtrage de la modération admin.
- `sync_client.cle`, `records.cle`, `xp.pseudo_theme`, `comptes.pseudo_normalise`
  (UNIQUE) : clés primaires.

## Dev local (D1 locale)

`npm run dev` tourne dans **workerd** (via `@cloudflare/vite-plugin`) avec une **D1 locale**
(sqlite dans `.wrangler/state/`, simulée par miniflare) : `/api/*` répond en local comme
en prod.

```bash
npm run db:migrate:local   # applique migrations/ sur la D1 LOCALE (0001 + 0002 + suivantes)
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
- `src/lib/repositories.ts` — **1 repo par clé STORAGE_KEYS** (PrefsRepo, SessionRepo via
  accounts, AccountsRepo, RecordsRepo, XpRepo, GamesRepo (500 max), SubmissionsRepo,
  ApprovedRepo, ReportsRepo, SuggestionsRepo, ExcludedRepo, SeriesRepo, DailyStreakRepo,
  TutorialRepo, FavoriteBadgeRepo, ActiveTitleRepo, ResetSubmissionsRepo) + `clearAll()`.
  Aucun appel direct `read(STORAGE_KEYS.*)` hors storage/repositories. Le défaut est
  cloné à la lecture.
- **Mode par défaut** : `STORAGE_MODE` dans `src/lib/storage.ts` = `'d1'` (synchro serveur
  active). Échappatoire hors-ligne : `?stockage=local` dans l'URL. En `'d1'` :
  - `write()` pousse aussi au serveur en arrière-plan : `POST /api/kv/<cle>`
    (table `sync_client`) ;
  - `remove()` pousse la suppression : `DELETE /api/kv/<cle>` ;
  - `preloadFromServer()` (appelé dans `src/main.tsx`) remplit le cache local depuis
    `GET /api/kv/<cle>` pour chaque clé STORAGE_KEYS au démarrage (no-op en `'local'`).
  L'appli reste 100 % utilisable hors-ligne. **File d'attente anti-perte** : si le serveur
  refuse une écriture (hors-ligne, 429, 5xx, body trop gros), elle part dans
  `voltquiz_pending_writes` (clé localStorage LOCALE, hors STORAGE_KEYS) et est retentée par
  `flushPendingWrites()` au démarrage, après chaque write, et sur l'événement `online`.
  `preloadFromServer()` n'écrase jamais une clé qui a une écriture en attente (le local est
  alors plus récent que le serveur).
  `npm run preview` (vite preview sans worker) n'a pas d'API : le mode d1 y retombe
  silencieusement sur le cache local.
- **Données métier structurées** (en plus du sync brut, en mode `'d1'`, best-effort) :
  - comptes : `src/lib/accounts.ts` appelle `POST /api/auth/inscription|connexion`
    (PBKDF2 côté serveur) ; le cache local `voltquiz_comptes` ne contient **jamais** de
    hash ni mot de passe en mode d1 (profil uniquement). En mode `'local'`, hash
    SHA-256 salé 100 % local, comme avant.
  - parties : `src/lib/game-history.ts` → `POST /api/parties` (avec `pseudo`).
  - records : `src/lib/records.ts` → `POST /api/records`.
  - XP : `src/lib/xp.ts` → `POST /api/xp`.
  - soumissions : `src/lib/submissions.ts` → `POST /api/soumissions`.
- `src/lib/api.ts` — client fetch de **toutes** les routes (`kvGet/kvSet/kvDelete`,
  `authSignup/authLogin`, `apiAddGame/apiGames`, `apiRecord/apiSaveRecord`,
  `apiXp/apiSaveXp`, `apiSubmissions/apiAddSubmission`, `apiAdminCheck`,
  `apiCreateRoom/apiJoinRoom/apiRoom`, `apiDuelSocket`, `apiHealth/apiStats`).
- R5 (lint en error) : aucun composant n'appelle le stockage ni `localStorage` directement.

## Côté serveur

- `wrangler.toml` : bindings `DB` (D1 `voltquiz`, id `3b0a1123-13c6-4d55-8872-d817138fdbd7`),
  `ROOMS` (KV id `2e95c8f1ba2449b5b83f9614d1aa12a9`), `DUEL_ROOMS` (Durable Object) +
  migration `v1`. Var `ADMIN_PSEUDOS` (liste CSV de pseudos admin, vide = personne) —
  voir « Admin sécurisé » ci-dessous. **Plus de `V2_ENABLED`** : supprimé, la base est le
  défaut (chaque route renvoie 503 « binding manquant » si D1/KV/DO n'est pas configuré).
- `migrations/0001_init.sql` : tables comptes, parties, records, xp, soumissions, kv.
  `migrations/0002_sync_client.sql` : renomme `kv` -> `sync_client`, ajoute
  `parties.pseudo` + index corrigés + index soumissions.
  Appliquées en local ET en remote :
  `npx wrangler d1 migrations apply voltquiz --local` puis `--remote`.
- `worker-api.ts` : routes `/api/kv/:cle` (GET/POST/DELETE -> `sync_client`),
  `/api/auth/*` (PBKDF2 210k, comparaison timing-safe), `/api/parties` (GET avec filtre
  `?pseudo=` sur colonne indexée, POST), `/api/records[/:cle]`, `/api/xp[/:pseudo/:themeId]`,
  `/api/soumissions` (GET `?etat=`, POST), `/api/admin/check?pseudo=` (200 si le pseudo
  normalisé est dans `ADMIN_PSEUDOS`, sinon 403), `/api/room*` (KV), `/api/duel/:room`
  (WebSocket -> DO), `/api/ping|health`, `/api/stats`, `/api/csp-report`. Toutes :
  validation, `Cache-Control: no-store`, rate limit 30/min/IP (dans `worker.ts`).
  Plafond de body : 64 Ko en général, **1 Mo pour `/api/kv/*`** (l'historique
  `voltquiz_parties` — 500 parties avec détail — dépasse 64 Ko).
- `durable-objects/DuelRoom.ts` : room de duel temps réel (présence + relais d'actions).
  **Préparé mais pas encore branché côté UI** : le mode Duel reste 1v1 sur le même
  appareil ; le duel en ligne (rooms KV + WebSocket DO) est la roadmap V2.

**Testé en local** (dev workerd + D1 locale) : POST puis GET `/api/kv/<cle>` -> valeur
persistée en D1 ; POST sans `value` -> 400.

## Admin sécurisé

`?admin=1` ne suffit plus (n'importe qui avec le lien y avait accès). La vue admin exige :
1. une **session compte** (pas invité) ;
2. le pseudo de la session dans la var d'env **`ADMIN_PSEUDOS`** (CSV, ex. `"joris,lea"`),
   vérifiée côté serveur via `GET /api/admin/check?pseudo=...` — la liste ne sort jamais
   du serveur. `ADMIN_PSEUDOS` vide = personne n'a accès.
3. le mode `'d1'` (en `?stockage=local`, hors-ligne, aucune vérification serveur :
   l'admin est indisponible).

Côté client : `src/app/useAdminAccess.ts` (gate async) + `App.tsx`. Voir
`docs/features/admin.md`.

## DÉCISION localStorage (POC web) vs mobile

- **Web (actuel)** : localStorage comme **cache local** (rapide, hors-ligne, zéro
  serveur au moment du jeu), D1 comme base serveur (synchro multi-appareils best-effort).
- **Mobile (Capacitor natif, V3)** : remplacer la couche `storage.ts` par
  `@capacitor/preferences` (données simples) et `@capacitor/secure-storage` (données
  sensibles) — **jamais de hash ni de mot de passe en clair** dans Preferences. Le web
  garde localStorage ; le natif garde le même contrat `read`/`write`/`remove`.
