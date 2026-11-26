# Méthodologie (git, review, travail parallèle)

## Branches et worktrees

- Une étape = une branche `feature/<phase>-<slug>` créée depuis `origin/main` à jour
  (fetch d'abord) ; les sous-agents travaillent chacun dans leur **worktree** dédié.
- Un seul sujet par branche. Commit conventionnel (`feat:`/`fix:`/`perf:`/`refactor:`/`docs:`/`chore:`),
  push de la branche, **review** puis merge `--no-ff` sur `main`, push.
- Ne jamais toucher `node_modules/`, `dist/`, `backups/`, `.wrangler/`, ni les
  fichiers `src/data/questions-*.js` (ajout uniquement).

## Checklist avant chaque merge (code ET docs)

- [ ] `npm run lint` **0 erreur 0 warning**, `npm run lint:arch` 0 cycle
- [ ] `npm test` + `npm run test:coverage` (seuils `vitest.config.ts`, ratchet) +
      `npm run build` verts
- [ ] si `worker.ts`/`wrangler.toml` touchés : `npx wrangler deploy --dry-run` OK
- [ ] diff relu : code en anglais/commentaires français, UI en français, zéro emoji,
      pas de `linear-gradient`, pas de `console.log` dans `src/`, pas d'accès
      `localStorage`/`location` hors `lib/storage.ts`/`lib/nav.ts`/`app/urlFlags.ts`,
      pas de `dangerouslySetInnerHTML`/`eval`, plafond 200 L souple respecté
- [ ] **documentation relue** (obligatoire, même pour un commit « code seul ») :
      - [ ] chaque chemin de fichier cité existe sur le disque (spot-check `ls`) ;
      - [ ] chiffres du corpus jamais écrits en dur -> `npm run count:questions` ;
      - [ ] commandes citées testées telles quelles (`npm run test:game`, `db:migrate:local`…) ;
      - [ ] extensions à jour (`.ts`/`.tsx` ; seuls `questions-*.js` et `theme-manifest.js` restent en JS) ;
      - [ ] cohérence avec le code : flags URL (`?stockage=local`), flag admin `comptes.admin`, ports, clés localStorage ;
      - [ ] `CHANGELOG.md` à jour (entrée « Non publié »), `docs/INDEX.md` cohérent ;
      - [ ] grep de salissures : `worker.js`, `storage.js`, `.jsx`, `ci.yml`, `test:legacy`, `?stockage=d1`, `V2_ENABLED`
- [ ] pas de nouvelle librairie sans **justification écrite** (pour + contre)
- [ ] la prod répond après merge : `curl -s https://voltquiz.joris-leo81.workers.dev/api/ping`

## Décisions techniques

### 2026-11 — Passage à TypeScript (validé)

**Décision** : tout `src/` passe en `.ts`/`.tsx` (migration incrémentale : `lib/` d'abord,
puis `shared/`, `app/`, puis `features/`), `tsc --noEmit` strict, vérifié avant chaque merge (`npm run typecheck`, règle 11).
Les fichiers `src/data/questions-*.js` restent en JS (règle 7) avec le type déclaré dans
`src/data/questions.d.ts` ; le schéma zod (`src/lib/schema.ts`) reste la source de vérité
runtime (`z.infer` donne les types).

| Pour | Contre |
|---|---|
| Bugs attrapés à la compilation (props, champs renommés) — utile avec la V2 (API D1) et Capacitor | Coût de migration (~109 fichiers app) |
| Code auto-documenté pour le prochain développeur (non-dev assisté par agent) | +2 devDeps (`typescript`, `typescript-eslint`) — aucun impact runtime (Vite/esbuild) |
| zod déjà présent : `z.infer` = types du format JSON sans doublon | `strict` activé progressivement (ratchet), `checkJs: false` pendant la transition |

 documentées

Quand une décision n'est pas évidente, la documenter (dans le doc concerné ou la PR) :
contexte, options envisagées, **pour/contre de chaque option**, décision retenue, date.
Exemples déjà actés : localStorage comme cache local vs D1 (`docs/stockage-d1.md`),
PWA + routing par état plutôt que react-router (`docs/stack.md`), CSP d'abord en
report-only (`docs/securite.md`), 4 environnements dev/preview/deploy
(`docs/deploiement.md`). Le client peut ne pas être développeur : l'agent prend lui-même
les choix techniques en les expliquant.

## Environnements

`npm run dev` (local 5173), `npm run preview` (build servie en local 4173),
`npm run deploy:preview` (Cloudflare preview, D1 active),
`npm run deploy` (prod, D1 active) — détail dans `docs/deploiement.md`.

## Subagents / parallélisation

Pour les grosses demandes (ex. rédiger un lot de questions), déléguer à des sub-agents,
chacun sur SA branche et SES fichiers uniquement, max 3 en parallèle (limite réseau) ;
le parent relit (code + docs), teste (lint + tests + build), puis merge. Les lots de
questions rédigés par sub-agents doivent passer un contrôle anti-doublons
(normalisation minuscules/sans accents, `normalizeQuestionText` dans `src/lib/text.ts`).

## Déploiement

**Cloudflare Workers Builds** déploie automatiquement chaque push sur `main` en prod
(pas de GitHub Action, aucun secret Cloudflare dans GitHub — voir `docs/deploiement.md`).
Manuellement : `npm run deploy` / `npm run deploy:preview` (`npx wrangler login` en local).
