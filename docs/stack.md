# Stack & architecture

## Stack

| Outil | Rôle |
|---|---|
| React 18 | librairie d'interface |
| Vite 6 | dev server + build |
| vite-plugin-pwa | PWA installable + hors-ligne (workbox, precache des chunks) |
| @cloudflare/vite-plugin + wrangler | déploiement Workers (`worker.js`, `wrangler.toml`) |
| Vitest + Testing Library + jsdom | tests (`vitest.config.js` séparé de `vite.config.js`) |
| ESLint flat + Prettier + madge | lint (règles R1-R5 en erreur, 0 erreur 0 warning toléré), format, imports circulaires (`npm run lint:arch`) |
| zod | validation des données externes (`src/lib/schema.js`) |

Conventions de langue : **code en anglais, commentaires en français** ; UI et contenus
en français ; les **clés du schéma de données** (`q`, `reponses`, `bonne`, `niveau`,
`info`, `nom`, `icone`, `couleur`) et les clés localStorage (`voltquiz_*`) restent en
français (format documenté pour le client, compatibilité avec les données existantes).

## Arborescence réelle

```
src/
├── main.jsx                # StrictMode + ErrorBoundary + registerSW + preloadFromServer() + <App/>
├── styles.css              # UNIQUEMENT des @import vers styles/ (ordre = cascade conservée)
├── app/                    # shell
│   ├── App.jsx             # ~176 L : early returns + délègue le rendu à Screens.jsx
│   ├── Screens.jsx         # rendu des écrans connectés (routes lazy) + Tutorial + UnlockModal
│   ├── AppProviders.jsx    # SessionProvider + PrefsProvider + ThemesProvider
│   ├── routes.js           # 9 écrans en React.lazy (1 chunk JS par écran)
│   ├── useNavigation.js    # routing par état, setState en startTransition (pas de flash)
│   ├── useUnlock.js        # snapshot badges/titres -> modale de déblocage à la fin
│   ├── urlFlags.js         # flags URL (?admin=1, ?tuto=1, ?reset=1...) + redirigerVers
│   └── contexts/           # SessionContext.js · PrefsContext.js · ThemesContext.js (3 max)
├── features/               # UNE feature = UN dossier autonome (jamais features/X -> features/Y, R4)
│   ├── home/               # Home.jsx + useHome.js + components/ (ModeTabs, ThemeGrid,
│   │                       #   LevelModal, FixedCta, UserBar, BadgeBanner, DuelNames)
│   ├── game/               # Game.jsx + useGame.js + useTimer.js + draw.js + constants.js
│   │                       #   + components/ (TopBar, TimerLine, Answers, Feedback,
│   │                       #   PassDevice, Confetti, ReportButton)
│   ├── results/            # Results.jsx + persist.js + gameStats.js + useShare.js
│   │                       #   + components/ShareModal.jsx
│   ├── leaderboard/        # Leaderboard.jsx
│   ├── account/            # Account.jsx
│   ├── admin/              # AdminReports.jsx + components/ (ReportedSection, ProposedSection,
│   │                       #   SuggestionsSection, ThemesSection)
│   ├── question-form/      # QuestionForm.jsx + components/ (AnswersField, SimilarityAlert)
│   ├── tutorial/           # Tutorial.jsx
│   ├── unlock/             # UnlockModal.jsx
│   ├── badges/             # Badges.jsx
│   └── stats/              # Stats.jsx + statsCompute.js + components/ (StatCards, StatLists,
│                           #   XpProgress, Last30Days, MonthCalendar)
├── shared/                 # transversal (n'importe que lib/ + react, R3)
│   ├── ui/                 # Icon.jsx (dictionnaire SVG, zéro emoji, ~360 L : plafond souple)
│   │                       #   · Modal.jsx (role=dialog, Échap, focus trap) · ErrorBoundary.jsx
│   ├── modals/             # Settings.jsx · Profile.jsx · Suggestions.jsx (modales transverses)
│   ├── hooks/useStorage.js # useSyncExternalStore sur lib/storage.js
│   └── utils/              # mergeThemes.js · downloadJson.js
├── lib/                    # PUR (pas de React) : 27 modules, imports directs (pas de barrel)
│   └── storage.js          # STORAGE_KEYS (17 clés voltquiz_*), STORAGE_MODE, read/write/remove,
│                           #   subscribe/notify, preloadFromServer
│       repositories.js     # 1 repo par clé STORAGE_KEYS (RecordsRepo, XpRepo, GamesRepo...)
│       nav.js              # currentOrigin / readUrlParam / rechargerPage (R5)
│       scoring, draw, dates, streak, xp, series, texte, records, submissions, reports,
│       suggestions, exclusions, game-history, reset, prefs, schema (zod), api (client
│       fetch V2), accounts, moderation, badges, titles, similarity, avatar, share, sounds
├── styles/                 # ~35 modules CSS (tokens.css, palette.css, boutons, accueil,
│                           #   partie, ..., accessibilite.css)
└── data/                   # 263 fichiers questions-*.js INCHANGÉS + questions.js (glob lazy
                            #   + loadThemes) + theme-manifest.js (généré par scripts/gen-manifest.mjs)
```

Alias Vite/Vitest : `@app` `@lib` `@shared` `@features` `@data` `@` -> `src/...`.

## Politique TypeScript

Tout le code applicatif est en **TypeScript** (`src/**/*.{ts,tsx}`, `strict: true` via
`tsconfig.json`, vérifié par `npm run typecheck` en CI). Vite/esbuild compile le TS
nativement : aucun changement de build. Les 263 fichiers `src/data/questions-*.js`
restent en **JS pur** (règle 7) : leur forme est déclarée dans `src/data/questions.d.ts`
et validée au runtime par zod (`src/lib/schema.ts`, `z.infer` pour les types).
Migration en cours : `allowJs: true` + `checkJs: false`, un fichier converti passe en
strict — c'est le ratchet.

## Règles de dépendance (en ERREUR via ESLint, testées négativement)

- R1 `lib/` n'importe jamais react, `app/`, `features/`, `shared/`.
- R2 `data/` n'importe que `lib/` ; `lib/` n'importe jamais `data/`.
- R3 `shared/` n'importe que `lib/` + react (+ `shared/` en interne).
- R4 `features/X` n'importe que react, `lib/`, `shared/`, et depuis `app/` UNIQUEMENT
  `urlFlags.js` + `contexts/` (lecture seule) — jamais `features/Y`.
- R5 aucun composant ne touche `localStorage`/`sessionStorage`/`location`/`window.location`
  (-> `lib/storage.js`, `lib/nav.js`, `app/urlFlags.js` uniquement ; exemption R5
  restreinte à ces 3 fichiers).
- R6 pas d'import circulaire (madge, `npm run lint:arch`) ; 1 fichier = 1 responsabilité ;
  plafond indicatif 200 L **souple** (un fichier peut dépasser si les lignes ont du sens
  ensemble, ex. `Icon.jsx`, `sounds.js`).
- R9 3 contexts max, consommés via hooks (`useSession`/`usePrefs`/`useThemes`).
- R10 routing par état (`useNavigation`), PAS de react-router d'URL (compatible PWA + Capacitor).
- ESLint : **0 erreur ET 0 warning** tolérés (`npm run lint`) — `no-console` error,
  `react-hooks/rules-of-hooks` error, `exhaustive-deps`/`only-export-components`/`no-unused-vars` warn.

## Chargement lazy (deux niveaux)

- **Écrans** : `routes.js` = `React.lazy` par écran + `<Suspense>` global dans `App.jsx`
  (fallback « Chargement… ») ; `useNavigation` en `startTransition` garde l'écran
  précédent visible pendant le chargement.
- **Questions** : `src/data/questions.js` découpe les 263 fichiers `questions-*.js` en
  chunks (~10 Ko chacun) via `import.meta.glob` non eager, MAIS `loadThemes()` charge
  TOUS les chunks au démarrage (voir `docs/questions.md`). La PWA précache tous les
  chunks -> hors-ligne OK.

## Accessibilité

- `styles/accessibilite.css` : `:focus-visible` (halo 3 px, `currentColor` sur fonds accent),
  `prefers-reduced-motion` (coupe animations/transitions), thèmes clair/daltonien/dys.
- Contraste audité (script WCAG) : texte `#141414` sur fonds sable `accent1`, ratios >= 4.5:1.
