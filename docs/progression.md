# Progression : XP, badges, titres, classement, stats

## XP par thème (`src/lib/xp.js`)

Chaque partie créditée au thème ses points en XP (`ajouterXP`), via le détail question
par question. Niveau = `1 + floor(sqrt(XP/100))` (`niveauTheme`), XP requise =
`100*(n-1)^2` (`xpPourNiveau`). Affiché sur les cartes thèmes (badge « Niv. X » + barre)
et dans le profil. XP globale = somme des thèmes.

## Badges (30) et titres (50)

- `src/lib/badges.js` : `BADGES` + `calculerBadges()` depuis l'historique local
  (`statsBadges`) ; `prochainBadge()` pour la bannière « reviens-y » de l'accueil.
  Badge favori choisi parmi les débloqués (`voltquiz_badge_favori`, affiché sur le profil).
- `src/lib/titres.js` : 3 paliers par thème (niveaux 3/5/10 = 36 titres) + 14 généraux.
  Titre actif choisi (`voltquiz_titre_actif`), affiché sous la barre d'XP du profil.
- Animation de déblocage (`src/app/useCelebration.js` + `Deblocage.jsx`) : snapshot au
  départ de la partie, diff à la fin -> carte animée + son « tonnerre » + vibration
  `[70, 50, 130]`, affiché sur l'accueil au retour.

## Classement local (`src/components/Classement.jsx`)

Depuis `voltquiz_parties` (500 dernières parties max) : onglets par mode, filtre
Facile/Moyen/Difficile en solo, sélecteur « Tout l'historique / Cette semaine »
(`dansSemaineEnCours`, lundi->dimanche). Lignes : rang, joueur, badge thème coloré,
difficulté, points.

## Stats (`src/components/Stats.jsx`)

Depuis l'historique : parties jouées, questions répondues, % réussite, points cumulés,
meilleur score par mode, taux par thème, XP globale, top 5 records, calendrier d'activité
(12 semaines), barres 30 jours, temps de réaction moyen (champ `secondes` des détails).
