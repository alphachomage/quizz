# Stack & architecture

## Stack

| Outil | Rôle |
|---|---|
| React 18 | librairie d'interface |
| Vite 6 | dev server + build |
| vite-plugin-pwa | WPA installable + hors-ligne (workbox, precache des chunks) |
| @cloudflare/vite-plugin + wrangler | déploiement Workers (`worker.js`, `wrangler.toml`) |
| Vitest + Testing Library + jsdom | tests (`vitest.config.js` séparé de `vite.config.js`) |
| ESLint flat + Prettier + madge | lint (règles R1-R5 en erreur), format, imports circulaires (`npm run lint:arch`) |
| zod | validation des données externes (`src/lib/schema.js`) |

## Arborescence réelle

```
src/
├── main.jsx                  # StrictMode + ErrorBoundary + registerSW + prechargerDepuisServeur() + <App/>
├── styles.css                # UNIQUEMENT des @import vers styles/ (ordre = cascade conservée)
├── app/                      # shell
│   ├── App.jsx               # composition seule (~180 L) : Suspense + providers + flags + routes
│   ├── AppProviders.jsx      # SessionProvider + PrefsProvider + ThemesProvider
│   ├── routes.js             # écrans en React.lazy (1 chunk JS par écran)
│   ├── useNavigation.js      # routing par état, setState en startTransition (pas de flash au chargement)
│   ├── useCelebration.js     # snapshot badges/titres -> animation de déblocage
│   ├── urlFlags.js           # flags URL + redirigerVers (réexporte lireParamUrl de lib/nav.js)
│   └── contexts/             # SessionContext.js · PrefsContext.js · ThemesContext.js (3 max)
├── features/                 # UNE feature = UN dossier autonome (jamais d'import features/X -> features/Y, R4)
│   ├── accueil/              # Accueil.jsx (render) + useAccueil.js + composants/ (BarreUser, ModesTabs,
│   │                         #   BanniereBadge, NomsDuel, GrilleThemes, ModaleNiveau, CtaFixe)
│   ├── admin/ · badges/ · classement/ · compte/ · deblocage/ · formulaire/ · tuto/
│   ├── partie/               # Partie.jsx (render) + usePartie.js + useMinuteur.js + tirage.js
│   │                         # + constantes.js + composants/ (7 sous-composants)
│   ├── resultat/             # Resultat.jsx (render) + persistance.js + statsPartie.js + usePartage.js
│   │                         # + composants/PartageModal.jsx
│   └── stats/                # Stats.jsx (render) + statsCalculs.js (fonctions pures testées)
├── shared/                   # transversal (n'importe que lib/ + react, R3)
│   ├── ui/                   # Icone.jsx (SVG, zéro emoji) · Modal.jsx (modale accessible unique :
│   │                         #   role=dialog, Échap, focus trap) · ErrorBoundary.jsx
│   ├── modales/              # Parametres.jsx · Profil.jsx · Suggestions.jsx (modales transverses)
│   ├── hooks/useStockage.js  # useSyncExternalStore sur lib/storage.js
│   └── utils/                # fusionThemes.js · telechargerJSON.js
├── lib/                      # PUR (pas de React) : storage.js (CLES + MODE_STOCKAGE + lire/ecrire)
│                             # + repositories.js (1 repo par clé CLES) + nav.js (window.location, R5)
│                             # + prefs, scoring, tirage, dates, streak, xp, series, texte, records,
│                             # soumissions, signalements, suggestions, exclusions, parties-historique,
│                             # reset, schema (zod), api (client fetch V2) + comptes, moderation, badges,
│                             # titres, similarite (index pré-calculé), avatar, partage, sons + index.js (barrel)
├── styles/                   # 30 modules CSS (tokens, boutons, accueil, partie, ..., accessibilite)
└── data/                     # 263 fichiers questions-*.js INCHANGÉS + questions.js (lazy)
                              # + manifest-themes.js (généré par scripts/gen-manifest.mjs)
```

Alias Vite/Vitest : `@app` `@lib` `@shared` `@features` `@data` `@` -> `src/...`.

## Règles de dépendance (en ERREUR via ESLint `no-restricted-imports`, testées négativement)

- R1 `lib/` n'importe jamais react, `app/`, `features/`, `shared/`.
- R2 `data/` n'importe que `lib/` ; `lib/` n'importe jamais `data/`.
- R3 `shared/` n'importe que `lib/` + react (+ `shared/` en interne).
- R4 `features/X` n'importe que react, `lib/`, `shared/`, et depuis `app/` UNIQUEMENT
  `urlFlags.js` + `contexts/` (lecture seule) — jamais `features/Y`.
- R5 aucun composant ne touche `localStorage`/`sessionStorage`/`window.location`/`window.history`
  (-> `lib/storage.js`, `lib/nav.js`, `app/urlFlags.js` uniquement ; `no-restricted-globals`
  + `no-restricted-properties` en error).
- R6 pas d'import circulaire (madge) ; 1 fichier = 1 responsabilité ; plafond 200 L/composant.
- R9 3 contexts max, consommés via hooks (`useSession`/`usePrefs`/`useThemes`).
- R10 routing par état (`useNavigation`), PAS de react-router d'URL (compatible WPA + Capacitor).

## Chargement lazy (deux niveaux)

- **Écrans** : `routes.js` = `React.lazy` par écran + `<Suspense>` global dans `App.jsx`
  (fallback « Chargement… ») ; `useNavigation` en `startTransition` garde l'écran précédent
  visible pendant le chargement. Bundle initial ~170 Ko (avant : 2,69 Mo).
- **Questions** : `src/data/questions.js` : `import.meta.glob('./questions-*.js')` non eager
  -> chaque fichier est un chunk (~10 Ko) chargé à la demande par `chargerThemes()` (async).
  `THEMES_META` vient du manifeste généré. La WPA precache tous les chunks -> hors-ligne OK.

## Accessibilité

- `styles/accessibilite.css` : `:focus-visible` (halo 3 px, `currentColor` sur fonds accent),
  `prefers-reduced-motion` (coupe animations/transitions), thèmes clair/daltonien/dys.
- Contraste audité (script WCAG) : texte `#141414` sur fonds sable `accent1`, ratios >= 4.5:1.
