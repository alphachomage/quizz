# Règles du jeu

Toutes les constantes/vivantes dans `src/lib/scoring.js`, `src/lib/tirage.js`,
`src/features/partie/`. Ne jamais contredire ce fichier sans mettre le code à jour.

## Modes (4 onglets à l'accueil)

- **Solo** : niveau (Facile/Moyen/Difficile) choisi dans la modale du thème, puis 10
  questions tirées dans le niveau du thème (`QUESTIONS_SOLO = 10`).
- **Duel 1v1** : 2 joueurs sur le même appareil, 6 questions chacun (`QUESTIONS_DUEL = 6`),
  mêmes questions, écran « passe l'appareil » entre chaque tour (les joueurs alternent).
- **Survie** : tous thèmes + tous niveaux mélangés, 1 vie, plafond 30 questions
  (`QUESTIONS_SURVIE_MAX = 30`) ; la première faute (ou le temps écoulé) termine la partie.
- **Quizz du jour** : 10 questions parmi tous les thèmes/niveaux, tirage seedé par la date
  (`questionsQuotidien` dans `src/lib/tirage.js`) -> identiques pour tout le monde le même jour.

## Minuteur, score, manches

- `TEMPS_PAR_QUESTION = 10` s. Le minuteur fait 1 setState/seconde (`useMinuteur.js`),
  la barre est lissée en CSS (`transition: width 1s linear`).
- Bonne réponse : `pointsPour` = `max(10, 20 - floor(secondes))`, **0 si faux/temps écoulé**.
- 3 manches (`infoManche`) : la 3e est **bonus x2**. Max solo sans streak : 240 pts.
- **Bonus de série (streak)** : +0 à la 1re bonne, puis +1, +2... plafonné à +10
  (bonus = n° de série - 1, ajouté APRÈS le x2 de manche).
- Quizz du jour : points x1,5 si la série de jours >= 3 (`streakJourActuelle`).
- Enchaînement automatique 2 s après chaque réponse (en duel, clic « Je suis prêt »).

## Tirage diversifié + anti-répétition

- `tirerSerie(pool, nb, maxParSujet=2, maxParTheme, rand)` : max 2 questions du même
  « sujet » (nom propre détecté par `sujetDe`, ex. « One Piece »), et en multi-thèmes
  (survie) un plafond par thème. Ordre des réponses mélangé aussi (`avecReponsesAleatoires`).
- Anti-répétition : la dernière série jouée est mémorisée (`src/lib/series.js`) ->
  « Rejouer » tire hors de la série précédente.
- Records : clé `<mode>:<niveau|mix>:<themeId>` (`cleRecord` dans `src/lib/records.js`).

## Persistance d'une partie

À la fin, `App.terminer` appelle `persisterResultat` (`src/features/resultat/persistance.js`)
UNE FOIS : record, historique (`ajouterPartie`, 500 dernières max), XP par thème + globale,
rang au classement, streak du jour. Le composant `Resultat` ne fait que lire `res.persistance`.
Mode invité : rien de tout ça n'est enregistré (sauf le record local).
