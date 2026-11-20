# Questions

## Corpus actuel

12 thèmes actifs, **13 261 questions** (1100+ par thème), 263 fichiers
`src/data/questions-*.js` chargés en chunks lazy par `chargerThemes()`
(`src/data/questions.js`). Compteur à jour :

```bash
node --input-type=module -e "..."   # ou la visu admin ?admin=1 (sous chaque thème)
npm run test:data                    # test de schéma sur tout le corpus
```

Ne JAMAIS modifier les fichiers existants (ajout uniquement). `scripts/gen-manifest.mjs`
régénère `src/data/manifest-themes.js` (auto via predev/prebuild).

## Format

```json
{
  "themes": [
    {
      "id": "mon-theme",
      "nom": "Mon thème",
      "icone": "sparkles",
      "couleur": "#ff6600",
      "questions": [
        { "q": "Texte ?", "reponses": ["A", "B", "C", "D"], "bonne": 2, "niveau": "moyen", "info": "Anecdote optionnelle." }
      ]
    }
  ]
}
```

`bonne` = index (0-based) dans `reponses` ; 2 à 4 réponses ; `niveau` obligatoire
(`facile` | `moyen` | `dur`) ; `icone` = nom d'une icône de `Icone.jsx`. Même `id` qu'un
thème existant = questions ajoutées à ce thème.

## Deux façons d'ajouter ses questions

1. **Depuis l'appli** (« Proposer une question », débloqué au niveau 3 du thème) :
   détection de similarité (`src/lib/similarite.js`, Jaccard mots+bigrammes, seuil 0.4,
   quasi-identique 0.85), puis **validation manuelle** dans `?admin=1` : la proposition
   passe de « en attente » (`voltquiz_soumissions`) à « validées » (`voltquiz_validees`,
   jouables, exportables en JSON) et disparaît de la liste des propositions.
2. **Via le fichier** `public/questions-utilisateur.json` (validé par zod,
   `src/lib/schema.js`, au chargement dans `ThemesContext`).

## Admin (`?admin=1`)

Signalements (pouce rouge en partie, compteur `voltquiz_signales`) : « Garder » ou
« Retirer du pool » (exclusion via `voltquiz_exclues`, appliquée au chargement de
`chargerThemes`, retrait effectif au rechargement). Propositions en attente, suggestions
des joueurs (`voltquiz_suggestions`), compteur de questions par thème.
