# Progression : XP, badges, titres, classement, stats

## XP par thème (`src/lib/xp.js`)

Chaque partie créditée au thème ses points en XP (`addXp`), via le détail question
par question. Niveau = `1 + floor(sqrt(XP/100))` (`themeLevel`), XP requise =
`100*(n-1)^2` (`xpForLevel`). Affiché sur les cartes thèmes (badge « Niv. X » + barre)
et dans le profil (`src/shared/modals/Profile.jsx`). XP globale = somme des thèmes
(`computeGlobalXp` dans `src/features/stats/statsCompute.js`).

## Badges (30) et titres (50)

- `src/lib/badges.js` : `BADGES` (30 badges) + `computeBadges()` depuis l'historique
  local (`badgeStats`) ; `prochainBadge()` pour la bannière « reviens-y » de l'accueil
  (`BadgeBanner`). Badge favori choisi parmi les débloqués (clé
  `voltquiz_badge_favori`, `favoriteBadge`/`setFavoriteBadge`, affiché sur le profil).
- `src/lib/titles.js` : 3 paliers par thème (`PALIERS_TITRE = [3, 5, 10]` sur les 12
  thèmes actifs = 36 titres) + 14 titres généraux (`GENERAL_TITLES`) = 50 titres.
  Titre actif choisi (clé `voltquiz_titre_actif`, `computeTitles`), affiché sous la
  barre d'XP du profil.
- Animation de déblocage (`src/app/useUnlock.js` + `src/features/unlock/UnlockModal.jsx`) :
  snapshot au départ de la partie, diff à la fin -> carte animée + son « tonnerre » +
  vibration `[70, 50, 130]`, affiché sur l'accueil au retour.

## Classement local (`src/features/leaderboard/Leaderboard.jsx`)

Depuis `voltquiz_parties` (500 dernières parties max, `src/lib/game-history.js`) :
onglets par mode, filtre Facile/Moyen/Difficile en solo, sélecteur
« Tout l'historique / Cette semaine » (`isThisWeek` dans `src/lib/dates.js`,
lundi->dimanche). Lignes : rang, joueur, badge thème coloré, difficulté, points.

## Stats (`src/features/stats/Stats.jsx` + `statsCompute.js`)

Depuis l'historique : `computeStats` (parties jouées, questions répondues, % réussite,
points cumulés, meilleur score par mode, taux par thème), `computeCalendar`
(calendrier d'activité 12 semaines), `computeAvgTime` (temps de réaction moyen,
champ `secondes` des détails), top 5 records, barres 30 jours, XP globale.
Composants : `StatCards`, `StatLists`, `XpProgress`, `Last30Days`, `MonthCalendar`.
