# VQuizz — mode d'emploi (routeur)

> Le projet s'appelle **VQuizz** (anciennement VoltQuiz, renommé le 2026-11-23 ; le dossier
> local s'appelle encore `QUIZZWALLAH`). Les **identifiants techniques restent `voltquiz`**
> (clés localStorage `voltquiz_*`, base D1, nom du Worker, URL de déploiement) : les changer
> casserait les données existantes. Ce fichier est un **routeur** : lis-le toujours,
> puis lis UNIQUEMENT les 1-3 fichiers de `docs/` utiles à ta tâche (voir `docs/INDEX.md`).
> Tu es peut-être piloté par quelqu'un qui n'est pas développeur : tu prends toi-même
> les choix techniques, en expliquant le pour et le contre (voir `docs/methodologie.md`,
> section « Décisions techniques »).

## C'est quoi ?

Quiz web rapide façon QuizUp, en **React 18 + Vite 6 + PWA (vite-plugin-pwa)**, déployé
sur Cloudflare Workers (`https://voltquiz.joris-leo81.workers.dev`). 4 modes : Solo
(3 niveaux), Duel 1v1 local, Rogue Quizz (3 vies, reliques), Quizz du jour (tirage seedé + série de jours).
Comptage réel des questions : `npm run count:questions`. Persistance : cache localStorage + base serveur **Cloudflare D1 par défaut**
(mode `d1` par défaut, `?stockage=local` pour forcer le hors-ligne — voir `docs/stockage-d1.md`).
Admin : `?admin=1` + flag `admin=1` sur le compte en D1 (`comptes.admin`, vérifié via `/api/admin/check` — `docs/features/admin.md`).
Roadmap : V2 = duel en ligne (D1 + Durable Objects, préparés), V3 = mobile Capacitor.

## Avant de commencer (obligatoire, à chaque session)

Plusieurs agents (et humains) poussent sur `main` en parallèle : un `main` local en retard
a déjà fait travailler un agent sur un état du projet vieux de 66 commits.

```bash
git fetch && git status -sb          # "behind N" ? -> git merge --ff-only origin/main
npm ci                               # si package-lock.json a bougé
npm run lint && npm test             # partir d'un état vert, sinon le signaler d'abord
```

Toute branche part de `origin/main` à jour. Si une consigne de ce fichier contredit le code,
**le code fait foi** : corrige la doc dans la même branche au lieu de suivre la consigne périmée.

## Règles absolues (non négociables)

1. **UI et contenus en français. AUCUN emoji** (ni UI ni doc, y compris README) : icônes
   SVG uniquement dans `src/shared/ui/Icon.tsx`.
2. **Code en anglais, commentaires en français** (uniquement quand une décision n'est pas
   limpide — ne pas commenter l'évident). **TypeScript partout** : `src/`, `tests/`, `worker*.ts`, `api/`, `durable-objects/`, `vite.config.ts`,
   `vitest.config.ts` sont en `.ts`/`.tsx` strict (`npm run typecheck` = `tsc --noEmit`, vert requis).
   Restent en JS pur : les fichiers `src/data/questions-*.js` + `theme-manifest.js` généré
   (règle 7 ; type déclaré dans `src/data/questions.d.ts`), `eslint.config.js` et `scripts/*.mjs`. Exception documentée : les **clés du schéma de
   données** (`q`, `reponses`, `bonne`, `niveau`, `info`, `nom`, `icone`, `couleur`) restent
   en français car c'est le format JSON documenté pour le client
   (`docs/questions.md`) et les clés localStorage existantes.
   Les noms de classes CSS restent en français pour l'instant (refonte design prévue).
3. **Palette 60-30-10, AUCUN dégradé** : voir `docs/design.md` (palette « Bleu roi » active,
   couleurs des thèmes à respecter, ne jamais inventer de couleur). Pour une refonte
   design en profondeur, suivre `docs/design.md` (tokens centralisés dans
   `src/styles/tokens.css`).
4. **1 responsabilité par fichier** ; plafond indicatif 200 lignes, **souple** : un fichier
   peut dépasser 200 L si les lignes ont du sens ensemble (ex. dictionnaire d'icônes
   `Icon.tsx`, synthétiseurs `sounds.ts`) — sinon découper. Logique en hooks `useX.ts`,
   fonctions pures dans `src/lib/` (zéro import React/DOM hors `sounds.ts`).
5. **Aucun composant ne touche `localStorage`/`document`/`window.location`/`location`
   directement** : passer par `src/lib/storage.ts` (read/write/remove/useStorage),
   `src/lib/nav.ts` (origine/params URL/reload) et `src/app/urlFlags.ts` (flags URL).
   Règle R5 appliquée en ERREUR par ESLint (exemption UNIQUEMENT pour `storage.ts`,
   `nav.ts`, `urlFlags.ts`).
6. **ESLint : 0 erreur ET 0 warning tolérés** (`npm run lint`, qui lance aussi
   `scripts/check-repo.mjs` : emojis, chemins cités dans la doc, scripts npm, termes périmés —
   ne jamais contourner ce contrôle, corriger la cause ; s'il se trompe, corriger le script et dire pourquoi). Règles revues pour React :
   `react-hooks/rules-of-hooks` error, `exhaustive-deps` warn (désactivable au cas par cas
   avec justification en commentaire), `react-refresh/only-export-components` warn,
   `no-console` error, `no-unused-vars` warn (préfixe `_` pour ignorer).
7. **Ne JAMAIS toucher** à `node_modules/`, `dist/`, `backups/`, `.wrangler/`, et ne jamais
   modifier les fichiers `src/data/questions-*.js` (ajout uniquement).
8. **Pas de nouvelle librairie externe** sans justification écrite (pour + contre) dans
   la PR/commit — dépendances : react, react-dom, zod (runtime) + tooling (vite, vitest,
   eslint, typescript, wrangler...). Décision TS documentée dans `docs/methodologie.md`.
9. **Tests : couverture appliquée**. `npm run test:coverage` échoue si les seuils de
   `vitest.config.ts` ne sont pas atteints (plancher actuel, à relever — ratchet).
   Tester UNE feature seule : `npm run test:game`, `test:game:duel`, `test:game:rogue`,
   `test:game:daily`, `test:scoring`… Un script npm qui cite un fichier inexistant casse
   `npm run lint` (`scripts/check-repo.mjs`) : en renommant/supprimant un test, mettre à jour `package.json`.
10. **Environnements explicites** : `npm run dev` = local (5173) ; `npm run preview` = build
    local servi (4173) ; `npm run deploy:preview` = Cloudflare **preview** (D1 active) ;
    `npm run deploy` = Cloudflare **prod**. Ne jamais déployer la prod depuis une branche
    non reviewée.
11. **Avant chaque merge** : `npm run lint` + `npm run typecheck` + `npm run lint:arch` +
    `npm test` + `npm run build` + `npx wrangler deploy --dry-run` tous verts.
12. **Review de chaque étape/commit** (par l'agent parent) : relire le **code** (règles
    ci-dessus + bonnes pratiques React) **ET la documentation** avant de merger, avec la
    checklist détaillée de `docs/methodologie.md` (« Checklist avant chaque merge ») :
    - chemins de fichiers cités **existent sur le disque** (spot-check `ls`) ;
    - chiffres du corpus **jamais en dur** : régénérés via `npm run count:questions` ;
    - commandes citées **testées** (`npm run test:game`, `db:migrate:local`...) ;
    - extensions à jour (`.ts`/`.tsx`, sauf `questions-*.js`/`theme-manifest.js`) ;
    - cohérence avec le code (ex. flag `comptes.admin`, modes de stockage, flags URL) ;
    - `CHANGELOG.md` a une entrée, `docs/INDEX.md` reflète les docs courantes.
13. Git : une branche `feature/<phase>-<slug>` par étape depuis `origin/main`, worktree
    dédié par sous-agent, review du diff (code + docs), merge sur `main`, push.
    Commits conventionnels (`feat:` `fix:` `perf:` `refactor:` `docs:` `chore:`).
    Pas de CI GitHub (supprimée) : Cloudflare déploie automatiquement chaque push sur
    `main` (Workers Builds, aucun secret dans GitHub) ; les vérifications de la règle 11
    se font en local avant chaque push.
14. Pas de `console.log` dans `src/` (scripts/ exceptés), pas de code mort : une fonction
    exportée **utilisée seulement par les tests** est du code mort (la supprimer avec ses tests).
15. **Renommer, remplacer ou supprimer une feature** (mode, écran, fichier, commande) :
    dans la même branche, `grep -rn "<ancien nom>" AGENTS.md README.md docs/ package.json tests/`
    et tout mettre à jour (l’ancien mode Survie, remplacé par Rogue Quizz, était resté cité partout).
    Ajouter l'ancien nom à la liste `STALE` de `scripts/check-repo.mjs` pour qu'il ne revienne pas.
16. **Ce fichier n'est pas un journal** : pas d'historique daté ni de chiffres (nombre de
    questions, de badges, de fichiers) qui se périment. L'historique va dans `CHANGELOG.md`,
    les procédures durables dans le `docs/` concerné.

## Commandes

```bash
npm run dev              # DEV local -> http://localhost:5173
npm run build            # build prod (dist/) + génère le manifeste des thèmes
npm run preview          # PROD buildée servie en local -> http://localhost:4173
npm run deploy:preview   # déploiement Cloudflare PREVIEW (env preview, D1 active)
npm run deploy           # déploiement Cloudflare PROD
npm run lint             # eslint (0 erreur, 0 warning) + check-repo ; lint:arch = pas de cycle
npm run typecheck        # tsc --noEmit (strict sur les .ts/.tsx)
npm test                 # tous les tests Vitest ; test:game = flux solo seul (~2 s)
npm run test:coverage    # couverture avec seuils appliqués (échoue si en dessous)
npm run count:questions  # comptage réel du corpus (thèmes, questions, doublons)
npm run db:migrate:local # applique les migrations D1 en LOCAL (dev workerd, .wrangler/state)
npm run db:migrate       # applique les migrations D1 en PROD (wrangler login ou CLOUDFLARE_API_TOKEN)
npx wrangler deploy --dry-run   # valide worker.ts + wrangler.toml sans déployer
```

## Où est quoi ? (pointeurs rapides)

| Sujet                                                           | Fichier                  |
| --------------------------------------------------------------- | ------------------------ |
| Règles du jeu, scoring, modes                                   | `docs/jeu.md`            |
| Architecture (app/, features/, lib/, shared/)                   | `docs/stack.md`          |
| Design, palettes, refonte CSS en profondeur                     | `docs/design.md`         |
| Questions (format, ajout, similarité, corpus)                   | `docs/questions.md`      |
| Comptes, invité, modération, reset                              | `docs/comptes.md`        |
| XP, badges, titres, classement, stats                           | `docs/progression.md`    |
| Sécurité (headers, CSP, zod, hash, gate admin `comptes.admin`)  | `docs/securite.md`       |
| localStorage (cache) + D1 (base par défaut), décision mobile    | `docs/stockage-d1.md`    |
| Déploiement Cloudflare (auto depuis `main`) + envs dev/prod     | `docs/deploiement.md`    |
| Tests (quoi, où, commandes, couverture)                         | `docs/tests.md`          |
| Méthodologie (branches, worktrees, review code+docs, décisions) | `docs/methodologie.md`   |
| Mobile (Capacitor)                                              | `docs/mobile.md`         |
| Sons, vibrations, partage                                       | `docs/sons-partage.md`   |
| Dashboard admin                                                 | `docs/features/admin.md` |
| Écrans détaillés                                                | `docs/features/`         |

Le client n'est pas développeur : `README.md` (racine) reste le guide pas à pas.
