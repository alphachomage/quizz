# Feature résultats

`src/features/results/` :

- `persist.ts` : `persistResult(result, isGuest, prefs)` — appelée UNE FOIS depuis
  `App.terminer` (`src/app/App.tsx`, PAS un useEffect du composant d'affichage) :
  record, historique, XP par thème + globale, rang top 10, streak du jour, sons
  record/fin. Résultat passé au composant via `res.persistance`.
- `gameStats.ts` (pur) : `computeGameStats` (temps moyen/question, meilleure série),
  `levelPercent`.
- `useShare.ts` + `components/ShareModal.tsx` : partage du quizz du jour
  (`src/lib/share.ts`).
- `Results.tsx` (~200 L, render seul) : score, gagnant duel, record (avec « avant »),
  stats de la partie, bloc XP, top 10, boutons Rejouer (hors série précédente) /
  Accueil.

Tests : `tests/unit/features/result-persist.test.ts`.

## Mise en page (2026-11-23, atelier)

`Results.tsx` affiche : titre en capitales + `.bloc-score` (score, nouveau record), puis
`components/ResultTiles.tsx` (3 tuiles : bonnes réponses, temps moyen, meilleure série ; pas en
duel), `.resultat-record` (record + pastille Top 10), `components/ResultXp.tsx` (XP gagnée,
niveau, barre ; détail par thème seulement si plusieurs thèmes), puis les actions.
