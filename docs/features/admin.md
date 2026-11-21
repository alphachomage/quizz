# Admin (`?admin=1`)

Écran d'administration, prioritaire sur tout (même sans compte) : `src/app/App.jsx` lit le
flag `admin` via `readUrlFlags()` (`src/app/urlFlags.js`) et rend `ROUTES.admin` =
`src/features/admin/AdminReports.jsx` (chargé en lazy, `src/app/routes.js`).
Quitter : recharge sans `?admin=1` (`urlWithoutAdminFlag()` + `redirigerVers()`,
`src/app/urlFlags.js`) — les exclusions sont alors retirées du pool au rechargement.

Rien de tout ça n'est visible dans l'interface joueur.

## Tableau de bord (v1)

`src/features/admin/AdminDashboard.jsx`, affiché EN HAUT de la vue admin, au-dessus des
sections de modération. Les métriques sont calculées par des fonctions PURES dans
`src/features/admin/dashboardCompute.js` (testables hors React, comme
`src/features/stats/statsCompute.js`) à partir des données lues UNIQUEMENT via `src/lib/`
(règle R5 : jamais `localStorage` en direct) : le hook `src/features/admin/useAdminMetrics.js`
lit chaque clé avec `useStorage(STORAGE_KEYS.*)` (qui appelle `read()` de
`src/lib/storage.js`) + `STORAGE_MODE`, et se rafraîchit à chaque écriture
(`sabonner()` dans `src/lib/storage.js`) : valider une soumission ou traiter un
signalement met à jour le tableau de bord sans rechargement. Les métriques serveur
passent par `src/lib/api.js` (`apiHealth`, `apiStats`) via le hook
`src/features/admin/useServerStats.js`, avec gestion d'erreur gracieuse : V2 off ou
réseau coupé -> « V2 inactive » / « API injoignable ». Styles dans
`src/styles/admin-dashboard.css` (palette sobre, aucun dégradé).

Une responsabilité par carte, composants dans `src/features/admin/components/` :

| Carte | Métriques |
|---|---|
| `CorpusCard.jsx` | nombre de thèmes et de questions jouables (prop `themes`, exclusions déjà appliquées + validées ajoutées) |
| `GamesCard.jsx` | parties jouées (total, par mode, % de réussite global) depuis `loadGames()` |
| `RecordsCard.jsx` | top 5 des records locaux depuis `loadRecords()` (clé `mode:niveau:themeId`) |
| `ModerationCard.jsx` | signalements en attente, soumissions en attente, questions validées, suggestions, exclusions |
| `StreakCard.jsx` | série du quizz du jour (`currentDailyStreak()`) + parties jouées aujourd'hui |
| `StorageCard.jsx` | mode de stockage actuel (`local` ou `d1` via `?stockage=d1`), clés présentes (n/17), comptes locaux |
| `ServerCard.jsx` | V2 : `/api/health` (ok, version, heure, `v2`), `/api/stats` (rooms KV ouvertes, rapports CSP reçus, hits rate-limit 429), lien vers `/api/health` |
| `ActionsCard.jsx` | actions globales (voir ci-dessous) |

`MetricCard.jsx` = carte générique (icône + titre + valeur + sous-titre), réutilisée.

## Actions disponibles

Dans les sections de modération (comportement existant, inchangé) :

- **Valider / refuser une soumission** : `ProposedSection.jsx` -> `approveSubmission(id)`
  (devient jouable + exportable, disparaît de la liste) ou `removeSubmission(id)`.
- **Garder / retirer un signalement** : `ReportedSection.jsx` -> `markReport(q, 'garder'|'retirer')`
  ; « retirer » ajoute une exclusion (`voltquiz_exclues`, appliquée dans `chargerThemes`,
  retrait effectif au rechargement ; fichiers source jamais modifiés).
- **Supprimer une suggestion** : `SuggestionsSection.jsx` -> `removeSuggestion(id)`.
- **Exporter les questions validées en JSON** : `telechargerJSON(exportSubmissionsJson(...))`.
- **Exporter / vider tous les signalements** : `ReportedSection.jsx`.

Dans `ActionsCard.jsx` (tableau de bord) :

- **Remettre les scores à zéro** -> recharge avec `?reset=1` (`reinitialiserScores()`,
  `src/lib/reset.js`, déclenché dans `App.jsx`).
- **Reset compte complet** -> recharge avec `?resetcompte=1` (`reinitialiserProgression()`).
- **Activer / désactiver le stockage D1** -> recharge avec / sans `?stockage=d1`
  (`urlAvecParam` / `urlSansParam` de `src/app/urlFlags.js` + `redirigerVers`) ;
  le mode courant est celui de `STORAGE_MODE` (`src/lib/storage.js`).

## Métriques serveur (V2)

- `GET /api/health` (route ouverte) renvoie désormais aussi `v2` (`V2_ENABLED === 'true'`).
- `GET /api/stats` (gated V2 comme les autres routes : 503 si V2 off, `worker-api.js`) :
  `v2`, `rooms` (clés `room:` du KV `ROOMS`), `rapportsCsp` et `hits429` (compteurs en
  mémoire dans l'isolate, remis à zéro au redémarrage ; incrémentés dans `worker-api.js`
  pour les rapports CSP et dans `worker.js` pour le rate-limit 30 req/min/IP).
- Côté client : `apiHealth()` / `apiStats()` dans `src/lib/api.js`, chargées par le hook
  `src/features/admin/useServerStats.js`.

## Sections de modération (sous le tableau de bord)

- **Signalements** (`voltquiz_signales`, pouce rouge en partie) : triés par nombre,
  « Garder » / « Retirer du pool » -> exclusion `voltquiz_exclues`.
- **Questions proposées (en attente)** (`voltquiz_soumissions`) : valider ou supprimer ;
  export JSON des validées (`voltquiz_validees`).
- **Suggestions des joueurs** (`voltquiz_suggestions`) : pseudo + date + supprimer.
- **Compteur de questions par thème** (`ThemesSection.jsx`, seul endroit où le nombre de
  questions est visible côté joueur — ici admin).

## Tests

- `tests/unit/features/admin-dashboard.test.js` : métriques calculées depuis des fixtures
  (10 parties -> % de réussite global et par mode, top des records, soumissions/signalements
  en attente comptés, série du jour rompue ou non, corpus).
- `tests/integration/app-shell.test.jsx` : test de fumée `?admin=1` (tableau de bord +
  sections de modération rendus).
