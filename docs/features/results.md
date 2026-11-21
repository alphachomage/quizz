# Feature résultats

`src/features/results/` :

- `persist.js` : `persistResult(result, estInvite, prefs)` — appelée UNE FOIS depuis
  `App.terminer` (`src/app/App.jsx`, PAS un useEffect du composant d'affichage) :
  record, historique, XP par thème + globale, rang top 10, streak du jour, sons
  record/fin. Résultat passé au composant via `res.persistance`.
- `gameStats.js` (pur) : `computeGameStats` (temps moyen/question, meilleure série),
  `pctNiveau`.
- `useShare.js` + `components/ShareModal.jsx` : partage du quizz du jour
  (`src/lib/share.js`).
- `Results.jsx` (~200 L, render seul) : score, gagnant duel, record (avec « avant »),
  stats de la partie, bloc XP, top 10, boutons Rejouer (hors série précédente) /
  Accueil.

Tests : `tests/unit/features/result-persist.test.js`.
