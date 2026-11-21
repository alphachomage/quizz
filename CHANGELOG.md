# CHANGELOG — VoltQuiz

Toutes les évolutions notables du projet sont documentées ici, de la plus récente à la plus ancienne.
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnage sémantique.

## Non publié

### Corrigé
- **Synchro D1 : aucune perte silencieuse des écritures serveur** (le mode `d1` écrivait bien en D1 via `/api/kv/*`, mais un POST refusé — hors-ligne, 429, 5xx, ou body > 64 Ko — était ignoré silencieusement, et `preloadFromServer()` écrasait ensuite le local par l'état serveur au démarrage : la progression « restait en localStorage »). Ajout d'une **file d'attente** (`voltquiz_pending_writes`, clé localStorage locale) : toute écriture refusée y est stockée et retentée par `flushPendingWrites()` au démarrage, après chaque write et sur `online` ; `preloadFromServer()` ne touche jamais une clé en attente. `remove()` pousse désormais un `DELETE /api/kv/<cle>` (pending `null` si échec). Tests : `tests/unit/lib/storage-d1.test.ts` (7 tests) + `tests/unit/worker/api-kv.test.ts` (6 tests).
- **`/api/kv` : plafond de body 64 Ko -> 1 Mo** (`worker-api.ts`) : `voltquiz_parties` (historique 500 parties avec détail) dépassait 64 Ko, donc son POST renvoyait 400 et n'était jamais persisté côté serveur. Le plafond général 64 Ko reste pour les autres routes. `DELETE` ajouté à `Access-Control-Allow-Methods`.
- **Service worker périmé** (« l'appli ne marche qu'après avoir vidé le cache ») : un vieux SW servait indéfiniment son ancien precache (bundle cassant). `registerSW` resserre le check de mise à jour à **5 min** (`onRegisteredSW` + `r.update()`, au lieu d'environ 1 h avec autoUpdate) dans `src/main.tsx`.

### Corrigé
- **Appli KO en prod (erreur React #185 « Maximum update depth exceeded »)** : `read()` (`src/lib/storage.ts`) renvoyait un `JSON.parse` neuf à chaque appel, donc un snapshot à référence instable pour `useSyncExternalStore` (hook `useStorage`) -> boucle de rendu infinie dès qu'une clé stockée contient un objet (records, XP, parties…), crash au chargement de l'accueil. `read()` renvoie désormais la MÊME référence tant que la chaîne brute ne change pas (cache invalidé par `write`/`remove`/`preloadFromServer`), et `useStorage` gèle la valeur par défaut dans une ref (un littéral inline `{}`/`[]` ne casse plus le snapshot). Test de régression : `tests/unit/shared/useStorage.test.tsx` (7 tests, dont le scénario exact du crash).
- **Rapports CSP « eval bloqué » en prod** : zod 4 compilait ses schémas en JIT via `new Function()` (visible dans `index-*.js`), interdit par `script-src 'self'`. `z.config({ jitless: true })` posé à l'import dans `src/lib/schema.ts` : plus aucun eval, compatible CSP même appliquée (test dans `tests/unit/lib/schema.test.ts`).

### Modifié
- Review doc renforcée : règle 12 d'`AGENTS.md` pointe désormais vers une sous-checklist doc détaillée dans `docs/methodologie.md` (chemins existants, chiffres via `count:questions`, commandes testées, extensions TS, cohérence flags/`V2_ENABLED`, CHANGELOG + INDEX à jour, grep des refs périmées). Dérive corrigée au passage : `docs/methodologie.md` disait encore `V2_ENABLED=false` en prod.


### Modifié
- Passe de cohérence TypeScript sur toutes les docs agents (`AGENTS.md`, `README.md`, `docs/**`) : extensions de fichiers corrigées (`.js`/`.jsx` -> `.ts`/`.tsx`, `Icone` -> `Icon`), `?stockage=d1` -> `?stockage=local` (le mode `d1` est désormais le défaut), `worker.js`/`worker-api.js` -> `.ts`. Les anciens MD racine dupliqués (`COMMENT-AJOUTER-MES-QUESTIONS.md`, `DEPLOIEMENT-CLOUDFLARE.md`) avaient déjà été supprimés : le contenu canonique est dans `docs/questions.md` et `docs/deploiement.md`.


### Supprimé
- GitHub Action `.github/workflows/ci.yml` (et `.github/`) : redondante — Cloudflare Workers Builds déploie automatiquement chaque push sur `main`. Plus aucun secret Cloudflare (`CLOUDFLARE_API_TOKEN`…) dans GitHub. Les vérifications (lint, typecheck, lint:arch, tests, build, `wrangler deploy --dry-run`) restent obligatoires en local avant chaque push (règle 11). Docs mises à jour : `docs/deploiement.md`, `docs/methodologie.md`, `docs/tests.md`, `docs/stack.md`, `docs/INDEX.md`, `AGENTS.md`.


### Modifié
- **D1 activée** : `V2_ENABLED="true"` en prod et preview (`wrangler.toml`), mode stockage `d1` par défaut dans `src/lib/storage.ts` (échappatoire `?stockage=local`), scripts `npm run db:migrate:local` / `db:migrate`. Dev local = workerd + D1 locale sqlite (`.wrangler/state`), migrations locales appliquées. Smoke test local OK (POST/GET `/api/kv/*` sur D1, 400 sans `value`). Bug corrigé au passage : `routeKv` lisait `body.value` mais testait `'valeur' in body` -> 400/500 incohérents.


### Modifié
- **Migration TypeScript terminée** : `tests/` en `.ts`/`.tsx` (20 fichiers), `vite.config.ts` + `vitest.config.ts`. Le projet est 100 % TS hors `src/data/questions-*.js` + `theme-manifest.js` (généré), `eslint.config.js` et `scripts/*.mjs`. `tsc --noEmit` strict = 0 erreur, lint 0/0, 130 tests OK, build + dry-run OK.


### Modifié
- **Phases 2-3 de la migration TS mergées : `src/` est 100 % TypeScript** (lib, data loader + questions.d.ts, shared, app, toutes les features, main.tsx ; seul `src/data/theme-manifest.js` généré reste en JS). Worker aussi en TS (`worker.ts`, `worker-api.ts`, `DuelRoom.ts`, `main = "worker.ts"` dans wrangler.toml, types locaux `durable-objects/workers-env.d.ts`). `@types/react`/`@types/react-dom` ajoutés. `tsc --noEmit` strict = 0 erreur, lint 0/0, 130 tests OK, build + dry-run OK.


### Modifié
- **Phase 1 de la migration TS terminée : `src/lib/` est 100 % TypeScript** (29 modules `.ts`, 0 `.js`), typage strict sans `any`, types métier cœur dans `src/lib/types.ts`, types persistés centralisés dans `repositories.ts`. 4 branches subagents (storage / draw / flow / accounts) mergées + branche d'intégration (types dupliqués unifiés). `tsc --noEmit` vert, lint 0/0, 130 tests OK.


### Ajouté
- **TypeScript** : `tsconfig.json` (strict sur les `.ts`/`.tsx`, `allowJs`+`checkJs:false` pendant la migration incrémentale), `src/vite-env.d.ts`, `npm run typecheck` (`tsc --noEmit`) + étape CI, bloc `typescript-eslint` dans `eslint.config.js` (règles R1-R5 étendues aux `.ts`/`.tsx`), `typescript@^5` + `typescript-eslint@^8` en devDeps (Vite compile le TS nativement, zéro impact runtime). Migration par couches : `lib/` -> `data/questions.d.ts` -> `shared/`/`app/` -> `features/`. Les 263 fichiers `questions-*.js` restent en JS. Décision documentée dans `docs/methodologie.md`.


### Nettoyé
- Stubs racine supprimés (`COMMENT-AJOUTER-MES-QUESTIONS.md`, `DEPLOIEMENT-CLOUDFLARE.md`, `PALETTES.md`) : le contenu vivait déjà dans `docs/questions.md`, `docs/deploiement.md` et `docs/design.md` (palette « vivante » archivée réintégrée dans `docs/design.md`). Références mises à jour (README, AGENTS.md, docs/INDEX.md).
- CI : étape « Vérifier les secrets Cloudflare » avant chaque deploy (message d'erreur explicite si `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` manquent) + procédure pas à pas des secrets dans `docs/deploiement.md`.


### Nettoyé
- Suite de tests « legacy » supprimée (`scripts/legacy-tests.mjs`, `npm run test:legacy`) : une seule façon de tester, Vitest (`npm test`). Les vérifications non couvertes ont été portées : `tests/data/corpus-draw.test.js` (diversité du tirage sur le vrai corpus : sujets, plafond par thème, quizz du jour), `tests/unit/lib/titles.test.js` (50 titres, nextTitle), `tests/unit/lib/suggestions.test.js` (ajout/ordre/refus du vide/suppression), + assertions 30 badges et semaine en cours dans `badges.test.js` / `daily.test.js`.


### Nettoyé
- Barrel `src/lib/index.js` supprimé : tous les imports pointent directement vers le module concerné (ex. `@lib/scoring.js`).
- Code mort supprimé : repos inutilisés (`SessionRepo`, `AccountsRepo`, `TutorialRepo`) et exports internes non utilisés retirés de `export`.
- Identifiants français renommés en anglais dans tout `src/`, `tests/`, `scripts/`, `worker*.js` (ex. `jouerSon` -> `playSound`, `sabonner` -> `subscribe`, `estInvite` -> `isGuest`, props `onFermer` -> `onClose`...). Exceptions documentées (inchangées) : clés du schéma de données/persistées (`q`, `reponses`, `bonne`, `niveau`, `statut`, `bonnes`...) et noms de classes CSS.
- Fichiers renommés : `src/lib/texte.js` -> `text.js`, `scripts/test-unitaire.mjs` -> `legacy-tests.mjs`, tests `tirage/similarite/comptes/quotidien.test.js` -> `draw/similarity/accounts/daily.test.js`. Scripts npm : `test:partie*` -> `test:game*`, `test:tirage` -> `test:draw`, `test:similarite` -> `test:similarity`, `test:comptes` -> `test:accounts`.
- Racine : `COMPARAISON-QUIZUP.md` déplacé dans `docs/veille-quizup.md` ; changesets retiré (CHANGELOG manuel) ; branches git mergées supprimées (y compris `origin/safety/pre-codemod`, ancêtre de main).
- Commentaires de chemins périmés corrigés (ex. `features/partie/tirage.js` -> `features/game/draw.js`).

## 0.1.0 — 2026-11-20

Première version publiée (WPA installable + hors-ligne, déployée sur Cloudflare Workers).

### Ajouté
- 4 modes de jeu : Solo (3 niveaux de difficulté), Duel 1v1 local, Survie (1 vie, tous niveaux), Quizz du jour (tirage seedé + série de jours).
- 12 thèmes de 1000+ questions chacun (plus de 13 500 questions intégrées en pur JavaScript local).
- Score arcade : 10 s par question, jusqu'à 20 points par bonne réponse, bonus de série, dernière manche d'un duel en x2.
- Comptes 100 % locaux (pseudo + e-mail + mot de passe hashé SHA-256 salé), mode invité, modération des pseudos.
- Progression : XP et niveaux par thème, 30 badges, 50 titres, classement local, statistiques détaillées.
- Questions personnelles proposées depuis l'appli (détection de similarité, validation manuelle) ou via `public/questions-utilisateur.json`.
- Sons générés en Web Audio, vibrations, partage du résultat du quizz du jour (image générée en canvas).
- Filet de sécurité : `ErrorBoundary` global, ESLint (flat config) + Prettier + madge (pas d'import circulaire) en CI, tag `v0.1.0`, nettoyage du dépôt (fichiers de travail dé-suivis, doublon `public/public` supprimé).
