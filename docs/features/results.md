# Feature résultats

`src/features/resultat/` :

- `persistance.js` : `persisterResultat(resultat, estInvite, prefs)` — appelée UNE FOIS
  depuis `App.terminer` (PAS un useEffect du composant d'affichage) : record, historique,
  XP par thème + globale, rang top 10, streak du jour, sons record/fin. Résultat passé
  au composant via `resultat.persistance`.
- `statsPartie.js` (pur) : `calculerStatsPartie` (temps moyen/question, meilleure série),
  `pctNiveau`.
- `usePartage.js` + `composants/PartageModal.jsx` : partage du quizz du jour.
- `Resultat.jsx` (~200 L, render seul) : score, gagnant duel, record (avec « avant »),
  stats de la partie, bloc XP, top 10, boutons Rejouer (hors série précédente) / Accueil.

Tests : `tests/unit/features/resultat-persistance.test.js`.
