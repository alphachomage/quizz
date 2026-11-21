# Admin (`?admin=1` + flag `admin` sur le compte en base)

Écran d'administration, prioritaire sur le reste. **Le flag `?admin=1` seul ne suffit
plus** (n'importe qui avec le lien y avait accès) : `src/app/App.tsx` lit le flag via
`readUrlFlags()` puis applique le gate `useAdminAccess` (`src/app/useAdminAccess.ts`) :

1. session **compte** requise (un invité n'a jamais accès) ;
2. le compte doit avoir **`admin = 1` dans la table D1 `comptes`** (colonne ajoutée par la
   migration `0003_admin_flag.sql`), vérifié côté serveur via
   `GET /api/admin/check?pseudo=...` (200 `{admin:true}` si `comptes.admin = 1`, 403
   sinon) — le flag vit en base, aucun secret dans `wrangler.toml` ni dans le bundle ;
3. mode de stockage `'d1'` requis (en `?stockage=local`, hors-ligne, aucune vérification
   serveur possible -> l'admin est indisponible et l'appli retombe sur le flux normal).

**Promouvoir un compte admin** (bootstrap du premier admin, puis à chaque nouveau) :

```bash
npx wrangler d1 execute voltquiz --remote --command \
  "UPDATE comptes SET admin = 1 WHERE pseudo_normalise = 'tonpseudo'"
# en local : ajoutez --local
```

Le composant rendu est `ROUTES.admin` = `src/features/admin/AdminReports.tsx` (lazy,
`src/app/routes.ts`). Quitter : recharge sans `?admin=1` (`urlWithoutAdminFlag()` +
`redirigerVers()`, `src/app/urlFlags.ts`) — les exclusions sont alors retirées du pool
au rechargement.

Rien de tout ça n'est visible dans l'interface joueur.

## Tableau de bord (v1)

`src/features/admin/AdminDashboard.tsx`, affiché EN HAUT de la vue admin, au-dessus des
sections de modération. Les métriques sont calculées par des fonctions PURES dans
`src/features/admin/dashboardCompute.ts` (testables hors React, comme
`src/features/stats/statsCompute.ts`) à partir des données lues UNIQUEMENT via `src/lib/`
(règle R5 : jamais `localStorage` en direct) : le hook `src/features/admin/useAdminMetrics.ts`
lit chaque clé avec `useStorage(STORAGE_KEYS.*)` (qui appelle `read()` de
`src/lib/storage.ts`) + `STORAGE_MODE`, et se rafraîchit à chaque écriture
(`subscribe()` dans `src/lib/storage.ts`) : valider une soumission ou traiter un
signalement met à jour le tableau de bord sans rechargement. Les métriques serveur
passent par `src/lib/api.ts` (`apiHealth`, `apiStats`) via le hook
`src/features/admin/useServerStats.ts`, avec gestion d'erreur gracieuse : réseau
coupé -> « API injoignable ». Styles dans
`src/styles/admin-dashboard.css` (palette sobre, aucun dégradé).

Une responsabilité par carte, composants dans `src/features/admin/components/` :

| Carte | Métriques |
|---|---|
| `CorpusCard.tsx` | nombre de thèmes et de questions jouables (prop `themes`, exclusions déjà appliquées + validées ajoutées) |
| `GamesCard.tsx` | parties jouées (total, par mode, % de réussite global) depuis `loadGames()` |
| `RecordsCard.tsx` | top 5 des records locaux depuis `loadRecords()` (clé `mode:niveau:themeId`) |
| `ModerationCard.tsx` | signalements en attente, soumissions en attente, questions validées, suggestions, exclusions |
| `StreakCard.tsx` | série du quizz du jour (`currentDailyStreak()`) + parties jouées aujourd'hui |
| `StorageCard.tsx` | mode de stockage actuel (`d1` par défaut, `local` via `?stockage=local`), clés présentes (n/17), comptes locaux |
| `ServerCard.tsx` | API : `/api/health` (ok, version, heure), `/api/stats` (rooms KV ouvertes, rapports CSP reçus, hits rate-limit 429), lien vers `/api/health` |
| `ActionsCard.tsx` | actions globales (voir ci-dessous) |

`MetricCard.tsx` = carte générique (icône + titre + valeur + sous-titre), réutilisée.

## Actions disponibles

Dans les sections de modération (comportement existant, inchangé) :

- **Valider / refuser une soumission** : `ProposedSection.tsx` -> `approveSubmission(id)`
  (devient jouable + exportable, disparaît de la liste) ou `removeSubmission(id)`.
- **Garder / retirer un signalement** : `ReportedSection.tsx` -> `markReport(q, 'garder'|'retirer')`
  ; « retirer » ajoute une exclusion (`voltquiz_exclues`, appliquée dans `chargerThemes`,
  retrait effectif au rechargement ; fichiers source jamais modifiés).
- **Supprimer une suggestion** : `SuggestionsSection.tsx` -> `removeSuggestion(id)`.
- **Exporter les questions validées en JSON** : `downloadJson(exportSubmissionsJson(...))`.
- **Exporter / vider tous les signalements** : `ReportedSection.tsx`.

Dans `ActionsCard.tsx` (tableau de bord) :

- **Remettre les scores à zéro** -> recharge avec `?reset=1` (`resetScores()`,
  `src/lib/reset.ts`, déclenché dans `App.tsx`).
- **Reset compte complet** -> recharge avec `?resetcompte=1` (`resetProgress()`).
- **Forcer le stockage local / revenir à D1** -> recharge avec / sans `?stockage=local`
  (`urlAvecParam` / `urlSansParam` de `src/app/urlFlags.ts` + `redirigerVers`) ;
  le mode courant est celui de `STORAGE_MODE` (`src/lib/storage.ts`).

## Métriques serveur

- `GET /api/health` (route de santé, toujours ouverte) : `ok`, `app`, `version`, `hour`.
- `GET /api/stats` : `rooms` (clés `room:` du KV `ROOMS`), `rapportsCsp` et `hits429`
  (compteurs en mémoire dans l'isolate, remis à zéro au redémarrage ; incrémentés dans
  `worker-api.ts` pour les rapports CSP et dans `worker.ts` pour le rate-limit 30 req/min/IP).
- Côté client : `apiHealth()` / `apiStats()` dans `src/lib/api.ts`, chargées par le hook
  `src/features/admin/useServerStats.ts` (carte « Serveur (API) »).

## Sections de modération (sous le tableau de bord)

- **Signalements** (`voltquiz_signales`, pouce rouge en partie) : triés par nombre,
  « Garder » / « Retirer du pool » -> exclusion `voltquiz_exclues`.
- **Questions proposées (en attente)** (`voltquiz_soumissions`) : valider ou supprimer ;
  export JSON des validées (`voltquiz_validees`).
- **Suggestions des joueurs** (`voltquiz_suggestions`) : pseudo + date + supprimer.
- **Compteur de questions par thème** (`ThemesSection.tsx`, seul endroit où le nombre de
  questions est visible côté joueur — ici admin).

## Tests

- `tests/unit/features/admin-dashboard.test.ts` : métriques calculées depuis des fixtures
  (10 parties -> % de réussite global et par mode, top des records, soumissions/signalements
  en attente comptés, série du jour rompue ou non, corpus).
- `tests/integration/app-shell.test.tsx` : test de fumée `?admin=1` avec session compte
  autorisée (tableau de bord + sections rendus) **et** test négatif `?admin=1` en mode
  invité (pas de vue admin, l'accueil s'affiche).
- `tests/unit/worker/api-admin-soumissions.test.ts` : route `/api/admin/check`
  (200/403/400, liste vide), `/api/soumissions` (POST/GET), filtre `?pseudo=` de
  `/api/parties`.
