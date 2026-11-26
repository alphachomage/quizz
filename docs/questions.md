# Questions

## Corpus actuel

Le compteur de référence est la commande (ne jamais citer de chiffre en dur) :

```bash
npm run count:questions   # node scripts/count-questions.mjs
```

Résultat actuel : chiffres à jour via `npm run count:questions` (thèmes, questions,
doublons, invalides ; ne jamais les écrire en dur ici), fichiers `src/data/questions-*.js`.
Parmi les thèmes en fichiers, **2 sont retirés du jeu** (`RETIRED_THEMES = ['insolite', 'pop-culture']` dans
`src/data/questions.ts` : leurs 150 questions chacune ont été reclassées dans les
autres thèmes via `questions-redistribution.js`) -> les autres thèmes sont actifs.

```bash
npm run test:data         # test de schéma (zod) sur tout le corpus
```

Ne JAMAIS modifier les fichiers existants (ajout uniquement) — voir le guide pas à
pas **`docs/ajouter-questions.md`**. `scripts/gen-manifest.mjs` régénère
`src/data/theme-manifest.js` + `CORPUS_VERSION` (auto via `predev`/`prebuild`, ou à la
main : `npm run gen:manifest`).

## Chargement : IndexedDB (cache persistant) + chunks lazy en fallback

`src/data/questions.ts` utilise `import.meta.glob('./questions-*.js')` **non eager** :
chaque fichier `questions-*.js` est découpé en un chunk (~10 Ko) par le bundler, et la
PWA précache tous les chunks (hors-ligne OK).

**Premier lancement** (ou après un changement de version du corpus) : `loadThemes()`
fetch d'abord **`public/corpus.json`** (généré au build par `scripts/gen-corpus-json.mjs`,
tout le corpus fusionné en un seul JSON minifié de ~2,4 Mo avec `version`, précaché par
la PWA car dans `public/` — 1 requête au lieu d’un chunk par fichier), fallback sur les chunks
`import.meta.glob` si le fetch échoue ou si la version ne correspond. Puis le corpus est
indexé dans **IndexedDB** (`src/lib/question-db.ts`, base `voltquiz-questions`, store
`questions` avec index `by_theme` et `by_theme_niveau`) avec la version du corpus
(`CORPUS_VERSION`, hash des fichiers généré par `scripts/gen-manifest.mjs` dans
`theme-manifest.js`).

**Démarrages suivants** : si la version stockée dans IndexedDB === `CORPUS_VERSION`,
`loadThemes()` lit le corpus directement depuis IndexedDB (`loadCorpus`) — beaucoup plus
rapide qu’une requête par chunk + parsing JS. Sinon (ou si IndexedDB est indisponible :
navigation privée, vieux navigateur), repli sur les chunks + réindexation.

Seules les métadonnées (`THEMES_META`, depuis `theme-manifest.js`, ~2 Ko) restent
disponibles immédiatement, sans attendre IndexedDB.

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
(`facile` | `moyen` | `dur`) ; `icone` = nom d'une icône de `src/shared/ui/Icon.tsx`.
Même `id` qu'un thème existant = questions ajoutées à ce thème (fusion par
`mergeThemes` dans `src/shared/utils/mergeThemes.ts`).

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

## Qualité du tirage : stats de réussite par question

Chaque partie terminée enregistre le résultat de chaque question (texte + correct) dans
`voltquiz_stats_questions` (`src/lib/question-stats.ts`, sync D1 en mode `d1`), indexé
par texte normalisé. Au tirage (`drawGameQuestions`), `filterByQuality()` retire du pool
les questions **suspectes** : taux de réussite < 5 % après au moins 20 évaluations
(question probablement fausse), ou > 98 % en niveau « dur » (trop facile) — sauf si ça
laisse moins de questions que demandé (le pool d'origine est alors conservé).

## Corpus communautaire (D1, cross-device)

Les propositions validées par l'admin sont aussi poussées côté serveur
(`POST /api/soumissions/valider`, etat `validee` dans la table `soumissions`) et servies
à tous les joueurs connectés via `GET /api/questions?themeId=&page=&limit=` (paginé,
session requise, `reponses` parsé côté serveur). Côté client, `src/lib/community.ts`
(`loadCommunityQuestions`) récupère toutes les pages au démarrage, valide chaque ligne
par zod (`submissionSchema`), dédup par texte normalisé, et `ThemesContext` les fusionne
au catalogue (dédup aussi avec les questions validées localement). Best-effort : hors-ligne
ou `?stockage=local`, aucune question communautaire, le jeu continue avec le corpus intégré.
Le refus admin (`refuseSubmission`) passe l'état à `refusee` côté serveur.

## Deux façons d'ajouter ses questions

1. **Depuis l'appli** (« Proposer une question », débloqué au niveau 3 du thème,
   `SUBMISSION_LEVEL_THRESHOLD` dans `src/lib/submissions.ts`) : détection de
   similarité (`src/lib/similarity.ts`, Jaccard mots+bigrammes, seuil 0.4
   `THRESHOLD_SIMILAR`, quasi-identique 0.85 `THRESHOLD_IDENTICAL`), puis
   **validation manuelle** dans `?admin=1` : la proposition passe de « en attente »
   (`voltquiz_soumissions`) à « validées » (`voltquiz_validees`, jouables,
   exportables en JSON via `downloadJson`) et disparaît de la liste des propositions.
2. **Via le fichier** `public/questions-utilisateur.json` (fetch au démarrage, validé
   par zod `validatePersonalFile` dans `src/lib/schema.ts`, puis fusionné dans
   `ThemesContext`).

## Admin (`?admin=1`)

`src/features/admin/AdminReports.tsx`. Signalements (pouce rouge en partie, clé
`voltquiz_signales`) : « Garder » / « Retirer du pool » (exclusion via
`voltquiz_exclues`) / **« Modifier »** (override via `voltquiz_overrides`, voir
`src/lib/overrides.ts` : la question est remplacée dans le pool sans toucher au
fichier source). Exclusions et overrides sont appliqués dans `loadThemes()`,
effectifs au rechargement ; les fichiers source ne sont jamais modifiés.
Propositions en attente, suggestions des joueurs (`voltquiz_suggestions`),
compteur de questions par thème (seul endroit où le nombre de questions est
visible côté UI ; la référence reste `npm run count:questions`).
