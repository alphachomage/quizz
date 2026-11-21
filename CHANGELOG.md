# CHANGELOG — VoltQuiz

Toutes les évolutions notables du projet sont documentées ici, de la plus récente à la plus ancienne.
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnage sémantique.

## Non publié

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
