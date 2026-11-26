# Questions

## Corpus actuel

Le compteur de référence est la commande (ne jamais citer de chiffre en dur) :

```bash
npm run count:questions   # node scripts/count-questions.mjs
```

Le corpus vit dans **`content/`** (JSON, source de vérité, versionné) :

```
content/
  themes.json                # [{ id, nom, icone, couleur, actif }] — ORDRE significatif
  questions/<themeId>.json   # { "theme": "<id>", "questions": [ { id, q, reponses, bonne, niveau, info? } ] }
```

Une question par ligne (diffs git lisibles). `actif: false` = thème retiré du jeu : ses
questions restent dans `content/` mais ne figurent ni dans `corpus.json` ni dans le manifeste.
Chiffres à jour via `npm run count:questions` (thèmes, questions, doublons, invalides ; ne
jamais les écrire en dur ici).

```bash
npm run test:data         # structure de content/ + schéma zod de tout le corpus
npm run questions:ids     # attribue un id aux questions ajoutées sans id (n'en change aucun autre)
```

### Identifiants et ordre (à ne jamais casser)

- Chaque question a un **id stable** `<theme>-<hex>` (6 premiers hex de sha1 du texte
  normalisé au moment de la création, allongé si collision). L'id est écrit UNE fois dans
  le JSON, puis **jamais recalculé ni réattribué** (corriger le texte d'une question garde
  son id). Les scripts ne régénèrent jamais les ids existants.
- L'**ordre** des thèmes et des questions est significatif : le Quizz du jour est un tirage
  seedé sur le corpus ordonné, réordonner changerait les questions du jour pour tous.
  Ajouter en fin de fichier ; supprimer une question est possible, pas la déplacer.
- Les statistiques, overrides, signalements et exclusions sont encore indexés par le texte
  normalisé de la question (migration vers les ids prévue plus tard).

Procédure d'ajout : voir **`docs/ajouter-questions.md`** (lots déposés dans `content/inbox/`,
importés par `npm run questions:import` ; règles qualité et dette dans
`content/qualite-dette.json`, contrôlées par `npm run questions:lint`). `scripts/gen-manifest.mjs` régénère
`src/data/theme-manifest.js` + `CORPUS_VERSION` (hash de `content/`) et
`scripts/gen-corpus-json.mjs` régénère `public/corpus.json` (auto au démarrage de Vite,
plugin `generateCorpus` de `vite.config.ts`, ou à la main : `npm run gen:manifest`,
`npm run gen:corpus`). Ces deux scripts et les outils (`count`, `audit`, `dedupe`, `ids`, `lint`, `import`)
partagent `scripts/lib/content.mjs` ; règles qualité : `scripts/lib/quality.mjs`, ids : `scripts/lib/ids.mjs`.

## Chargement : IndexedDB (cache persistant) + chunks lazy en fallback

`src/data/questions.ts` utilise `import.meta.glob('../../content/questions/*.json')`
**non eager** : chaque fichier de thème devient un chunk `theme-questions-*.js`. Ces chunks
sont **exclus du précache PWA** (`globIgnores: ['**/theme-questions-*.js']` dans
`vite.config.ts`, noms posés par `chunkFileNames`) : ils dupliquent `corpus.json` et ne
servent qu'en repli en ligne (chargés à la demande, sans cache dédié). Le hors-ligne
repose sur `corpus.json` précaché puis sur IndexedDB.

**Premier lancement** (ou après un changement de version du corpus) : `loadThemes()`
fetch d'abord **`public/corpus.json`** (généré depuis `content/`, **non versionné dans git**,
tout le corpus servi en un seul JSON minifié avec `version` et l'`id` de chaque question,
précaché par la PWA car dans `public/`), fallback sur les chunks `import.meta.glob` si le
fetch échoue ou si la version ne correspond. Puis le corpus est
indexé dans **IndexedDB** (`src/lib/question-db.ts`, base `voltquiz-questions`, store
`questions` avec index `by_theme` et `by_theme_niveau` ; l'id stable y est stocké dans
`qid`, le champ `id` du store restant la clé auto-incrémentée) avec la version du corpus
(`CORPUS_VERSION`, hash de `content/` généré par `scripts/gen-manifest.mjs` dans
`theme-manifest.js`).

**Démarrages suivants** : si la version stockée dans IndexedDB === `CORPUS_VERSION`,
`loadThemes()` lit le corpus directement depuis IndexedDB (`loadCorpus`) — beaucoup plus
rapide. Sinon (ou si IndexedDB est indisponible : navigation privée, vieux navigateur),
repli sur `corpus.json` puis les chunks + réindexation.

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
        { "id": "mon-theme-1a2b3c", "q": "Texte ?", "reponses": ["A", "B", "C", "D"], "bonne": 2, "niveau": "moyen", "info": "Anecdote optionnelle." }
      ]
    }
  ]
}
```

`bonne` = index (0-based) dans `reponses` ; 2 à 4 réponses ; `niveau` obligatoire
(`facile` | `moyen` | `dur`) ; `icone` = nom d'une icône de `src/shared/ui/Icon.tsx`.
`id` (question) = identifiant stable, optionnel côté schéma zod (les questions communautaires
et du fichier perso n'en ont pas forcément). Même `id` de thème qu'un thème existant =
questions ajoutées à ce thème (fusion par `mergeThemes` dans `src/shared/utils/mergeThemes.ts`).

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
