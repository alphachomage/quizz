# Feature partie (game)

`src/features/game/` :

- `Game.tsx` (~88 L, render seul) + `components/` : TopBar, TimerLine, Answers,
  Feedback, PassDevice, Confetti, ReportButton.
- `useGame.ts` : noyau de la partie commun à tous les modes (états, `answer`/`suivant`/`pret`/
  `finir`/`abandonner`/`reportQuestion`, effets musique/tick/auto-advance, guard pool vide).
- `useRogue.ts` : tout ce qui est propre au Rogue Quizz (reliques et choix avec timer, vies,
  paliers, effets par question, Pari/Gel/Pioche/Retour en arrière). Branché sur le noyau via des
  refs et setters passés en paramètres ; fournit aussi `questions`/`question`/`dureeQuestion`.
- `gameTypes.ts` : types partagés (`GameState`, `GameViewState`, `GamePhase`, `ConfettiPiece`...),
  réexportés par `useGame.ts`. `useLatest.ts` : ref « dernière valeur » (évite les closures
  périmées sans désactiver `exhaustive-deps`).
- `src/lib/rogueRun.ts` (pur, testé dans `tests/unit/lib/rogueRun.test.ts`) : `PalierRogue`,
  `palierInitial`, durée du timer, masquage 50/50 / Domino, Miroir, Vote du public, carry de
  temps, pertes de vie, effets immédiats des reliques.
- `useTimer.ts` : 1 setState/s, `onExpire` à 0.
- `draw.ts` (pur) : `drawGameQuestions(config)` + `withShuffledAnswers` + `tagTheme`.
- `constants.ts` : palettes de réponses (`ANSWER_COLORS`, Okabe-Ito `COLORBLIND_COLORS`)
  et confettis (`CONFETTI_COLORS`).

## Bouton quitter (abandon)

Une croix (`Icon nom="x"`) à droite de la `TopBar` permet de quitter en cours de
partie. `useGame.abandonner()` construit le `GameResult` partiel (`total` = index,
c.-à-d. questions effectivement répondues) et appelle `onQuit` ; `App.quitter()`
persiste via `persistResult` (record, historique, XP) puis `nav.navigateTo('accueil')`
sans passer par l'écran de résultats.

Règles du jeu : voir `docs/jeu.md`. Tests : `tests/integration/game-*.test.tsx` +
`tests/unit/features/game-draw.test.ts`.

## Mise en page (2026-11-23)

L'écran de partie tient sur un seul écran sans défilement (`src/styles/partie-compacte.css`) :
en-tête `TopBar` sur deux niveaux (`.barre-haut-theme` puis `.barre-haut-infos`), question en
`clamp(... dvh ...)`, classes `.question.longue` (> 110 car., `LONG_QUESTION` dans `Game.tsx`) et
`.reponse.longue` (> 45 car., `LONG_ANSWER` dans `Answers.tsx`) pour les textes très longs, et
`Feedback` affiché dans un encart fixé en bas de l'écran. Couleur du texte des questions : token
`--question` (blanc en sombre, bleu roi en clair).
