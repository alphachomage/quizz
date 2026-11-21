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

- **Rate limiting** 30 req/min/IP en mémoire -> **429** (`rateLimite` dans `worker.ts`).
- **Body cap 64 Ko** (`MAX_BODY` dans `worker-api.ts`) -> 400 au-delà.
- **CORS** : `ALLOWED_ORIGINS` (wrangler.toml) + origine de la requête ; preflight
  `OPTIONS` -> 204 ; toute écriture cross-origin non autorisée -> **403**.
- **Plus de porte `V2_ENABLED`** (supprimée) : la base D1 est le stockage par défaut.
  Chaque route renvoie **503 « binding manquant »** si D1/KV/DO n'est pas configuré
  (`worker-api.ts`) ; les routes de santé (`/api/ping`, `/api/health`, `/api/csp-report`)
  répondent toujours.
- **Accès admin** : `?admin=1` exige une session compte (pas invité) dont le pseudo est
  dans la var d'env **`ADMIN_PSEUDOS`** (liste CSV, vide = personne), vérifié côté serveur
  via `GET /api/admin/check?pseudo=...` (200 si admin, 403 sinon). En mode `?stockage=local`
  (hors-ligne) l'admin est indisponible. Côté client : `src/app/useAdminAccess.ts`.
- Validation des entrées sur chaque route. WebSocket `/api/duel/:room` délégué au
  Durable Object `DuelRoom` (passe intacte à travers `securiser()`, 101 préservé).
- **Hash timing-safe** : comparaison des hash en temps constant
  (`crypto.subtle.timingSafeEqual` dans `hashEgaux`) pour éviter l'oracle de timing
  au login. Mots de passe serveur (mode `d1`, défaut) : PBKDF2 210 000 itérations
  SHA-256 (`hash_version = 2`, table `comptes`). En mode `?stockage=local` : SHA-256
  salé local (`src/lib/accounts.ts`).

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

Pas de vérification d'e-mail réelle, localStorage ~5-10 Mo (cache local). La synchro
serveur est best-effort : en cas de conflit multi-appareils, le dernier écrivain gagne
côté serveur et `preloadFromServer()` écrase le local au démarrage suivant (sauf clé en
file d'attente `voltquiz_pending_writes`). Le duel en ligne (rooms KV + DO) est préparé
côté serveur mais sans UI cliente pour l'instant.
