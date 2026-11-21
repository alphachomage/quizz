# Déploiement (Cloudflare Workers) + CI — 4 environnements

| Environnement | Commande | URL / vars | V2_ENABLED |
|---|---|---|---|
| dev local | `npm run dev` | http://localhost:5173 (predev = gen-manifest) | n/a (local) |
| preview local | `npm run preview` | http://localhost:4173 (build prod servie) | n/a (local) |
| preview Cloudflare | `npm run deploy:preview` | `wrangler deploy --env preview` (`ENVIRONMENT=preview`) | **true** |
| prod | `npm run deploy` | https://voltquiz.joris-leo81.workers.dev (`ENVIRONMENT=production`) | **false** |

Ne jamais déployer la prod depuis une branche non reviewée.

## Publier

```bash
npm run dev             # DEV local -> http://localhost:5173
npm run build           # build prod (dist/)
npm run preview         # sert la prod en local -> http://localhost:4173
npm run deploy:preview  # vite build + wrangler deploy --env preview (V2 activée)
npm run deploy          # vite build + wrangler deploy (prod, V2 désactivée)
npx wrangler login      # première fois
npx wrangler deploy --dry-run   # valide worker.js + wrangler.toml sans déployer
npm run tail            # wrangler tail --format pretty (logs temps réel)
```

- `worker.js` sert les assets (`env.ASSETS`, `run_worker_first = true`), pose les
  headers de sécurité + le cache sur CHAQUE réponse, route `/api/*` (`worker-api.js`).
- Repli SPA : URL sans extension -> `index.html` (sauf `/api/*`, `navigateFallbackDenylist`
  dans `vite.config.js`).
- PWA : `vite-plugin-pwa`, `registerType: 'autoUpdate'`, precache
  `globPatterns: ['**/*.{js,css,html,png,json}']` (plafond 8 Mo,
  `maximumFileSizeToCacheInBytes`), `devOptions.enabled: false` (pas de SW en dev).

## CI (`.github/workflows/ci.yml`)

- Job **lint-test-build** (chaque push/PR) : `npm ci` puis `npm run lint`,
  `npm run lint:arch`, `npm run test:unit`, `npm run test:data`,
  `npm run build`.
- Job **integration** (chaque push/PR) : matrice `game: [game-solo, game-duel,
  game-survival, game-daily]` -> `npx vitest run tests/integration/<game>.test.jsx`
  en parallèle (`fail-fast: false`).
- Job **coverage** (chaque push/PR) : `npm run test:coverage` — échoue si les seuils de
  `vitest.config.js` ne sont pas atteints (ratchet) — puis upload de l'artifact
  `coverage/`.
- Job **deploy-preview** (PR uniquement, `needs: lint-test-build`) : `npm run
  deploy:preview` -> environnement preview Cloudflare (V2_ENABLED=true).
- Job **deploy** (push sur `main` uniquement, `needs: [lint-test-build, integration,
  coverage]`, `environment: production`) : `npm run deploy` -> prod.
- Secrets GitHub requis : `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- La prod doit répondre : `curl -s https://voltquiz.joris-leo81.workers.dev/api/ping`.

## Variables (`wrangler.toml`)

`[vars]` (prod) : `ENVIRONMENT`, `APP_VERSION`, `CSP_REPORT_ONLY` (true = CSP en
observation 48 h avec rapports sur `/api/csp-report`, puis false pour appliquer),
`V2_ENABLED = "false"`, `ALLOWED_ORIGINS`.
`[env.preview]` : `ENVIRONMENT = "preview"`, `CSP_REPORT_ONLY = "true"`,
`V2_ENABLED = "true"`.
Bindings : `DB` (D1), `ROOMS` (KV), `DUEL_ROOMS` (Durable Object) — voir
`docs/stockage-d1.md`.
