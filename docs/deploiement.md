# Déploiement (Cloudflare Workers) — 4 environnements

| Environnement | Commande | URL / vars | Base D1 |
|---|---|---|---|
| dev local | `npm run dev` | http://localhost:5173 (predev = gen-manifest), D1 locale sqlite | locale (workerd) |
| preview local | `npm run preview` | http://localhost:4173 (build prod servie, sans worker) | aucune (retombe sur le cache local) |
| preview Cloudflare | `npm run deploy:preview` | `wrangler deploy --env preview` (`ENVIRONMENT=preview`) | distante (preview) |
| prod | `npm run deploy` (ou auto par Cloudflare) | https://voltquiz.joris-leo81.workers.dev (`ENVIRONMENT=production`) | distante (prod) |

Ne jamais déployer la prod depuis une branche non reviewée.

## Publier

```bash
npm run dev             # DEV local -> http://localhost:5173
npm run build           # build prod (dist/)
npm run preview         # sert la prod en local -> http://localhost:4173
npm run deploy:preview  # vite build + wrangler deploy --env preview (D1 preview)
npm run deploy          # vite build + wrangler deploy (prod, D1 active)
npx wrangler login      # première fois
npx wrangler deploy --dry-run   # valide worker.ts + wrangler.toml sans déployer
npm run tail            # wrangler tail --format pretty (logs temps réel)
```

- `worker.ts` sert les assets (`env.ASSETS`, `run_worker_first = true`), pose les
  headers de sécurité + le cache sur CHAQUE réponse, route `/api/*` (`worker-api.ts`).
- Repli SPA : URL sans extension -> `index.html` (sauf `/api/*`, `navigateFallbackDenylist`
  dans `vite.config.ts`).
- PWA : `vite-plugin-pwa`, `registerType: 'autoUpdate'`, precache
  `globPatterns: ['**/*.{js,css,html,png,json}']` (plafond 8 Mo,
  `maximumFileSizeToCacheInBytes`), `devOptions.enabled: false` (pas de SW en dev).

## Déploiement automatique (Cloudflare Workers Builds)

**Plus de GitHub Action** (`.github/` supprimé) : Cloudflare est connecté au dépôt GitHub
(Workers & Pages > *Builds*) et **déploie automatiquement chaque push sur `main`** en
production. Aucun secret Cloudflare n'est stocké dans GitHub.

- Avant chaque push, en local : les vérifications de la règle 11 d'`AGENTS.md` (`lint`,
  `typecheck`, `lint:arch`, `test`, `build`, `wrangler deploy --dry-run`) — c'est le
  contrat de merge, il n'y a plus de filet CI côté GitHub.
- Déploiement manuel de secours : `npm run deploy` / `npm run deploy:preview`, avec
  `npx wrangler login` (navigateur, une fois) ou la variable d'environnement
  `CLOUDFLARE_API_TOKEN` posée sur le poste local. **Ne jamais mettre ce token dans le dépôt.**
- La prod doit répondre : `curl -s https://voltquiz.joris-leo81.workers.dev/api/ping`.

## Variables (`wrangler.toml`)

`[vars]` (prod) : `ENVIRONMENT`, `APP_VERSION`, `CSP_REPORT_ONLY` (true = CSP en
observation 48 h avec rapports sur `/api/csp-report`, puis false pour appliquer),
`ADMIN_PSEUDOS` (liste CSV de pseudos autorisés à ouvrir `?admin=1`, **vide = personne** —
voir `docs/features/admin.md`), `ALLOWED_ORIGINS`.
`[env.preview]` : `ENVIRONMENT = "preview"`, `CSP_REPORT_ONLY = "true"`, `ADMIN_PSEUDOS = ""`.
Bindings : `DB` (D1), `ROOMS` (KV), `DUEL_ROOMS` (Durable Object) — voir
`docs/stockage-d1.md`. Plus de `V2_ENABLED` : la base D1 est le défaut.
