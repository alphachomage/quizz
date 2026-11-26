# Méthodologie (git, review, travail parallèle)

## Branches et worktrees

- Une étape = une branche `feature/<phase>-<slug>` créée depuis `origin/main` à jour
  (fetch d'abord) ; les sous-agents travaillent chacun dans leur **worktree** dédié.
- Un seul sujet par branche. Commit conventionnel (`feat:`/`fix:`/`perf:`/`refactor:`/`docs:`/`chore:`),
  push de la branche, **review** puis merge `--no-ff` sur `main`, push.
- Ne jamais toucher `node_modules/`, `dist/`, `backups/`, `.wrangler/`, ni les
  fichiers `src/data/questions-*.js` (ajout uniquement).
- **Format des commits** : titre conventionnel sur la 1re ligne, ligne vide, corps
  éventuel, puis les trailers (`Co-Authored-By: ...`) **sur leur propre ligne**. Un
  `git commit -m "titre Co-Authored-By: ..."` colle le trailer au titre (déjà arrivé) :
  utiliser plusieurs `-m` ou un heredoc :

  ```bash
  git commit -F- <<'EOF'
  fix(game): bonne réponse décalée après un 50/50

  Co-Authored-By: ...
  EOF
  ```

## Checklist avant chaque merge (code ET docs)

- [ ] `git fetch` : la branche part bien d'`origin/main` à jour (sinon rebase/merge d'abord)
- [ ] `npm run lint` **0 erreur 0 warning** (inclut `scripts/check-repo.mjs`),
      `npm run typecheck`, `npm run lint:arch` 0 cycle
- [ ] `npm test` + `npm run test:coverage` (seuils `vitest.config.ts`, ratchet) +
      `npm run build` + `npx wrangler deploy --dry-run` verts (toujours, règle 11)
- [ ] refactor d'un écran ou d'un hook de jeu : les tests ne suffisent pas, faire une
      partie à la main (`npm run dev`) dans le mode touché avant de pousser
- [ ] code mort : `grep` chaque export nouveau ou modifié — utilisé seulement par
      `tests/` = à supprimer (règle 14)
- [ ] feature renommée/supprimée : ancien nom grepé dans docs, `package.json`, tests
      et ajouté à `STALE` dans `scripts/check-repo.mjs` (règle 15)
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
      - [ ] grep de salissures : `worker.js`, `storage.js`, `ci.yml`, `test:legacy`, `?stockage=d1`
            (emojis, chemins cités, scripts npm et termes périmés sont vérifiés automatiquement par `npm run lint`)
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

### Autres décisions documentées

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
chacun sur SA branche et SES fichiers uniquement ; le parent relit (code + docs), teste
(règle 11), puis merge `--no-ff` une branche à la fois. Brief type d'un sous-agent :

- partir d'`origin/main` à jour, créer `feature/<phase>-<slug>` dans son worktree ;
- `ln -s <repo>/node_modules node_modules` dans le worktree pour éviter un `npm ci`
  (sauf s'il modifie les dépendances), sans jamais commiter ce lien ;
- **ne pas toucher `CHANGELOG.md`** (le parent écrit l'entrée au merge : sinon conflit
  garanti entre branches parallèles) et lister dans le brief les fichiers réservés à une
  autre branche ;
- si le build modifie `src/data/theme-manifest.js` sans raison, `git checkout --` le fichier ;
- lancer la règle 11 complète, commiter, **ne pas merger ni pousser** ;
- rapporter : branche, SHA, fichiers, vérifs, et tout problème vu hors périmètre.

Choix du modèle : un petit modèle pour le mécanique (renommage, chemins, découpage sans
logique), un modèle intermédiaire pour ce qui demande du jugement (refactor de hook,
découpage du worker, doc fonctionnelle), le parent garde la review et les merges. Les lots de
questions rédigés par sub-agents doivent passer un contrôle anti-doublons
(normalisation minuscules/sans accents, `normalizeQuestionText` dans `src/lib/text.ts`).

## Déploiement

**Cloudflare Workers Builds** déploie automatiquement chaque push sur `main` en prod
(pas de GitHub Action, aucun secret Cloudflare dans GitHub — voir `docs/deploiement.md`).
Manuellement : `npm run deploy` / `npm run deploy:preview` (`npx wrangler login` en local).

## Leçons de l'audit du 2026-11-26 (pourquoi ces garde-fous existent)

| Erreur constatée | Garde-fou |
|---|---|
| `main` local en retard de 66 commits | section « Avant de commencer » d'`AGENTS.md` |
| scripts `test:*` pointant vers des `.jsx` supprimés (aucun test lancé) | `check-repo.mjs` contrôle 1 |
| `madge` ignorait 57 fichiers (alias non résolus) : `lint:arch` toujours vert à tort | `--ts-config tsconfig.json` ; un outil qui « passe » doit être vérifié une fois en cassant exprès |
| emojis dans l'UI malgré la règle 1 | `check-repo.mjs` contrôle 2 |
| doc citant l’ancien mode Survie après son remplacement | règle 15 + `check-repo.mjs` contrôle 4 |
| chiffres du corpus en dur dans la doc | `check-repo.mjs` contrôle 4 + règle 16 |
| source maps publiées en prod | `public/.assetsignore` (`*.map`) |
| fonctions exportées utilisées seulement par les tests | règle 14 + checklist |
| trailer de commit collé au titre | format des commits ci-dessus |

