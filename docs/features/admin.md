# Admin (`?admin=1`)

`src/components/AdminSignales.jsx`, prioritaire sur tout (même sans compte).

- **Signalements** (`voltquiz_signales`, pouce rouge en partie) : triés par nombre,
  « Garder » / « Retirer du pool » -> exclusion `voltquiz_exclues` (appliquée dans
  `chargerThemes`, retrait effectif au rechargement ; fichiers source jamais modifiés).
- **Questions proposées (en attente)** : valider (devient jouable + exportable, disparaît
  de la liste) ou supprimer. Export JSON des validées.
- **Suggestions des joueurs** (`voltquiz_suggestions`) : pseudo + date + supprimer.
- **Compteur de questions par thème** (seul endroit où le nombre de questions est visible).
- Quitter : recharge sans `?admin=1` (`urlSansFlagAdmin` dans `src/app/urlFlags.js`).
