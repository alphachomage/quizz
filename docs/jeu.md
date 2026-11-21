# Règles du jeu

Toutes les constantes vivent dans `src/lib/scoring.js`, `src/lib/draw.js`,
`src/features/game/`. Ne jamais contredire ce fichier sans mettre le code à jour.

## Modes (4 onglets à l'accueil)

- **Solo** : niveau (Facile/Moyen/Dur) choisi dans la modale du thème, puis 10
  questions tirées dans le niveau du thème (`SOLO_QUESTIONS = 10`).
- **Duel 1v1** : 2 joueurs sur le même appareil, 6 questions chacun (`DUEL_QUESTIONS = 6`),
  mêmes questions, écran « passe l'appareil » (`PassDevice`) entre chaque tour.
- **Survie** : tous thèmes + tous niveaux mélangés, 1 vie, plafond 30 questions
  (`SURVIVAL_MAX = 30`) ; la première faute (ou le temps écoulé) termine la partie.
- **Quizz du jour** : 10 questions parmi tous les thèmes/niveaux (`DAILY_QUESTIONS`),
  tirage seedé par la date (`dailyQuestions` dans `src/lib/draw.js`) -> identiques
  pour tout le monde le même jour.

## Minuteur, score, manches

- `SECONDS_PER_QUESTION = 10` s. Le minuteur fait 1 setState/seconde (`useTimer.js`),
  la barre est lissée en CSS (`transition: width 1s linear`).
- Bonne réponse : `pointsFor` = `max(10, 20 - floor(secondes))`, **0 si faux/temps
  écoulé**. Max solo sans streak : 240 pts (8x20 + 2x40).
- 3 manches (`roundInfo`) : la 3e est **bonus x2**.
- **Bonus de série (streak)** : +0 à la 1re bonne, puis +1, +2... plafonné à +10
  (bonus = n° de série - 1, ajouté APRÈS le x2 de manche).
- Quizz du jour : points x1,5 si la série de jours >= 3 (`currentDailyStreak` dans
  `src/lib/streak.js`).
- Enchaînement automatique 2 s après chaque réponse (en duel, clic « Je suis prêt »).

## Tirage diversifié + anti-répétition

- `drawSeries(pool, nb, maxParSujet=2, maxParTheme, rand)` dans `src/lib/draw.js` :
  max 2 questions du même « sujet » (nom propre détecté par `subjectOf`, ex. « One
  Piece »), et en multi-thèmes (survie) un plafond par thème. Construction de la
  partie : `drawGameQuestions(config)` dans `src/features/game/draw.js`, ordre des
  réponses mélangé par `withShuffledAnswers`, thème tagué par `tagTheme`.
- Anti-répétition : la dernière série jouée est mémorisée (`src/lib/series.js`,
  `poolWithoutPreviousSeries`) -> « Rejouer » tire hors de la série précédente.
- Records : clé `<mode>:<niveau|mix>:<themeId>` (`recordKey` dans `src/lib/records.js`).

## Persistance d'une partie

À la fin, `App.terminer` (dans `src/app/App.jsx`) appelle `persistResult`
(`src/features/results/persist.js`) UNE FOIS : record, historique (`addGame`,
500 dernières max dans `src/lib/game-history.js`), XP par thème + globale,
rang au classement, streak du jour. Le composant `Results` ne fait que lire
`res.persistance`.
Mode invité : rien de tout ça n'est enregistré (sauf le record local).
