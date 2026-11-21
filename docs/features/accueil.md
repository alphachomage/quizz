# Feature accueil

`src/features/home/Home.jsx` (render-only) + `useHome.js` + `components/` (7
sous-composants). Modales transverses dans `src/shared/modals/`. Écran chargé en
React.lazy (`src/app/routes.js`, clé `home`).

- 4 onglets pilule de modes (`ModeTabs` : Solo, Duel, Survie, Quizz du jour avec
  pastille série).
- Grille de thèmes (`ThemeGrid` : cartes compactes — icône duotone + nom, badge
  Niv., record, barre XP).
- Solo : modale de choix du niveau au clic sur le thème (`LevelModal`) ; bouton
  « C'est parti » fixe en bas (`FixedCta`).
- Barre utilisateur (`UserBar`) : profil, badges, stats, classement, paramètres,
  tuto, déconnexion.
- Bannière « prochain badge » (`BadgeBanner`, `prochainBadge`), bouton
  « Proposer une question », « Une suggestion ? », noms de duel suggérés (`DuelNames`).
