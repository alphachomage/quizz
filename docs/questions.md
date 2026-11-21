# Questions

## Corpus actuel

Le compteur de référence est la commande (ne jamais citer de chiffre en dur) :

```bash
npm run count:questions   # node scripts/count-questions.mjs
```

Résultat actuel : **14 thèmes en fichiers, 13 561 questions** (263 fichiers
`src/data/questions-*.js`), 73 doublons exacts, 0 question invalide. Parmi ces 14
thèmes, **2 sont retirés du jeu** (`RETIRED_THEMES = ['insolite', 'pop-culture']` dans
`src/data/questions.js` : leurs 150 questions chacune ont été reclassées dans les
autres thèmes via `questions-redistribution.js`) -> **12 thèmes actifs**.

```bash
npm run test:data         # test de schéma (zod) sur tout le corpus
```

Ne JAMAIS modifier les 263 fichiers existants (ajout uniquement). `scripts/gen-manifest.mjs`
régénère `src/data/theme-manifest.js` (auto via `predev`/`prebuild`, ou à la main :
`npm run gen:manifest`).

## Chargement : chunks lazy, mais tout est chargé au démarrage

`src/data/questions.js` utilise `import.meta.glob('./questions-*.js')` **non eager** :
chaque fichier `questions-*.js` est découpé en un chunk (~10 Ko) par le bundler, et la
PWA précache tous les chunks (hors-ligne OK). **Mais** `loadThemes()` (appelée par
`ThemesContext` au démarrage) charge **tous les chunks** via `Promise.all` : le lazy
sert à alléger le chunk initial et à permettre le precache, pas à différer le chargement
des questions. Seules les métadonnées (`THEMES_META`, depuis `theme-manifest.js`, ~2 Ko)
sont disponibles immédiatement.

## Format (clés en français, documentées pour le client)

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
(`facile` | `moyen` | `dur`) ; `icone` = nom d'une icône de `src/shared/ui/Icon.jsx`.
Même `id` qu'un thème existant = questions ajoutées à ce thème (fusion par
`mergeThemes` dans `src/shared/utils/mergeThemes.js`).

## Thèmes et couleurs (ne jamais inventer de couleur)

| Thème (id) | Couleur | Dans le jeu |
|---|---|---|
| cinema-series | `#fb7185` | oui |
| cuisine | `#fb923c` | oui |
| culture-generale | `#818cf8` | oui |
| espace | `#818cf8` | oui |
| geographie | `#2dd4bf` | oui |
| histoire | `#a3e635` | oui |
| insolite | `#fb923c` | **retiré** (questions reclassées) |
| jeux-videos | `#38bdf8` | oui |
| mangas-animes | `#f472b6` | oui |
| musique | `#a78bfa` | oui |
| mythologie | `#fbbf24` | oui |
| pop-culture | `#e879f9` | **retiré** (questions reclassées) |
| sciences | `#2dd4bf` | oui |
| sport | `#4ade80` | oui |

## Deux façons d'ajouter ses questions

1. **Depuis l'appli** (« Proposer une question », débloqué au niveau 3 du thème,
   `SUBMISSION_LEVEL_THRESHOLD` dans `src/lib/submissions.js`) : détection de
   similarité (`src/lib/similarity.js`, Jaccard mots+bigrammes, seuil 0.4
   `THRESHOLD_SIMILAR`, quasi-identique 0.85 `THRESHOLD_IDENTICAL`), puis
   **validation manuelle** dans `?admin=1` : la proposition passe de « en attente »
   (`voltquiz_soumissions`) à « validées » (`voltquiz_validees`, jouables,
   exportables en JSON via `downloadJson`) et disparaît de la liste des propositions.
2. **Via le fichier** `public/questions-utilisateur.json` (fetch au démarrage, validé
   par zod `validatePersonalFile` dans `src/lib/schema.js`, puis fusionné dans
   `ThemesContext`).

## Admin (`?admin=1`)

`src/features/admin/AdminReports.jsx`. Signalements (pouce rouge en partie, clé
`voltquiz_signales`) : « Garder » ou « Retirer du pool » (exclusion via
`voltquiz_exclues`, appliquée dans `loadThemes()`, retrait effectif au rechargement ;
les fichiers source ne sont jamais modifiés). Propositions en attente, suggestions
des joueurs (`voltquiz_suggestions`), compteur de questions par thème (seul endroit
où le nombre de questions est visible côté UI ; la référence reste
`npm run count:questions`).
