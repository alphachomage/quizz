# Feature partie (game)

`src/features/game/` :

- `Game.tsx` (~88 L, render seul) + `components/` : TopBar, TimerLine, Answers,
  Feedback, PassDevice, Confetti, ReportButton.
- `useGame.ts` : toute la logique (états, `answer`/`suivant`/`pret`/`finir`/
  `signalerQuestion`, effets musique/tick/auto-advance, guard pool vide).
- `useTimer.ts` : 1 setState/s, `onExpire` à 0.
- `draw.ts` (pur) : `drawGameQuestions(config)` + `withShuffledAnswers` + `tagTheme`.
- `constants.ts` : palettes de réponses (`ANSWER_COLORS`, Okabe-Ito `COLORBLIND_COLORS`)
  et confettis (`CONFETTI_COLORS`).

Règles du jeu : voir `docs/jeu.md`. Tests : `tests/integration/game-*.test.tsx` +
`tests/unit/features/game-draw.test.ts`.

## Mise en page (2026-11-23)

L'écran de partie tient sur un seul écran sans défilement (`src/styles/partie-compacte.css`) :
en-tête `TopBar` sur deux niveaux (`.barre-haut-theme` puis `.barre-haut-infos`), question en
`clamp(... dvh ...)`, classes `.question.longue` (> 110 car., `LONG_QUESTION` dans `Game.tsx`) et
`.reponse.longue` (> 45 car., `LONG_ANSWER` dans `Answers.tsx`) pour les textes très longs, et
`Feedback` affiché dans un encart fixé en bas de l'écran. Couleur du texte des questions : token
`--question` (blanc en sombre, bleu roi en clair).
