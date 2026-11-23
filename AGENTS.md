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
Comptage réel des questions : `npm run count:questions`. Persistance : cache localStorage + base serveur **Cloudflare D1 par défaut**
(mode `d1` par défaut, `?stockage=local` pour forcer le hors-ligne — voir `docs/stockage-d1.md`).
Admin : `?admin=1` + flag `admin=1` sur le compte en D1 (`comptes.admin`, vérifié via `/api/admin/check` — `docs/features/admin.md`).
Roadmap : V2 = duel en ligne (D1 + Durable Objects, préparés), V3 = mobile Capacitor.

## Règles absolues (non négociables)

1. **UI et contenus en français. AUCUN emoji** (ni UI ni doc, y compris README) : icônes
   SVG uniquement dans `src/shared/ui/Icon.tsx`.
2. **Code en anglais, commentaires en français** (uniquement quand une décision n'est pas
   limpide — ne pas commenter l'évident). **TypeScript partout** : `src/`, `tests/`, `worker*.ts`, `durable-objects/`, `vite.config.ts`,
   `vitest.config.ts` sont en `.ts`/`.tsx` strict (`npm run typecheck` = `tsc --noEmit`, vert requis).
   Restent en JS pur : les 263 fichiers `src/data/questions-*.js` + `theme-manifest.js` généré
   (règle 7 ; type déclaré dans `src/data/questions.d.ts`), `eslint.config.ts` et `scripts/*.mjs`. Exception documentée : les **clés du schéma de
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
   `Icon.tsx`, synthétiseurs `sounds.ts`) — sinon découper. Logique en hooks `useX.ts`,
   fonctions pures dans `src/lib/` (zéro import React/DOM hors `sounds.ts`).
5. **Aucun composant ne touche `localStorage`/`document`/`window.location`/`location`
   directement** : passer par `src/lib/storage.ts` (read/write/remove/useStorage),
   `src/lib/nav.ts` (origine/params URL/reload) et `src/app/urlFlags.ts` (flags URL).
   Règle R5 appliquée en ERREUR par ESLint (exemption UNIQUEMENT pour `storage.ts`,
   `nav.ts`, `urlFlags.ts`).
6. **ESLint : 0 erreur ET 0 warning tolérés** (`npm run lint`). Règles revues pour React :
   `react-hooks/rules-of-hooks` error, `exhaustive-deps` warn (désactivable au cas par cas
   avec justification en commentaire), `react-refresh/only-export-components` warn,
   `no-console` error, `no-unused-vars` warn (préfixe `_` pour ignorer).
7. **Ne JAMAIS toucher** à `node_modules/`, `dist/`, `backups/`, `.wrangler/`, et ne jamais
   modifier les 263 fichiers `src/data/questions-*.js` (ajout uniquement).
8. **Pas de nouvelle librairie externe** sans justification écrite (pour + contre) dans
   la PR/commit — dépendances : react, react-dom, zod (runtime) + tooling (vite, vitest,
   eslint, typescript, wrangler...). Décision TS documentée dans `docs/methodologie.md`.
9. **Tests : couverture appliquée**. `npm run test:coverage` échoue si les seuils de
   `vitest.config.ts` ne sont pas atteints (plancher actuel, à relever — ratchet).
   Tester UNE feature seule : `npm run test:game`, `test:game:duel`, `test:scoring`…
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
14. Pas de `console.log` dans `src/` (scripts/ exceptés), pas de code mort.

## Commandes

```bash
npm run dev              # DEV local -> http://localhost:5173
npm run build            # build prod (dist/) + génère le manifeste des thèmes
npm run preview          # PROD buildée servie en local -> http://localhost:4173
npm run deploy:preview   # déploiement Cloudflare PREVIEW (env preview, D1 active)
npm run deploy           # déploiement Cloudflare PROD
npm run lint             # eslint (0 erreur, 0 warning) ; lint:arch = pas de cycle
npm run typecheck        # tsc --noEmit (strict sur les .ts/.tsx)
npm test                 # tous les tests Vitest ; test:game = flux solo seul (~2 s)
npm run test:coverage    # couverture avec seuils appliqués (échoue si en dessous)
npm run count:questions  # comptage réel du corpus (thèmes, questions, doublons)
npm run db:migrate:local # applique les migrations D1 en LOCAL (dev workerd, .wrangler/state)
npm run db:migrate       # applique les migrations D1 en PROD (wrangler login ou CLOUDFLARE_API_TOKEN)
npx wrangler deploy --dry-run   # valide worker.ts + wrangler.toml sans déployer
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
| Sécurité (headers, CSP, zod, hash, gate admin `comptes.admin`) | `docs/securite.md` |
| localStorage (cache) + D1 (base par défaut), décision mobile | `docs/stockage-d1.md` |
| Déploiement Cloudflare + CI + envs dev/prod | `docs/deploiement.md` |
| Tests (quoi, où, commandes, couverture) | `docs/tests.md` |
| Méthodologie (branches, worktrees, review code+docs, décisions) | `docs/methodologie.md` |
| Mobile (Capacitor) | `docs/mobile.md` |
| Sons, vibrations, partage | `docs/sons-partage.md` |
| Dashboard admin | `docs/features/admin.md` |
| Écrans détaillés | `docs/features/` |

Le client n'est pas développeur : `README.md` (racine) reste le guide pas à pas.

## Dédoublonnage du corpus (fait le 2026-11-22)

- `node scripts/dedupe-questions.mjs` : supprime les doublons exacts (même question normalisée
  dans le même thème, comme `npm run count:questions`), garde la 1ère occurrence, réécrit
  uniquement les fichiers concernés (en-tête et nom d'export conservés).
  Résultat : 73 doublons supprimés, `doublons exacts : 0`, 13 488 questions, 12 thèmes actifs ≥ 1079.
  Sauvegarde des données avant run : `backups/data-avant-dedup-*`.

## 4 nouveaux thèmes (ajoutés le 2026-11-22, objectif 1000 questions chacun ATTEINT)

- `technologie` (Technologie & Internet, icône `chip`, `#38bdf8`) : 1000 questions
- `nature` (Nature & Animaux, icône `paw`, `#4ade80`) : 1000 questions
- `economie` (Économie & Marques, icône `coins`, `#fbbf24`) : 1000 questions
- `auto` (Voitures & Auto-moto, icône `car`, `#fb7185`) : 1001 questions
- Packs de départ écrits à la main (`questions-<theme>.js`, 40 q) puis vagues de sous-agents
  (`questions-vague<N>-<theme>-*.js`, 300 q par vague = 6 fichiers de 50, complément final
  `questions-vague5-<theme>-a1.js` de 60). Anti-doublons normalisé à chaque lot -> corpus à 0 doublon.
- 12 titres dédiés (3 par thème dans `TITLES_PER_THEME`, `src/lib/titles.ts`) -> 62 titres au total.
- 9 badges dédiés (`src/lib/badges.ts` : niveau 3 + 5 sur chacun des 4 thèmes via `themeLevels`,
  + `themes-16`) -> 39 badges au total. Icônes `chip`/`paw`/`coins`/`car` ajoutées dans `src/shared/ui/Icon.tsx`.
- Couleurs reprises de la palette fixe de `docs/design.md` (jamais de couleur inventée).
