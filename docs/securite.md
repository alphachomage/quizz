# Sécurité

## En-têtes (worker.js, sur CHAQUE réponse)

`entetesSecurite()` : CSP (d'abord `Content-Security-Policy-Report-Only` avec
`report-uri /api/csp-report` tant que `CSP_REPORT_ONLY=true` dans `wrangler.toml`,
48 h d'observation, puis appliquée), `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
`Cross-Origin-Opener-Policy: same-origin`, `Permissions-Policy` (caméra/micro/geo off),
`Strict-Transport-Security` en prod HTTPS. En dev localhost, `script-src` autorise
`'unsafe-inline' 'unsafe-eval'` pour le HMR Vite.

CSP prod : `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`
(styles inline React) `; img-src 'self' data: blob:; connect-src 'self' ws: wss:;
worker-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; ...` +
`upgrade-insecure-requests`.

## Cache (worker.js)

`no-cache` sur `/`, `/index.html`, `/sw.js`, manifest, JSON ; `public, max-age=31536000,
immutable` sur `/assets/*` (hashés) ; `no-store` sur `/api/*`.

## API

Rate limiting 30 req/min/IP -> 429 (`/api/*`). Validation des entrées sur chaque route
(`worker-api.js`). CORS : origines de `ALLOWED_ORIGINS`. Pas de secret côté client.

## Données externes

- **zod** (`src/lib/schema.js`) : `questions-utilisateur.json` (fetch) et
  soumissions/validées (localStorage) validés avant usage ; `bonne < reponses.length`
  garanti. La base intégrée est validée par `npm run test:data`.
- **XSS** : jamais de `dangerouslySetInnerHTML`/`innerHTML`/`eval` (grep en review).
  React échappe par défaut.
- **Mots de passe** : jamais en clair. Local : SHA-256 salé (`crypto.randomUUID` +
  `crypto.subtle`, guard `contexteSecurise()` dans `comptes.js` -> erreur claire hors
  contexte sécurisé). Serveur V2 : PBKDF2 210 000 itérations (`worker-api.js`).
- **Modération pseudos** (`src/lib/moderation.js`) : liste bloquée (nazisme, homophobie,
  misogynie, racisme, insultes, sexuel), leetspeak décodé, sous-chaîne >= 4 caractères.
- **Avatars** (`src/lib/avatar.js`) : JPEG/PNG/WebP <= 3 Mo, recadré 128 px, heuristique
  de nudité + hash perceptuel aHash comparé à `public/avatars-bloques.json`.

## Limites connues (version locale volontaire)

Pas de vérification d'e-mail réelle, un PC = une « base » locale, localStorage ~5-10 Mo.
La V2 (serveur) passera à une vraie BDD + modération + signalement.
