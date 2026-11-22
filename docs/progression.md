# Progression : XP, badges, titres, classement, stats

## XP par thème (`src/lib/xp.ts`)

Chaque partie créditée au thème ses points en XP (`addXp`), via le détail question
par question. Niveau = `1 + floor(sqrt(XP/100))` (`themeLevel`), XP requise =
`100*(n-1)^2` (`xpForLevel`). Affiché sur les cartes thèmes (badge « Niv. X » + barre)
et dans le profil (`src/shared/modals/Profile.tsx`). XP globale = somme des thèmes
(`computeGlobalXp` dans `src/features/stats/statsCompute.ts`).

## Badges (30) et titres (50)

- `src/lib/badges.ts` : `BADGES` (30 badges) + `computeBadges()` depuis l'historique
  local (`badgeStats`) ; `nextBadge()` pour la bannière « reviens-y » de l'accueil
  (`BadgeBanner`). Badge favori choisi parmi les débloqués (clé
  `voltquiz_badge_favori`, `favoriteBadge`/`setFavoriteBadge`, affiché sur le profil).
- `src/lib/titles.ts` : 3 paliers par thème (`PALIERS_TITRE = [3, 5, 10]` sur les 12
  thèmes actifs = 36 titres) + 14 titres généraux (`GENERAL_TITLES`) = 50 titres.
  Titre actif choisi (clé `voltquiz_titre_actif`, `computeTitles`), affiché sous la
  barre d'XP du profil.
- Animation de déblocage (`src/app/useUnlock.ts` + `src/features/unlock/UnlockModal.tsx`) :
  snapshot au départ de la partie, diff à la fin -> carte animée + son « tonnerre » +
  vibration `[70, 50, 130]`, affiché sur l'accueil au retour.

## Classement local (`src/features/leaderboard/Leaderboard.tsx`)

Depuis `voltquiz_parties` (500 dernières parties max, `src/lib/game-history.ts`) :
onglets par mode, filtre Facile/Moyen/Difficile en solo, sélecteur
« Tout l'historique / Cette semaine » (`isThisWeek` dans `src/lib/dates.ts`,
lundi->dimanche). Lignes : rang, joueur, badge thème coloré, difficulté, points.

### Classement global (serveur D1)

Bascule « Local (ce PC) / Global (en ligne) » affichée uniquement en mode `d1`
(`STORAGE_MODE`, `?stockage=local` la masque). Le global appelle
**GET `/api/classement?mode=&niveau=&periode=`** (`worker-api.ts` → `routeClassement`,
session requise) : top 20 agrégé en SQL sur la table D1 `parties`
(`json_each(joueurs)`, meilleur score par joueur = colonne `pseudo` normalisée,
sinon nom du 1er joueur), filtres `niveau` (solo) et `periode=semaine` (depuis lundi
00:00 UTC). Client : `apiClassement()` dans `src/lib/api.ts`. La ligne du compte
connecté est surlignée (`.ligne-classement.moi`). En cas d'erreur réseau, message
d'erreur + retour possible en local.

## Stats (`src/features/stats/Stats.tsx` + `statsCompute.ts`)

Depuis l'historique : `computeStats` (parties jouées, questions répondues, % réussite,
points cumulés, meilleur score par mode, taux par thème), `computeCalendar`
(calendrier d'activité 12 semaines), `computeAvgTime` (temps de réaction moyen,
champ `secondes` des détails), top 5 records, barres 30 jours, XP globale.
Composants : `StatCards`, `StatLists`, `XpProgress`, `Last30Days`, `MonthCalendar`.
