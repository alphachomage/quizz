# Méthodologie (git, review, travail parallèle)

## Branches

- Une étape = une branche `feature/<phase>-<slug>` créée depuis `origin/main` à jour.
- Un seul sujet par branche. Commit conventionnel (`feat:`/`fix:`/`perf:`/`refactor:`/`docs:`/`chore:`),
  push de la branche, **review** puis merge `--no-ff` sur `main`, push.
- Ne jamais toucher `node_modules/`, `dist/`, `backups/`, `.wrangler/`, ni les 263 fichiers
  `src/data/questions-*.js`.

## Checklist avant chaque merge

- [ ] `npm run lint` 0 erreur, `npm run lint:arch` 0 cycle
- [ ] `npm test` + `npm run test:legacy` + `npm run build` verts
- [ ] si `worker.js`/`wrangler.toml` touchés : `npx wrangler deploy --dry-run` OK
- [ ] diff relu : français, zéro emoji, pas de `linear-gradient`, pas de `console.log`,
  pas d'accès `localStorage`/`window.location` hors `lib/storage.js`/`app/urlFlags.js`,
  pas de `dangerouslySetInnerHTML`/`eval`
- [ ] la prod répond après merge : `curl -s https://voltquiz.joris-leo81.workers.dev/api/ping`

## Subagents / parallélisation

Pour les grosses demandes (ex. rédiger un lot de questions), déléguer à des sub-agents,
chacun sur SA branche et SES fichiers uniquement, max 3 en parallèle (limite réseau) ;
le parent relit, teste (build + tests), puis merge. Les lots de questions rédés par
sub-agents doivent passer un script anti-doublons (normalisation minuscules/sans accents).

## Déploiement

La CI (`.github/workflows/ci.yml`) déploie automatiquement sur Cloudflare à chaque push
sur `main` (secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`). Manuellement :
`npm run deploy`.
