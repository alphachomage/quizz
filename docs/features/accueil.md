# Feature accueil

`src/features/accueil/Accueil.jsx` (render-only) + `useAccueil.js` + `composants/` (7 sous-composants). Modales transverses dans `src/shared/modales/`. Écran chargé en React.lazy (routes.js).

- 4 onglets pilule de modes (Solo, Duel, Survie, Quizz du jour avec pastille série).
- Grille de thèmes (cartes compactes : icône duotone + nom, badge Niv., record, barre XP).
- Solo : modale de choix du niveau au clic sur le thème ; bouton « C'est parti » fixe en bas.
- Barre utilisateur : profil, badges, stats, classement, paramètres, tuto, déconnexion.
- Bannière « prochain badge » (`prochainBadge`), bouton « Proposer une question »,
  « Une suggestion ? ».
