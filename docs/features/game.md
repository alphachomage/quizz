# Feature partie (game)

`src/features/game/` :

- `Game.tsx` (~88 L, render seul) + `components/` : TopBar, TimerLine, Answers,
  Feedback, PassDevice, Confetti, ReportButton.
- `useGame.js` : toute la logique (états, `answer`/`suivant`/`pret`/`finir`/
  `signalerQuestion`, effets musique/tick/auto-advance, guard pool vide).
- `useTimer.js` : 1 setState/s, `onExpire` à 0.
- `draw.js` (pur) : `drawGameQuestions(config)` + `withShuffledAnswers` + `tagTheme`.
- `constants.js` : palettes de réponses (`ANSWER_COLORS`, Okabe-Ito `COLORBLIND_COLORS`)
  et confettis (`CONFETTI_COLORS`).

Règles du jeu : voir `docs/jeu.md`. Tests : `tests/integration/game-*.test.tsx` +
`tests/unit/features/game-draw.test.ts`.
