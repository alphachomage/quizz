# Feature partie

`src/features/partie/` :

- `Partie.jsx` (~85 L, render seul) + `composants/` : BarreHaut, MinuteurLigne, Reponses,
  Feedback, PasseAppareil, Confettis, SignalerBouton.
- `usePartie.js` : toute la logique (états, `repondre`/`suivant`/`pret`/`finir`/
  `signalerQuestion`, effets musique/tick/auto-advance, guard pool vide).
- `useMinuteur.js` : 1 setState/s, `onExpire` à 0.
- `tirage.js` (pur) : `tirerQuestionsPartie(config)` + `avecReponsesAleatoires` + `taguerTheme`.
- `constantes.js` : palettes de réponses (dont Okabe-Ito daltonien) et confettis.

Règles du jeu : voir `docs/jeu.md`. Tests : `tests/integration/partie-*.test.jsx` +
`tests/unit/features/partie-tirage.test.js`.
