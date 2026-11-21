# Méthodologie (git, review, travail parallèle)

## Branches et worktrees

- Une étape = une branche `feature/<phase>-<slug>` créée depuis `origin/main` à jour
  (fetch d'abord) ; les sous-agents travaillent chacun dans leur **worktree** dédié.
- Un seul sujet par branche. Commit conventionnel (`feat:`/`fix:`/`perf:`/`refactor:`/`docs:`/`chore:`),
  push de la branche, **review** puis merge `--no-ff` sur `main`, push.
- Ne jamais toucher `node_modules/`, `dist/`, `backups/`, `.wrangler/`, ni les 263
  fichiers `src/data/questions-*.js` (ajout uniquement).

## Checklist avant chaque merge (code ET docs)

- [ ] `npm run lint` **0 erreur 0 warning**, `npm run lint:arch` 0 cycle
- [ ] `npm test` + `npm run test:coverage` (seuils `vitest.config.js`, ratchet) +
      `npm run build` verts
- [ ] si `worker.js`/`wrangler.toml` touchés : `npx wrangler deploy --dry-run` OK
- [ ] diff relu : code en anglais/commentaires français, UI en français, zéro emoji,
      pas de `linear-gradient`, pas de `console.log` dans `src/`, pas d'accès
      `localStorage`/`location` hors `lib/storage.js`/`lib/nav.js`/`app/urlFlags.js`,
      pas de `dangerouslySetInnerHTML`/`eval`, plafond 200 L souple respecté
- [ ] **documentation relue** : chemins de fichiers valides (spot-check avec `ls`),
      chiffres du corpus via `npm run count:questions` (jamais en dur), commandes
      testées (`npm run test:game`...), cohérence avec le code
- [ ] pas de nouvelle librairie sans **justification écrite** (pour + contre)
- [ ] la prod répond après merge : `curl -s https://voltquiz.joris-leo81.workers.dev/api/ping`

## Décisions techniques documentées

Quand une décision n'est pas évidente, la documenter (dans le doc concerné ou la PR) :
contexte, options envisagées, **pour/contre de chaque option**, décision retenue, date.
Exemples déjà actés : localStorage comme cache local vs D1 (`docs/stockage-d1.md`),
PWA + routing par état plutôt que react-router (`docs/stack.md`), CSP d'abord en
report-only (`docs/securite.md`), 4 environnements dev/preview/deploy
(`docs/deploiement.md`). Le client peut ne pas être développeur : l'agent prend lui-même
les choix techniques en les expliquant.

## Environnements

`npm run dev` (local 5173), `npm run preview` (build servie en local 4173),
`npm run deploy:preview` (Cloudflare preview, V2_ENABLED=true),
`npm run deploy` (prod, V2_ENABLED=false) — détail dans `docs/deploiement.md`.

## Subagents / parallélisation

Pour les grosses demandes (ex. rédiger un lot de questions), déléguer à des sub-agents,
chacun sur SA branche et SES fichiers uniquement, max 3 en parallèle (limite réseau) ;
le parent relit (code + docs), teste (lint + tests + build), puis merge. Les lots de
questions rédigés par sub-agents doivent passer un contrôle anti-doublons
(normalisation minuscules/sans accents, `normalizeQuestionText` dans `src/lib/text.js`).

## Déploiement

La CI (`.github/workflows/ci.yml`) déploie automatiquement : preview sur chaque PR
(`deploy:preview`), prod à chaque push sur `main` (secrets `CLOUDFLARE_API_TOKEN` /
`CLOUDFLARE_ACCOUNT_ID`). Manuellement : `npm run deploy` / `npm run deploy:preview`
(voir `docs/deploiement.md`).
