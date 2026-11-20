# Déploiement (Cloudflare Workers) + CI

## Publier

```bash
npm run deploy          # vite build + wrangler deploy -> https://voltquiz.joris-leo81.workers.dev
npx wrangler login      # première fois
npx wrangler deploy --dry-run   # valide sans déployer (à faire avant chaque commit worker)
npx wrangler tail --format pretty   # logs temps réel (npm run tail)
```

- `worker.js` sert les assets (`env.ASSETS`, `run_worker_first = true`), pose les headers
  de sécurité + le cache, route `/api/*` (`worker-api.js`).
- Repli SPA : URL sans extension -> `index.html` (sauf `/api/*`, denylist dans la config PWA).
- WPA : `vite-plugin-pwa`, `registerType: 'autoUpdate'`, precache de tous les chunks
  (plafond 8 Mo), `devOptions.enabled: false` (pas de SW en dev).

## CI (`.github/workflows/ci.yml`)

Sur chaque push/PR : `npm ci` puis `lint`, `lint:arch`, `test`, `test:legacy`, `build`.
Sur push sur `main` uniquement : job `deploy` (secrets GitHub `CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID`) -> `npm run deploy`. La prod doit répondre :
`curl -s https://voltquiz.joris-leo81.workers.dev/api/ping`.

## Variables (wrangler.toml [vars])

`ENVIRONMENT`, `APP_VERSION`, `CSP_REPORT_ONLY` (true = CSP en observation 48 h, puis false),
`ALLOWED_ORIGINS`.
