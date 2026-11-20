# Stack & architecture

## Stack

| Outil | Rôle |
|---|---|
| React 18 | librairie d'interface |
| Vite 6 | dev server + build |
| vite-plugin-pwa | WPA installable + hors-ligne (workbox, precache des chunks) |
| @cloudflare/vite-plugin + wrangler | déploiement Workers (`worker.js`, `wrangler.toml`) |
| Vitest + Testing Library + jsdom | tests (`vitest.config.js` séparé de `vite.config.js`) |
| ESLint flat + Prettier + madge | lint, format, détection d'imports circulaires (`npm run lint:arch`) |
| zod | validation des données externes (`src/lib/schema.js`) |

## Arborescence réelle

```
src/
├── main.jsx                  # StrictMode + ErrorBoundary + registerSW + <App/>
├── app/                      # shell
│   ├── App.jsx               # composition seule (~180 L) : providers + flags + routes
│   ├── AppProviders.jsx      # SessionProvider + PrefsProvider + ThemesProvider
│   ├── routes.js             # table écran -> composant
│   ├── useNavigation.js      # { ecran, config, resultat, allerVers, demarrer, terminer }
│   ├── useCelebration.js     # snapshot badges/titres -> animation de déblocage
│   ├── urlFlags.js           # SEUL accès à window.location (?admin ?reset ?resetcompte ?tuto)
│   └── contexts/             # SessionContext.js · PrefsContext.js · ThemesContext.js (3 max)
├── features/                 # UNE feature = UN dossier autonome
│   ├── partie/               # Partie.jsx (render) + usePartie.js + useMinuteur.js + tirage.js
│   │                         # + constantes.js + composants/ (7 sous-composants)
│   └── resultat/             # Resultat.jsx (render) + persistance.js + statsPartie.js
│                             # + usePartage.js + composants/PartageModal.jsx
├── shared/                   # transversal : hooks/useStockage.js · utils/ (fusionThemes, telechargerJSON)
├── lib/                      # PUR (pas de React/DOM hors sons.js) : storage.js (CLES + lire/ecrire)
│                             # + prefs, scoring, tirage, dates, streak, xp, series, texte, records,
│                             # soumissions, signalements, suggestions, exclusions, parties-historique,
│                             # reset, schema (zod), api (client V2) + comptes, moderation, badges,
│                             # titres, similarite, avatar, partage, sons + index.js (barrel)
├── components/               # écrans restants (en cours de migration vers features/) + Icone.jsx
└── data/                     # 263 fichiers questions-*.js INCHANGÉS + questions.js (lazy)
                              # + manifest-themes.js (généré par scripts/gen-manifest.mjs)
```

Alias Vite/Vitest : `@app` `@lib` `@shared` `@features` `@data` `@` -> `src/...`.

## Règles de dépendance (vérifiées par ESLint + madge en CI)

- R1 `lib/` n'importe jamais react/components/features/shared/app.
- R2 `data/` n'importe que `lib/` ; `lib/` n'importe jamais `data/`.
- R3 `shared/` n'importe que `lib/` + react.
- R4 `features/X` n'importe que react, `lib/`, `shared/`, `app/contexts/` — jamais `features/Y`.
- R5 aucun composant ne touche `localStorage`/`document`/`window.location` (-> `lib/storage.js`, `app/urlFlags.js`).
- R6 pas d'import circulaire ; 1 fichier = 1 responsabilité ; plafond 200 L.
- R9 3 contexts max, consommés via hooks (`useSession`/`usePrefs`/`useThemes`).
- R10 routing par état (`useNavigation`), PAS de react-router d'URL (compatible WPA + Capacitor).

## Données de questions lazy

`src/data/questions.js` : `import.meta.glob('./questions-*.js')` NON eager -> chaque fichier
est un chunk (~10 Ko) chargé à la demande par `chargerThemes()` (async). Chunk initial ~295 Ko
(avant : 2,69 Mo). `THEMES_META` (métadonnées seules) vient du manifeste généré. La WPA
precache tous les chunks (workbox, plafond 8 Mo) -> hors-ligne OK.
