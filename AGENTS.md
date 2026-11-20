# VoltQuiz — mode d'emploi (routeur)

> Le dossier s'appelle encore `QUIZZWALLAH` (nom historique) ; le projet s'appelle
> **VoltQuiz** partout ailleurs. Ce fichier est un **routeur** : lis-le toujours,
> puis lis UNIQUEMENT les 1-3 fichiers de `docs/` utiles à ta tâche (voir `docs/INDEX.md`).

## C'est quoi ?

Quiz web rapide façon QuizUp, en **React 18 + Vite 6 + WPA (vite-plugin-pwa)**, déployé
sur Cloudflare Workers (`https://voltquiz.joris-leo81.workers.dev`). 4 modes : Solo
(3 niveaux), Duel 1v1 local, Survie (1 vie), Quizz du jour (tirage seedé + série de jours).
12 thèmes actifs, 13 261 questions intégrées en pur JS local. Comptes 100 % locaux.
Roadmap : V2 = duel en ligne (D1 + Durable Objects, déjà préparés), V3 = mobile Capacitor.

## Règles absolues (non négociables)

1. **UI et contenus en français. AUCUN emoji** (ni UI ni doc) : icônes SVG uniquement
   dans `src/components/Icone.jsx`.
2. **Palette 60-30-10, AUCUN dégradé** : voir `docs/design.md` (palette « sobre » active,
   couleurs des 12 thèmes à respecter, ne jamais inventer de couleur).
3. **1 responsabilité par fichier** (plafond indicatif 200 L) ; logique en hooks `useX.js`,
   fonctions pures dans `src/lib/` (zéro import React/DOM hors `sons.js`).
4. **Aucun composant ne touche `localStorage`/`document`/`window.location` directement** :
   passer par `src/lib/storage.js` (lire/ecrire/useStockage) et `src/app/urlFlags.js`.
5. **Ne JAMAIS toucher** à `node_modules/`, `dist/`, `backups/`, `.wrangler/`, et ne jamais
   modifier les 263 fichiers `src/data/questions-*.js` (ajout uniquement).
6. **Avant chaque merge** : `npm run lint` + `npm run lint:arch` + `npm test` +
   `npm run test:legacy` + `npm run build` + `npx wrangler deploy --dry-run` tous verts.
7. Git : une branche `feature/<phase>-<slug>` par étape depuis `origin/main`, review du diff,
   merge sur `main`, push. Commits conventionnels (`feat:` `fix:` `perf:` `refactor:` `docs:` `chore:`).
   La CI déploie automatiquement sur Cloudflare à chaque push sur `main`.
8. Pas de `console.log` dans `src/` (scripts/ exceptés), commentaires en français, pas de code mort.

## Commandes

```bash
npm run dev            # serveur local -> http://localhost:5173
npm run build          # build prod (dist/) + génère le manifeste des thèmes
npm run preview        # sert la prod -> http://localhost:4173
npm run deploy         # publie sur Cloudflare Workers
npm run lint           # eslint (0 erreur toléré) ; npm run lint:arch = pas d'import circulaire
npm test               # 81 tests Vitest ; npm run test:partie = le flux solo seul (~2 s)
npm run test:legacy    # 26 tests historiques (node test-unitaire.mjs)
npx wrangler deploy --dry-run   # valide worker.js + wrangler.toml sans déployer
npm run gen:manifest   # régénère src/data/manifest-themes.js (auto via predev/prebuild)
```

## Où est quoi ? (pointeurs rapides)

| Sujet | Fichier |
|---|---|
| Règles du jeu, scoring, modes | `docs/jeu.md` |
| Architecture (app/, features/, lib/, shared/) | `docs/stack.md` |
| Design, palettes, accessibilité | `docs/design.md` |
| Questions (format, ajout, similarité, corpus) | `docs/questions.md` |
| Comptes, invité, modération, reset | `docs/comptes.md` |
| XP, badges, titres, classement, stats | `docs/progression.md` |
| Sécurité (headers, CSP, zod, hash) | `docs/securite.md` |
| Stockage local -> D1 (migration V2) | `docs/stockage-d1.md` |
| Déploiement Cloudflare + CI | `docs/deploiement.md` |
| Tests (quoi, où, commandes) | `docs/tests.md` |
| Méthodologie (branches, review, subagents) | `docs/methodologie.md` |
| Mobile (Capacitor) | `docs/mobile.md` |
| Sons, vibrations, partage | `docs/sons-partage.md` |
| Écrans détaillés | `docs/features/` |

Le client n'est pas développeur : `README.md` (racine) reste le guide pas à pas.
