# VoltQuiz — mode d'emploi (routeur)

> Le dossier s'appelle encore `QUIZZWALLAH` (nom historique) ; le projet s'appelle
> **VoltQuiz** partout ailleurs. Ce fichier est un **routeur** : lis-le toujours,
> puis lis UNIQUEMENT les 1-3 fichiers de `docs/` utiles à ta tâche (voir `docs/INDEX.md`).
> Tu es peut-être piloté par quelqu'un qui n'est pas développeur : tu prends toi-même
> les choix techniques, en expliquant le pour et le contre (voir `docs/methodologie.md`,
> section « Décisions techniques »).

## C'est quoi ?

Quiz web rapide façon QuizUp, en **React 18 + Vite 6 + WPA (vite-plugin-pwa)**, déployé
sur Cloudflare Workers (`https://voltquiz.joris-leo81.workers.dev`). 4 modes : Solo
(3 niveaux), Duel 1v1 local, Survie (1 vie), Quizz du jour (tirage seedé + série de jours).
Comptage réel des questions : `npm run count:questions`. Comptes 100 % locaux pour
l'instant (POC) ; migration prévue vers Cloudflare D1 (voir `docs/stockage-d1.md`).
Roadmap : V2 = duel en ligne (D1 + Durable Objects, préparés), V3 = mobile Capacitor.

## Règles absolues (non négociables)

1. **UI et contenus en français. AUCUN emoji** (ni UI ni doc, y compris README) : icônes
   SVG uniquement dans `src/shared/ui/Icon.jsx`.
2. **Code en anglais, commentaires en français** (uniquement quand une décision n'est pas
   limpide — ne pas commenter l'évident). Exception documentée : les **clés du schéma de
   données** (`q`, `reponses`, `bonne`, `niveau`, `info`, `nom`, `icone`, `couleur`) restent
   en français car c'est le format JSON documenté pour le client
   (`docs/questions.md`) et les clés localStorage existantes.
   Les noms de classes CSS restent en français pour l'instant (refonte design prévue).
3. **Palette 60-30-10, AUCUN dégradé** : voir `docs/design.md` (palette « sobre » active,
   couleurs des thèmes à respecter, ne jamais inventer de couleur). Pour une refonte
   design en profondeur, suivre `docs/design.md` (tokens centralisés dans
   `src/styles/tokens.css`).
4. **1 responsabilité par fichier** ; plafond indicatif 200 lignes, **souple** : un fichier
   peut dépasser 200 L si les lignes ont du sens ensemble (ex. dictionnaire d'icônes
   `Icon.jsx`, synthétiseurs `sounds.js`) — sinon découper. Logique en hooks `useX.js`,
   fonctions pures dans `src/lib/` (zéro import React/DOM hors `sounds.js`).
5. **Aucun composant ne touche `localStorage`/`document`/`window.location`/`location`
   directement** : passer par `src/lib/storage.js` (read/write/remove/useStorage),
   `src/lib/nav.js` (origine/params URL/reload) et `src/app/urlFlags.js` (flags URL).
   Règle R5 appliquée en ERREUR par ESLint (exemption UNIQUEMENT pour `storage.js`,
   `nav.js`, `urlFlags.js`).
6. **ESLint : 0 erreur ET 0 warning tolérés** (`npm run lint`). Règles revues pour React :
   `react-hooks/rules-of-hooks` error, `exhaustive-deps` warn (désactivable au cas par cas
   avec justification en commentaire), `react-refresh/only-export-components` warn,
   `no-console` error, `no-unused-vars` warn (préfixe `_` pour ignorer).
7. **Ne JAMAIS toucher** à `node_modules/`, `dist/`, `backups/`, `.wrangler/`, et ne jamais
   modifier les 263 fichiers `src/data/questions-*.js` (ajout uniquement).
8. **Pas de nouvelle librairie externe** sans justification écrite (pour + contre) dans
   la PR/commit — le projet tourne avec très peu de dépendances (react, react-dom, zod).
9. **Tests : couverture appliquée**. `npm run test:coverage` échoue si les seuils de
   `vitest.config.js` ne sont pas atteints (plancher actuel, à relever — ratchet).
   Tester UNE feature seule : `npm run test:game`, `test:game:duel`, `test:scoring`…
10. **Environnements explicites** : `npm run dev` = local (5173) ; `npm run preview` = build
    local servi (4173) ; `npm run deploy:preview` = Cloudflare **preview** (V2 activée) ;
    `npm run deploy` = Cloudflare **prod**. Ne jamais déployer la prod depuis une branche
    non reviewée.
11. **Avant chaque merge** : `npm run lint` + `npm run lint:arch` + `npm test` +
    `npm run build` + `npx wrangler deploy --dry-run` tous verts.
12. **Review de chaque étape/commit** (par l'agent parent) : relire le **code** (règles
    ci-dessus + bonnes pratiques React) **ET la documentation** (docs/ à jour ? chemins
    de fichiers valides ? chiffres à jour via `npm run count:questions` ? cohérence avec
    le code ?) avant de merger.
13. Git : une branche `feature/<phase>-<slug>` par étape depuis `origin/main`, worktree
    dédié par sous-agent, review du diff (code + docs), merge sur `main`, push.
    Commits conventionnels (`feat:` `fix:` `perf:` `refactor:` `docs:` `chore:`).
    CI : lint+tests+couverture+build sur chaque PR, deploy preview sur PR, deploy prod
    auto sur `main`.
14. Pas de `console.log` dans `src/` (scripts/ exceptés), pas de code mort.

## Commandes

```bash
npm run dev              # DEV local -> http://localhost:5173
npm run build            # build prod (dist/) + génère le manifeste des thèmes
npm run preview          # PROD buildée servie en local -> http://localhost:4173
npm run deploy:preview   # déploiement Cloudflare PREVIEW (env preview, V2_ENABLED=true)
npm run deploy           # déploiement Cloudflare PROD
npm run lint             # eslint (0 erreur, 0 warning) ; lint:arch = pas de cycle
npm test                 # tous les tests Vitest ; test:game = flux solo seul (~2 s)
npm run test:coverage    # couverture avec seuils appliqués (échoue si en dessous)
npm run count:questions  # comptage réel du corpus (thèmes, questions, doublons)
npx wrangler deploy --dry-run   # valide worker.js + wrangler.toml sans déployer
```

## Où est quoi ? (pointeurs rapides)

| Sujet | Fichier |
|---|---|
| Règles du jeu, scoring, modes | `docs/jeu.md` |
| Architecture (app/, features/, lib/, shared/) | `docs/stack.md` |
| Design, palettes, refonte CSS en profondeur | `docs/design.md` |
| Questions (format, ajout, similarité, corpus) | `docs/questions.md` |
| Comptes, invité, modération, reset | `docs/comptes.md` |
| XP, badges, titres, classement, stats | `docs/progression.md` |
| Sécurité (headers, CSP, zod, hash, V2_ENABLED) | `docs/securite.md` |
| Stockage local (POC) -> D1, décision mobile | `docs/stockage-d1.md` |
| Déploiement Cloudflare + CI + envs dev/prod | `docs/deploiement.md` |
| Tests (quoi, où, commandes, couverture) | `docs/tests.md` |
| Méthodologie (branches, worktrees, review code+docs, décisions) | `docs/methodologie.md` |
| Mobile (Capacitor) | `docs/mobile.md` |
| Sons, vibrations, partage | `docs/sons-partage.md` |
| Dashboard admin | `docs/features/admin.md` |
| Écrans détaillés | `docs/features/` |

Le client n'est pas développeur : `README.md` (racine) reste le guide pas à pas.
