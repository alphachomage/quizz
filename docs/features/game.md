# Feature partie (game)

`src/features/game/` :

- `Game.tsx` (~88 L, render seul) + `components/` : TopBar, TimerLine, Answers,
  Feedback, PassDevice, Confetti, ReportButton.
- `useGame.ts` : toute la logique (états, `answer`/`suivant`/`pret`/`finir`/
  `abandonner`/`signalerQuestion`, effets musique/tick/auto-advance, guard pool vide).
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
