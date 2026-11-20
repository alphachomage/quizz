# Design

## Règles absolues

- **Aucun emoji** nulle part (UI ni doc). Toutes les icônes sont des SVG 24x24 dans
  `src/components/Icone.jsx` (duotone : forme pleine `currentColor` + détails découpés
  via `--couleur` du parent).
- **Palette 60-30-10, AUCUN dégradé** (`linear-gradient` interdit, vérifié par grep en review).
  60 % fond, 30 % cartes, 10 % accent. Texte foncé `#141414` sur les fonds accent.
- UI 100 % en français.

## Palette ACTIVE « sobre » (dans `:root` et `body.theme-clair` de `src/styles.css`)

| Rôle | Sombre | Clair |
|---|---|---|
| fond (`--fond`) | `#000000` | `#FFFFFF` |
| cartes (`--carte` / `--carte-2`) | `#26262B` / `#1D1D23` | `#ECECF1` / `#E2E2E9` |
| accent (`--accent1`, PEPS) | `#D9D0B8` | `#D9D0B8` |
| texte | `--texte #ECECEC`, `--texte-doux #9C9C94` | `--texte #1A1A1A`, `--texte-doux #6E6E6E` |
| bordure | `rgba(255,255,255,0.14)` | `rgba(0,0,0,0.14)` |

Manifest WPA + `theme-color` : `#000000`. Ombres neutres `rgba(0,0,0,...)`.

La palette « vivante » d'avant (violet `#A48DFF` / bleu `#2D5BFF` / jaune `#FFD60A`, avec
ses ombres `rgba(139,92,246,...)`) est archivée dans `PALETTES.md` : pour la restaurer,
recopier ses valeurs dans `:root` et `body.theme-clair` de `styles.css`.

## Couleurs des 12 thèmes (identiques dans les deux palettes — ne jamais inventer)

| Thème (id) | Couleur |
|---|---|
| cinema-series | `#fb7185` |
| cuisine | `#fb923c` |
| culture-generale | `#818cf8` |
| espace | `#818cf8` |
| geographie | `#2dd4bf` |
| histoire | `#a3e635` |
| jeux-videos | `#38bdf8` |
| mangas-animes | `#f472b6` |
| musique | `#a78bfa` |
| mythologie | `#fbbf24` |
| sciences | `#2dd4bf` |
| sport | `#4ade80` |

## Mise en page actuelle (« épuré »)

Accueil allégé : 4 onglets pilule pour les modes, grille de thèmes en cartes compactes,
choix du niveau en modale au clic sur le thème, gros bouton « C'est parti » fixé en bas
(`.cta-fixe`). Coins très arrondis (pilule `999px`, cartes `26px`), cartes plates sans ombre
ni backdrop-filter, titres fins (weight 400). Pas de compteur de questions côté joueur
(uniquement dans la visu admin `?admin=1`).

## Accessibilité (3 réglages OFF par défaut, classes sur `body` posées par PrefsContext)

- `themeClair` -> `.theme-clair` : thème clair (variables inversées).
- `daltonien` -> `.daltonien` : réponses en palette Okabe-Ito (`#0072B2/#E69F00/#009E73/#D55E00`),
  vrai/faux = bleu/vermillon, lettres A/B/C/D renforcées, contours + icônes coche/croix.
- `dys` -> `.dys` : police Verdana/Tahoma, espacements augmentés, interligne 1.7.

Préférences `animations: false` -> classe `.sans-animations` sur `.app` (tout coupé).
