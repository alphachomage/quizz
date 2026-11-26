# Règles du jeu

Toutes les constantes vivent dans `src/lib/scoring.ts`, `src/lib/draw.ts`,
`src/features/game/`. Ne jamais contredire ce fichier sans mettre le code à jour.

## Modes (4 onglets à l'accueil)

- **Solo** : niveau (Facile/Moyen/Dur) choisi dans la modale du thème, puis 10
  questions tirées dans le niveau du thème (`SOLO_QUESTIONS = 10`).
- **Duel 1v1** : 2 joueurs sur le même appareil, 6 questions chacun (`DUEL_QUESTIONS = 6`),
  mêmes questions, écran « passe l'appareil » (`PassDevice`) entre chaque tour.
- **Rogue Quizz** : voir la section dédiée ci-dessous (remplace l'ancien mode Survie).
- **Quizz du jour** : 10 questions parmi tous les thèmes/niveaux (`DAILY_QUESTIONS`),
  tirage seedé par la date (`dailyQuestions` dans `src/lib/draw.ts`) -> identiques
  pour tout le monde le même jour.

## Rogue Quizz (remplace l'ancien mode Survie)

Constantes dans `src/lib/scoring.ts` (`ROGUE_MAX`, `ROGUE_VIES_DEPART`, `ROGUE_STEP`,
`RELIC_CHOICE_SECONDS`), reliques dans `src/lib/relics.ts`, tirage dans
`src/features/game/draw.ts` (`drawRogueSeries`), état de run dans `useGame.ts`.

- **Run** : tous thèmes mélangés, `ROGUE_MAX = 100` questions maximum, **3 vies** au départ
  (`ROGUE_VIES_DEPART`). Une erreur (ou le temps écoulé) coûte une vie ; à 0 vie la run
  s'arrête (certaines reliques modifient ces règles : vies max, bouclier, etc.).
- **Paliers** : un palier = `ROGUE_STEP = 10` questions, soit 10 paliers pour 100 questions.
  La difficulté monte par palier (poids facile/moyen/dur dans `ROGUE_PALIER_POIDS`) :
  palier 1 tout facile, palier 5 tout moyen, paliers 9 et 10 tout dur, avec des paliers
  mixtes entre les deux. Max 2 questions du même sujet, plafond par thème sur la run.
- **Reliques** : 60 reliques (30 communes, 23 rares, 7 légendaires, effets cumulables
  selon la relique, certaines ont un malus, synergies et conflits). **1 relique parmi 3** est
  proposée au départ, puis à chaque palier terminé.
- **Timer du choix** : `RELIC_CHOICE_SECONDS = 20` s ; à 0, une relique est choisie
  automatiquement. Refuser le choix n'est possible qu'avec la relique Ascète (+150 pts).
- **Pondération et verrouillage des raretés** : les poids de tirage évoluent avec la
  progression (surtout du commun au début, plus de rare/légendaire vers la fin,
  `poidsRarete`). Verrouillage par niveau : pas de légendaire avant la question 31
  (`NIVEAU_MIN_LEGENDAIRE`) ; le seuil épique (`NIVEAU_MIN_EPIQUE = 21`) est prévu mais
  aucune relique épique n'existe pour l'instant.
- **Temps** : 10 s par question, **+3 s pour les questions « dur »** (`DUR_BONUS_DUR`,
  `dureePourNiveau`) ; ce bonus vaut pour TOUS les modes, pas seulement Rogue.
- **Tutoriel** : affiché une seule fois (popin `ModeConfirmModal`), ensuite la tuile
  lance directement la run. Le tutoriel général est dans `src/features/tutorial/`.

## Minuteur, score, manches

- `SECONDS_PER_QUESTION = 10` s. Le minuteur fait 1 setState/seconde (`useTimer.ts`),
  la barre est lissée en CSS (`transition: width 1s linear`).
- Bonne réponse : `pointsFor` = `max(10, 20 - floor(secondes))`, **0 si faux/temps
  écoulé**. Max solo sans streak : 240 pts (8x20 + 2x40).
- 3 manches (`roundInfo`) : la 3e est **bonus x2**.
- **Bonus de série (streak)** : +0 à la 1re bonne, puis +1, +2... plafonné à +10
  (bonus = n° de série - 1, ajouté APRÈS le x2 de manche).
- Quizz du jour : points x1,5 si la série de jours >= 3 (`currentDailyStreak` dans
  `src/lib/streak.ts`).
- Enchaînement automatique 2 s après chaque réponse (en duel, clic « Je suis prêt »).

## Tirage diversifié + anti-répétition

- `drawSeries(pool, nb, maxParSujet=2, maxParTheme, rand)` dans `src/lib/draw.ts` :
  max 2 questions du même « sujet » (nom propre détecté par `subjectOf`, ex. « One
  Piece »), et en multi-thèmes (Rogue Quizz) un plafond par thème. Construction de la
  partie : `drawGameQuestions(config)` dans `src/features/game/draw.ts`, ordre des
  réponses mélangé par `withShuffledAnswers`, thème tagué par `tagTheme`.
- Anti-répétition : la dernière série jouée est mémorisée (`src/lib/series.ts`,
  `poolWithoutPreviousSeries`) -> « Rejouer » tire hors de la série précédente.
- Records : clé `<mode>:<niveau|mix>:<themeId>` (`recordKey` dans `src/lib/records.ts`).

## Persistance d'une partie

À la fin, `App.terminer` (dans `src/app/App.tsx`) appelle `persistResult`
(`src/features/results/persist.ts`) UNE FOIS : record, historique (`addGame`,
500 dernières max dans `src/lib/game-history.ts`), XP par thème + globale,
rang au classement, streak du jour. Le composant `Results` ne fait que lire
`res.persistance`.
Mode invité : rien de tout ça n'est enregistré (sauf le record local).
