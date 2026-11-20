# docs/ — table de routage

Lis `AGENTS.md` (racine) d'abord, puis UNIQUEMENT les fichiers utiles à ta tâche.
Un thème = un fichier, en français, zéro emoji, en citant le code réel (`fichier:ligne`).

| Thème | Fichier | Quand le lire | Contenu |
|---|---|---|---|
| Stack & archi | `docs/stack.md` | toucher à la structure src/ | arborescence réelle, règles R1-R10, alias |
| Règles du jeu | `docs/jeu.md` | modifier scoring/modes/tirage | 10 s, 20-1/s min 10, manches, streak, records |
| Design | `docs/design.md` | toucher au CSS/UI | palette 60-30-10 sobre, 12 couleurs de thèmes, a11y |
| Questions | `docs/questions.md` | ajouter/modifier des questions | format JSON, lazy chunks, similarité, admin, compteur |
| Comptes | `docs/comptes.md` | connexion, invité, modération | localStorage, hash SHA-256 salé, reset URL |
| Progression | `docs/progression.md` | XP/badges/titres/classement/stats | courbes, 30 badges, 50 titres, historique 500 parties |
| Sons & partage | `docs/sons-partage.md` | audio, vibrations, partage | Web Audio, son par streak, image story canvas |
| Sécurité | `docs/securite.md` | worker.js, données externes | headers, CSP report-only, zod, rate limit, XSS |
| Stockage D1 | `docs/stockage-d1.md` | persistance, V2 serveur | CLES, storage.js, api.js, migrations, routes /api/* |
| Déploiement | `docs/deploiement.md` | publier, CI | wrangler, CI GitHub, secrets, dry-run |
| Tests | `docs/tests.md` | ajouter un test | arborescence tests/, commandes par feature, mocks |
| Méthodologie | `docs/methodologie.md` | git, review, subagents | branches feature/, checklist merge, travail en parallèle |
| Mobile | `docs/mobile.md` | roadmap appli | Capacitor, WPA -> Android/iOS |
| Écran accueil | `docs/features/accueil.md` | modifier l'accueil | modes, thèmes, modale niveau, CTA fixe |
| Écran partie | `docs/features/partie.md` | modifier le jeu | usePartie, useMinuteur, tirage, sous-composants |
| Écran résultats | `docs/features/resultat.md` | modifier les résultats | persistance (depuis App.terminer), partage |
| Admin | `docs/features/admin.md` | ?admin=1 | signalements, soumissions, suggestions, exclusions |

Études et guides longs à la racine : `README.md` (guide client), `COMPARAISON-QUIZUP.md`
(veille), `PALETTES.md` (palette « vivante » archivée -> voir `docs/design.md`).
