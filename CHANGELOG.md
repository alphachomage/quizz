# CHANGELOG — VoltQuiz

Toutes les évolutions notables du projet sont documentées ici, de la plus récente à la plus ancienne.
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnage sémantique.

## Non publié

### Ajouté
- **Modération renforcée des pseudos (transphobie, anti-LGBTQ+) + vérification serveur** : la blocklist `src/lib/moderation.ts` couvre désormais aussi la transphobie (`tranny`, `shemale`, `travelo`, `transphobe`…) et l'anti-LGBTQ+ (`groomer`, `agendalgbt`, `ideologiedegenre`, `lesbophobe`, `biphobie`…), avec un flag `exact: true` pour forcer l'égalité exacte sur les termes à risque de faux positifs (`trav` ne bloque pas « travail »). La modération est désormais vérifiée **côté serveur** dans `worker-api.ts` (route `/api/auth/inscription` → 400 si terme bloqué), pour bloquer aussi les appels directs à l'API qui contournent le client. Tests : 5 nouveaux tests serveur (`tests/unit/worker/api-auth-moderation.test.ts`) + 3 nouveaux tests unitaires dans `accounts.test.ts`.
- **Bouton croix « quitter la partie » dans la TopBar** : en cours de quizz (solo, duel, survie, quotidien), une croix à droite de la barre haute permet de revenir au menu principal. Les résultats partiels sont **enregistrés** (record, historique, XP sur les questions déjà répondues) via `persistResult`, puis retour direct à l'accueil sans passer par l'écran de résultats. Implémentation : `onQuit` dans `useGame`/`Game`/`Screens`/`App` (`quitter()` persiste puis `navigateTo('accueil')`), fonction `abandonner()` dans `useGame.ts` (total = questions effectivement répondues), bouton dans `TopBar.tsx` (icône `x`), style `.bouton-quitter` dans `partie.css`. Tests : `tests/integration/game-quit.test.tsx` (2 tests : abandon après 3 bonnes réponses avec score partiel, abandon dès la 1re question). Tests existants mis à jour avec `onQuit` mocké.
- **Guide pas à pas pour ajouter des questions/thèmes** : `docs/ajouter-questions.md` (référencé dans `docs/INDEX.md` et `docs/questions.md`) — nouveau fichier `questions-*.js` uniquement (règle 7), format JSON, couleurs et icônes autorisées (listées), commandes de vérification (`count:questions`, `test:data`, lint/typecheck/test), checklist avant commit, et ce qui est automatique (manifest + `CORPUS_VERSION` → invalidation IndexedDB, chunk lazy + précache PWA).
- **Corpus de questions indexé dans IndexedDB** : au premier lancement (ou après un changement de version du corpus), les 263 chunks `questions-*.js` sont chargés une fois et indexés dans IndexedDB (`src/lib/question-db.ts`, base `voltquiz-questions`, index `by_theme` / `by_theme_niveau`) ; aux démarrages suivants, `loadThemes()` lit depuis IndexedDB (beaucoup plus rapide que 263 requêtes de chunks). Version du corpus = hash des fichiers généré par `scripts/gen-manifest.mjs` (`CORPUS_VERSION` dans `theme-manifest.js`) : tout changement d'un fichier `questions-*.js` invalide le cache. Repli gracieux sur les chunks si IndexedDB est indisponible (navigation privée). Tests : `tests/unit/lib/question-db.test.ts` (stub IDB en mémoire) + `tests/unit/lib/questions-load.test.ts` (logique IDB vs chunks).
- **Overrides admin** (modifier/supprimer une question du corpus sans toucher aux fichiers source, règle 7) : nouvelle clé `voltquiz_overrides` + `src/lib/overrides.ts` (`setOverride`/`removeOverride`/`applyOverrides`, indexé par texte normalisé), appliqué dans `loadThemes()` après les exclusions. Bouton « Modifier » dans la vue admin (`ReportedSection` + nouveau `EditQuestionForm.tsx`) : pose un override `{ action: 'modifier', question }` effectif au rechargement. Synchronisé cross-device via `sync_client` en mode `d1`. Tests : `tests/unit/lib/overrides.test.ts` (6 tests).
- **Stats de qualité par question + filtre auto du tirage** : chaque partie enregistrée cumule `{ total, correct }` par question (clé `voltquiz_stats_questions`, `src/lib/question-stats.ts`, texte normalisé) ; au tirage, `filterByQuality()` exclut les questions suspectes (taux < 5 % ou > 98 % en dur, après 20 évaluations min) si le pool reste assez grand. `q` ajouté à `GameDetail` et renseigné dans `useGame`. Tests : `tests/unit/lib/question-stats.test.ts` (8 tests).
- **Corpus communautaire cross-device (D1)** : nouvelles routes serveur `GET /api/questions?themeId=&page=&limit=` (session requise, soumissions `etat='validee'` paginées, `reponses` parsé, lignes illisibles ignorées) et `POST /api/soumissions/valider|refuser` (admin requis, UPDATE `etat`). Côté client : `src/lib/community.ts` (`loadCommunityQuestions`, validation zod `submissionSchema` des données reçues, dédup par texte normalisé), fusionné au catalogue dans `ThemesContext` (avec dédup local/serveur). `approveSubmission` pousse aussi la validation côté serveur (best-effort) ; nouveau `refuseSubmission` (etat `refusee`) branché sur le bouton « Refuser » de la vue admin. `removeQuestion`/`removeSubmission` retirés (code mort). Tests : `tests/unit/worker/api-questions-communautaires.test.ts` (8 tests) + `tests/unit/lib/community.test.ts` (4 tests).
- **Corpus servi en un seul fichier JSON compact** : `scripts/gen-corpus-json.mjs` génère `public/corpus.json` (tout le corpus fusionné, ~2,4 Mo minifié, `version` = même hash que le manifest) au build/dev (`prebuild`/`predev`) ; `loadThemes()` fetch `/corpus.json` d'abord (1 requête, précaché par la PWA car dans `public/`, servi compressé Brotli par Cloudflare), fallback sur les 263 chunks `import.meta.glob` si indisponible ou version différente. 3 nouveaux tests dans `questions-load.test.ts`.

### Corrigé
- **Usurpation d'identité dans les rooms de duel** (`/api/duel/:room`) : le pseudo venait de la query string `?pseudo=` — n'importe quel client pouvait se faire passer pour un autre joueur. Désormais le pseudo est forcé = celui du token Bearer (vérifié avant l'upgrade 101), posé en header `x-voltquiz-pseudo` sur la requête forwardée au Durable Object ; `DuelRoom` ignore la query string et attribue les messages WebSocket au pseudo de la connexion. Test : `tests/unit/worker/api-duel-pseudo.test.ts` (3 tests, dont tentative d'usurpation via `?pseudo=Victime`).
- **CSP appliquée en prod** : `CSP_REPORT_ONLY = "false"` dans `wrangler.toml [vars]` (preview reste en `"true"` pour observation). `worker.ts` pose en prod les deux headers : `Content-Security-Policy` (appliquée) + `Content-Security-Policy-Report-Only` avec `report-uri /api/csp-report` (les violations continuent de remonter pour surveillance).
- **API authentifiée par token Bearer** (audit sécurité : avant, n'importe qui pouvait lire/écrire/supprimer n'importe quelle clé `/api/kv/*`, poster des parties/records/XP pour n'importe quel pseudo, et énumérer les pseudos par oracle de timing) :
  - migration `0004_sessions.sql` (table `sessions`, TTL 30 j, 1 session par compte, révoquée à la reconnexion) ; `/api/auth/*` renvoie désormais un `token` ;
  - toutes les routes de données exigent `Authorization: Bearer <token>` (401 sinon, 503 sans DB) ; `/api/kv/<cle>` est **namespacé `<pseudo>:<cle>`** en `sync_client` ; `parties`/`records`/`xp`/`soumissions` prennent le **pseudo du token** (jamais celui du body) ;
  - `/api/admin/check` et `GET /api/soumissions` exigent `admin = 1` ; le pseudo vient du token (plus de paramètre `?pseudo=`, plus d'énumération) ;
  - anti-énumération : PBKDF2 factice si le compte n'existe pas au login ; mot de passe > 72 caractères -> 400 ; rate-limit renforcé **5 req/min/IP sur `/api/auth/*`** (30/min ailleurs) ;
  - WebSocket `/api/duel/:room?token=` : token vérifié avant l'upgrade 101 ;
  - client : header Bearer automatique (`api.ts` + fournisseur enregistré par `storage.ts`, zéro cycle), token persisté en clé locale `voltquiz_token_local` (hors `STORAGE_KEYS`, jamais synchronisé), écrit/supprimé par `accounts.ts`.
- **Base D1 branchée de bout en bout côté client** (audit : seule la table générique était alimentée) : en mode `d1` (défaut), les données métier partent désormais aussi dans leurs tables dédiées, en best-effort (un échec réseau ne bloque jamais le jeu) — comptes via `/api/auth/*` (PBKDF2 serveur, `src/lib/accounts.ts`, cache local sans secret), parties via `POST /api/parties` (`src/lib/game-history.ts`, avec colonne `pseudo`), records via `/api/records` (`src/lib/records.ts`), XP via `/api/xp` (`src/lib/xp.ts`), soumissions via la **nouvelle route** `POST/GET /api/soumissions` (`src/lib/submissions.ts`, modération admin cross-device).
- **Table `kv` renommée `sync_client`** (migration `0002_sync_client.sql`) : nom limpide pour le miroir serveur des 17 clés localStorage (blob `cle/valeur` volontaire) ; les données métier structurées ont leurs tables relationnelles dédiées. Voir `docs/stockage-d1.md`.
- **Index corrigés** (migration `0002`) : `parties.pseudo` = nouvelle colonne texte indexée (l'ancien index sur la colonne JSON `joueurs` était inutilisable avec `LIKE '%…%'`) + `GET /api/parties?pseudo=` filtre dessus ; index `soumissions(etat)` et `soumissions(theme_id)`. Migration `0003` : colonne `comptes.admin`.
- **Admin sécurisé** : `?admin=1` ne suffit plus — session compte (pas invité) requise + **flag `admin = 1` sur le compte en table D1 `comptes`** (migration `0003_admin_flag.sql`, promu par `UPDATE` SQL — aucun secret dans `wrangler.toml`), vérifié côté serveur via la nouvelle route `GET /api/admin/check` (`src/app/useAdminAccess.ts` + `App.tsx`). En `?stockage=local` (hors-ligne), l'admin est indisponible.

### Supprimé
- **`V2_ENABLED`** (porte kill-switch) : la base D1 est le stockage par défaut, plus de flag. Chaque route renvoie 503 « binding manquant » si D1/KV/DO n'est pas configuré ; les routes de santé répondent toujours. `wrangler.toml`, `worker-api.ts`, `apiHealth/apiStats` (champ `v2` retiré), `useServerStats`/`ServerCard` (statut `v2-inactive` retiré, carte « Serveur (API) »).

### Modifié
- **Questions côté client, c'est volontaire et documenté** (`docs/stockage-d1.md`) : le corpus est du contenu statique versionné avec l'app (chunks lazy servis par le worker, cacheables, zéro requête D1 par question) ; seules les soumissions des joueurs migrent serveur (table `soumissions`).
- Docs mises à jour : `docs/stockage-d1.md` (réécrit), `docs/securite.md`, `docs/features/admin.md`, `docs/comptes.md`, `docs/deploiement.md`, `docs/methodologie.md`, `docs/INDEX.md`, `AGENTS.md`.
- Tests : `tests/unit/worker/api-kv.test.ts` (sans V2, table `sync_client`), nouveau `tests/unit/worker/api-admin-soumissions.test.ts` (admin check, soumissions, filtre pseudo de `/api/parties`), `tests/unit/lib/accounts.test.ts` (modes d1 serveur mocké + local), `tests/integration/app-shell.test.tsx` (admin autorisé avec session compte, refusé en invité).

### Corrigé
- **`/api/records` et `GET /api/xp/<pseudo>/<theme>` : namespacing par compte manquant** (même faille que `/api/kv` avant le token Bearer : en prod sur `main`, toutes les clés étaient globales, donc tous les joueurs partageaient la même XP/avancée) : `records` utilisait la clé nue (`ON CONFLICT(cle)`, GET sans filtre pseudo) -> records globaux, dernier écrivain gagne ; `GET /api/xp/<pseudo>/<theme>` lisait le pseudo dans l'URL -> lecture cross-joueurs. Désormais `records.cle = <pseudo_normalise>:<cle>` au POST et au GET, et `routeXp` force le pseudo du token (le segment d'URL est conservé pour compatibilité client mais ignoré). Tests : `tests/unit/worker/api-records-xp.test.ts` (6 tests : 401 sans token, clé namespacée, pseudo du body ignoré, espaces séparés Alice/Bob, GET xp du token malgré l'URL).
- **tsconfig : `baseUrl` supprimé** (déprécié dans TypeScript 6.0, cassant dans 7.0) : les alias `paths` (`@app/*`, `@lib/*`, …) sont désormais relatifs au `tsconfig.json` (`"./src/…"`), résolus nativement depuis TS 5.0 avec `moduleResolution: "bundler"`. Aucun `ignoreDeprecations` ajouté (ce n'aurait fait que repousser l'erreur). `typecheck`, `lint`, tests et `build` toujours verts.
- **Synchro D1 : aucune perte silencieuse des écritures serveur** (le mode `d1` écrivait bien en D1 via `/api/kv/*`, mais un POST refusé — hors-ligne, 429, 5xx, ou body > 64 Ko — était ignoré silencieusement, et `preloadFromServer()` écrasait ensuite le local par l'état serveur au démarrage : la progression « restait en localStorage »). Ajout d'une **file d'attente** (`voltquiz_pending_writes`, clé localStorage locale) : toute écriture refusée y est stockée et retentée par `flushPendingWrites()` au démarrage, après chaque write et sur `online` ; `preloadFromServer()` ne touche jamais une clé en attente. `remove()` pousse désormais un `DELETE /api/kv/<cle>` (pending `null` si échec). Tests : `tests/unit/lib/storage-d1.test.ts` (7 tests) + `tests/unit/worker/api-kv.test.ts` (6 tests).
- **`/api/kv` : plafond de body 64 Ko -> 1 Mo** (`worker-api.ts`) : `voltquiz_parties` (historique 500 parties avec détail) dépassait 64 Ko, donc son POST renvoyait 400 et n'était jamais persisté côté serveur. Le plafond général 64 Ko reste pour les autres routes. `DELETE` ajouté à `Access-Control-Allow-Methods`.
- **Service worker périmé** (« l'appli ne marche qu'après avoir vidé le cache ») : un vieux SW servait indéfiniment son ancien precache (bundle cassant). `registerSW` resserre le check de mise à jour à **5 min** (`onRegisteredSW` + `r.update()`, au lieu d'environ 1 h avec autoUpdate) dans `src/main.tsx`.
- **Inscription/connexion en HTTP 500 en prod** (`error code: 1101`) : `crypto.subtle.deriveBits` PBKDF2 refuse plus de **100 000 itérations** dans le runtime Workers (`NotSupportedError: iteration counts above 100000 are not supported`) ; `PBKDF2_ITERATIONS` passe de 210 000 à **100 000**, le plafond dur de la plateforme (`worker-api.ts`). Aucun compte n'avait pu être créé jusque-là (le hash plantait à chaque tentative), donc aucun hash existant à re-calculer. Docs mises à jour (`docs/securite.md`, `docs/comptes.md`, `docs/stockage-d1.md`).

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
