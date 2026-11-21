# docs/ — table de routage

Lis `AGENTS.md` (racine) d'abord, puis UNIQUEMENT les 1-3 fichiers de `docs/` utiles à ta tâche.
Un thème = un fichier, en français, zéro emoji, en citant le code réel (`chemin`).
Chiffres du corpus : toujours `npm run count:questions`, jamais un nombre en dur.

| Thème | Fichier | Quand le lire | Contenu (chemins clés) |
|---|---|---|---|
| Stack & archi | `docs/stack.md` | toucher à la structure src/ | arborescence réelle, règles R1-R10, alias `@*` |
| Règles du jeu | `docs/jeu.md` | modifier scoring/modes/tirage | `lib/scoring.js`, `lib/draw.js`, `features/game/` |
| Design | `docs/design.md` | toucher au CSS/UI | palette 60-30-10 sobre (`styles/tokens.css`), 14 couleurs de thèmes, a11y |
| Questions | `docs/questions.md` | ajouter/modifier des questions | format JSON (clés FR), chunks lazy + `loadThemes()`, similarité, admin, `npm run count:questions` |
| Comptes | `docs/comptes.md` | connexion, invité, modération | `lib/accounts.js`, hash SHA-256 salé, reset URL |
| Progression | `docs/progression.md` | XP/badges/titres/classement/stats | `lib/xp.js`, 30 badges, 50 titres, historique 500 parties |
| Sons & partage | `docs/sons-partage.md` | audio, vibrations, partage | `lib/sounds.js`, `lib/share.js`, `results/useShare.js` |
| Sécurité | `docs/securite.md` | worker.js, données externes | CSP report-only, V2_ENABLED, CORS, 64 Ko, 429, hash timing-safe, WebSocket 101 |
| Stockage D1 | `docs/stockage-d1.md` | persistance, V2 serveur | `lib/storage.js` (STORAGE_KEYS), `lib/repositories.js`, `lib/api.js`, migrations, `/api/*`, décision mobile |
| Déploiement | `docs/deploiement.md` | publier | 4 environnements (dev 5173 / preview 4173 / deploy:preview / deploy), déploiement auto Cloudflare depuis `main` (Workers Builds, sans GitHub Action) |
| Tests | `docs/tests.md` | ajouter un test | arborescence tests/, commandes par feature, couverture à seuils (ratchet) |
| Méthodologie | `docs/methodologie.md` | git, review, subagents | branches + worktrees, review code+docs, décisions techniques documentées |
| Mobile | `docs/mobile.md` | roadmap appli | Capacitor, PWA -> Android/iOS, stockage natif |
| Écran accueil | `docs/features/accueil.md` | modifier l'accueil | `features/home/` : modes, thèmes, modale niveau, CTA fixe |
| Écran partie | `docs/features/game.md` | modifier le jeu | `features/game/` : useGame, useTimer, draw, sous-composants |
| Écran résultats | `docs/features/results.md` | modifier les résultats | `features/results/` : persist (depuis App.terminer), partage |
| Admin | `docs/features/admin.md` | `?admin=1` | signalements, soumissions, suggestions, exclusions, compteur |

Guides à la racine : `README.md` seul (guide client pas à pas). Cette doc + `docs/veille-quizup.md`
(veille QuizUp, archivée) sont dans `docs/`.
