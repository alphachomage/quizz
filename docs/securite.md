# Sécurité

## En-têtes (`worker.ts`, sur CHAQUE réponse via `securiser()`)

`entetesSecurite(env, hote)` : CSP (d'abord `Content-Security-Policy-Report-Only`
avec `report-uri /api/csp-report` tant que `CSP_REPORT_ONLY=true` dans `wrangler.toml`,
48 h d'observation, puis appliquée quand `false`), `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
`Cross-Origin-Opener-Policy: same-origin`, `Permissions-Policy` (caméra/micro/geo off),
`Strict-Transport-Security` en prod HTTPS. En dev localhost, `script-src` autorise
`'unsafe-inline' 'unsafe-eval'` pour le HMR Vite.

CSP prod : `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`
(styles inline React) `; img-src 'self' data: blob:; font-src 'self' data:;
connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; media-src 'self' blob:;
object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` +
`upgrade-insecure-requests`. En dev : `connect-src 'self' ws: wss:` (HMR).

`securiser()` **préserve la réponse 101 WebSocket** (recréée sans body mais avec la
propriété `webSocket` copiée, sinon le socket est perdu côté workerd).

## Cache (`worker.ts`)

`no-cache` sur `/`, `/index.html`, `/sw.ts` (+ `Service-Worker-Allowed: /`),
manifest, JSON ; `public, max-age=31536000, immutable` sur `/assets/*` (hashés) ;
`no-store` sur `/api/*` ; `public, max-age=3600` pour le reste.

## API (`worker.ts` -> `worker-api.ts`)

- **Rate limiting** en mémoire -> **429** (`rateLimite` dans `worker.ts`) : **30 req/min/IP**
  sur `/api/*`, **5 req/min/IP sur `/api/auth/*`** (anti brute-force de mots de passe).
- **Body cap 64 Ko** (`MAX_BODY` dans `worker-api.ts`) -> 400 au-delà (1 Mo pour
  `/api/kv/*`, voir `docs/stockage-d1.md`).
- **CORS** : `ALLOWED_ORIGINS` (wrangler.toml) + origine de la requête ; preflight
  `OPTIONS` -> 204 ; toute écriture cross-origin non autorisée -> **403**.
- **Sessions Bearer (migration `0004_sessions.sql`, table `sessions`)** : `/api/auth/*`
  renvoie un `token` (une session par compte, TTL 30 j, la connexion révoque l'ancienne).
  Toutes les routes de données exigent `Authorization: Bearer <token>` -> **401** sinon,
  **503** si le binding DB manque. Le token est stocké côté client en clé localStorage
  **locale** (`voltquiz_token_local`, hors `STORAGE_KEYS` : jamais synchronisé) et n'est
  envoyé que dans le header (jamais en clair dans un body).
- **Namespacing par compte** : `/api/kv/<cle>` stocke en réalité `<pseudo>:<cle>` en
  table `sync_client` — un client ne lit/écrit que son propre espace. Idem pour
  `parties` (colonne `pseudo`), `records` (clé `<pseudo>:<cle>`), `xp`
  (`pseudo_theme = <pseudo>:<themeId>` ; le segment d'URL `/api/xp/<pseudo>/…` est
  ignoré côté serveur) et `soumissions` : le **pseudo est forcé = celui du token**
  (jamais celui du body ni de l'URL), un client ne peut pas usurper un autre compte.
- **Routes ouvertes** (pas de session) : `/api/ping`, `/api/health`, `/api/csp-report`,
  `/api/auth/*`. Toutes les autres (`/api/kv/*`, `/api/parties`, `/api/records`,
  `/api/xp`, `/api/soumissions`, `/api/room*`, `/api/duel/*`, `/api/admin/check`,
  `/api/stats`) exigent une session ; `/api/soumissions` GET et `/api/admin/check`
  exigent en plus `admin = 1` sur le compte.
- **Accès admin** : `?admin=1` exige une session compte (pas invité) avec **`admin = 1`
  dans la table D1 `comptes`** (migration `0003_admin_flag.sql`), vérifié via
  `GET /api/admin/check` (le pseudo vient du **token**, pas d'un paramètre — on ne peut
  pas énumérer les pseudos des autres). Le flag se promouvoit par SQL
  (`UPDATE comptes SET admin = 1 WHERE pseudo_normalise = …`), aucun secret dans
  `wrangler.toml`. En mode `?stockage=local` (hors-ligne) l'admin est indisponible.
  Côté client : `src/app/useAdminAccess.ts`.
- **Anti-énumération** : connexion sur un pseudo inconnu -> PBKDF2 **factice** au même
  coût avant le 404 (pas d'oracle de timing). Mot de passe > 72 caractères -> 400.
- Validation des entrées sur chaque route. WebSocket `/api/duel/:room` : token en
  `?token=` (un WebSocket navigateur ne pose pas de header custom), vérifié **avant**
  l'upgrade 101, puis délégué au Durable Object `DuelRoom` (101 préservé).
- **Hash timing-safe** : comparaison des hash en temps constant
  (`crypto.subtle.timingSafeEqual` dans `hashEgaux`). Mots de passe serveur (mode `d1`,
  défaut) : PBKDF2 210 000 itérations SHA-256 (`hash_version = 2`, table `comptes`).
  En mode `?stockage=local` : SHA-256 salé local (`src/lib/accounts.ts`).

## Données externes (client)

- **zod** (`src/lib/schema.ts`) : `public/questions-utilisateur.json` (fetch) et
  soumissions/validées (localStorage) validés avant usage (`validatePersonalFile`,
  `validateSubmissions`) ; `bonne < reponses.length` garanti. La base intégrée est
  validée par `npm run test:data`.
- **XSS** : jamais de `dangerouslySetInnerHTML`/`innerHTML`/`eval` (grep en review).
  React échappe par défaut.
- **Mots de passe** : jamais en clair. Mode `d1` (défaut) : le mot de passe transite
  uniquement vers `/api/auth/*` (PBKDF2 210 000 itérations côté serveur,
  `worker-api.ts`) et le cache local `voltquiz_comptes` ne contient **aucun** hash.
  Mode `?stockage=local` : SHA-256 salé local (`crypto.randomUUID` +
  `crypto.subtle`, guard `secureContext()` dans `src/lib/accounts.ts` -> erreur
  claire hors contexte sécurisé).
- **Modération pseudos** (`src/lib/moderation.ts`) : liste bloquée (nazisme,
  homophobie, misogynie, racisme, insultes, sexuel), leetspeak décodé, sous-chaîne
  >= 4 caractères.
- **Avatars** (`src/lib/avatar.ts`) : JPEG/PNG/WebP <= 3 Mo, recadré 128 px,
  heuristique de nudité + hash perceptuel aHash comparé à `public/avatars-bloques.json`.

## Règles d'architecture (ESLint, en ERREUR)

`eslint.config.ts` applique R1-R5 en `error` (vérifié par tests négatifs) :
`no-restricted-imports` (R1 lib/ pur, R2 data/ -> lib/ only, R3 shared/ -> lib/+react,
R4 features/X jamais features/Y, seuls `app/urlFlags.ts` + `app/contexts/` autorisés
depuis features/) et `no-restricted-globals` localStorage/sessionStorage/location +
`no-restricted-properties` window.location/window.history/document.location (R5 :
exemption UNIQUEMENT pour `src/lib/storage.ts`, `src/lib/nav.ts`, `src/app/urlFlags.ts`).
ESLint 0 erreur 0 warning exigé (`npm run lint`). Madge vérifie l'absence d'imports
circulaires (`npm run lint:arch`).

## Limites connues

Pas de vérification d'e-mail réelle, pas de refresh token (le token Bearer vit 30 j,
révoqué à la déconnexion côté client et à la reconnexion côté serveur), localStorage
~5-10 Mo (cache local). La synchro serveur est best-effort : en cas de conflit
multi-appareils, le dernier écrivain gagne côté serveur et `preloadFromServer()` écrase
le local au démarrage suivant (sauf clé en file d'attente `voltquiz_pending_writes`).
Le duel en ligne (rooms KV + DO) est préparé côté serveur mais sans UI cliente pour
l'instant. Rate limiting en mémoire par isolate (contournable par changement d'IP, acceptable
pour un POC).
