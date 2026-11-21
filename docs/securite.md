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
- **V2_ENABLED** : tant que la variable n'est pas `"true"`, seules les routes de santé
  répondent (`/api/ping`, `/api/health`, `/api/csp-report`) ; toutes les autres routes
  V2 renvoient **503**. Prod = `false`, env preview = `true` (voir `docs/deploiement.md`).
- Validation des entrées sur chaque route. WebSocket `/api/duel/:room` délégué au
  Durable Object `DuelRoom` (passe intacte à travers `securiser()`, 101 préservé).
- **Hash timing-safe** : comparaison des hash en temps constant
  (`crypto.subtle.timingSafeEqual` dans `hashEgaux`) pour éviter l'oracle de timing
  au login. Mots de passe serveur : PBKDF2 210 000 itérations SHA-256 (`hash_version = 2`).

## Données externes (client)

- **zod** (`src/lib/schema.ts`) : `public/questions-utilisateur.json` (fetch) et
  soumissions/validées (localStorage) validés avant usage (`validatePersonalFile`,
  `validateSubmissions`) ; `bonne < reponses.length` garanti. La base intégrée est
  validée par `npm run test:data`.
- **XSS** : jamais de `dangerouslySetInnerHTML`/`innerHTML`/`eval` (grep en review).
  React échappe par défaut.
- **Mots de passe** : jamais en clair. Local : SHA-256 salé (`crypto.randomUUID` +
  `crypto.subtle`, guard `secureContext()` dans `src/lib/accounts.ts` -> erreur
  claire hors contexte sécurisé). Serveur V2 : PBKDF2 210 000 itérations
  (`worker-api.ts`).
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

## Limites connues (version locale volontaire)

Pas de vérification d'e-mail réelle, un PC = une « base » locale, localStorage ~5-10 Mo.
La V2 (serveur, D1) passera à une vraie BDD + modération + signalement.
