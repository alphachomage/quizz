# docs/ — table de routage

Lis `AGENTS.md` (racine) d'abord, puis UNIQUEMENT les 1-3 fichiers de `docs/` utiles à ta tâche.
Un thème = un fichier, en français, zéro emoji, en citant le code réel (`chemin`).
Chiffres du corpus : toujours `npm run count:questions`, jamais un nombre en dur.

| Thème | Fichier | Quand le lire | Contenu (chemins clés) |
|---|---|---|---|
| Stack & archi | `docs/stack.md` | toucher à la structure src/ | arborescence réelle, règles R1-R10, alias `@*` |
| Règles du jeu | `docs/jeu.md` | modifier scoring/modes/tirage | `lib/scoring.ts`, `lib/draw.ts`, `features/game/` |
| Design | `docs/design.md` | toucher au CSS/UI | palette 60-30-10 sobre (`styles/tokens.css`), 14 couleurs de thèmes, a11y |
| Questions | `docs/questions.md` | ajouter/modifier des questions | format JSON (clés FR), IndexedDB + chunks lazy, similarité, admin, `npm run count:questions` |
| Ajouter questions/thèmes | `docs/ajouter-questions.md` | enrichir le corpus | guide pas à pas : nouveau fichier `questions-*.js` uniquement, format, couleurs/icônes autorisées, commandes de vérif, checklist |
| Comptes | `docs/comptes.md` | connexion, invité, modération | `lib/accounts.ts`, hash SHA-256 salé, reset URL |
| Progression | `docs/progression.md` | XP/badges/titres/classement/stats | `lib/xp.ts`, 30 badges, 50 titres, historique 500 parties |
| Sons & partage | `docs/sons-partage.md` | audio, vibrations, partage | `lib/sounds.ts`, `lib/share.ts`, `results/useShare.ts` |
| Sécurité | `docs/securite.md` | worker.ts, données externes | CSP report-only, CORS, 64 Ko, 429, hash timing-safe, gate admin (`comptes.admin`), WebSocket 101 |
| Stockage D1 | `docs/stockage-d1.md` | persistance, base serveur par défaut | `lib/storage.ts` (STORAGE_KEYS + mode d1), `lib/repositories.ts`, `lib/api.ts`, tables (sync_client, comptes, parties, records, xp, soumissions), migrations, `/api/*`, décision mobile |
| Déploiement | `docs/deploiement.md` | publier | 4 environnements (dev 5173 / preview 4173 / deploy:preview / deploy), déploiement auto Cloudflare depuis `main` (Workers Builds, sans GitHub Action) |
| Tests | `docs/tests.md` | ajouter un test | arborescence tests/, commandes par feature, couverture à seuils (ratchet) |
| Méthodologie | `docs/methodologie.md` | git, review, subagents | branches + worktrees, brief type des sous-agents, format des commits, checklist de merge, leçons de l'audit (`scripts/check-repo.mjs`) |
| Mobile | `docs/mobile.md` | roadmap appli | Capacitor, PWA -> Android/iOS, stockage natif |
| Écran accueil | `docs/features/accueil.md` | modifier l'accueil | `features/home/` : modes, thèmes, modale niveau, CTA fixe |
| Écran partie | `docs/features/game.md` | modifier le jeu | `features/game/` : useGame, useTimer, draw, sous-composants |
| Écran résultats | `docs/features/results.md` | modifier les résultats | `features/results/` : persist (depuis App.terminer), partage |
| Admin | `docs/features/admin.md` | `?admin=1` + `comptes.admin=1` | gate serveur (`/api/admin/check`), signalements, soumissions, suggestions, exclusions, compteur |

Guides à la racine : `README.md` seul (guide client pas à pas). Cette doc + `docs/veille-quizup.md`
(veille QuizUp, archivée) sont dans `docs/`.
