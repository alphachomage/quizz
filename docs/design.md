# Design

## Règles absolues

- **Aucun emoji** nulle part (UI ni doc). Toutes les icônes sont des SVG 24x24 dans
  `src/shared/ui/Icon.tsx` (duotone : forme pleine `currentColor` + détails découpés
  via `--couleur` du parent).
- **Palette 60-30-10, AUCUN dégradé** (`linear-gradient` interdit, vérifié par grep en review).
  60 % fond, 30 % cartes, 10 % accent. Texte foncé `#141414` sur les fonds accent.
- UI 100 % en français. Code en anglais, commentaires en français.

## Palette ACTIVE « sobre » (`:root` de `src/styles/tokens.css`, `body.theme-clair` de `src/styles/palette.css`)

| Rôle | Sombre | Clair |
|---|---|---|
| fond (`--fond`) | `#000000` | `#FFFFFF` |
| cartes (`--carte` / `--carte-2`) | `#26262B` / `#1D1D23` | `#ECECF1` / `#E2E2E9` |
| accent (`--accent1`, PEPS) | `#D9D0B8` | `#D9D0B8` |
| texte | `--texte #ECECEC`, `--texte-doux #9C9C94` | `--texte #1A1A1A`, `--texte-doux #6E6E6E` |
| bordure | `rgba(255,255,255,0.14)` | `rgba(0,0,0,0.14)` |

Manifest PWA + `theme-color` : `#000000`. Ombres neutres `rgba(0,0,0,...)`.

### Palette « vivante » archivée (pour plus tard)

Pour restaurer l'ancienne palette « vivante », recopier ces valeurs dans `:root` de
`src/styles/tokens.css` et `body.theme-clair` de `src/styles/palette.css` :
sombre = cartes `#A48DFF` / `#8f78f0`, clair = cartes `#2D5BFF` / `#1f47d6`,
accent `#FFD60A` (les deux), texte sombre `#f5f2ea` / `#b3ad9e`, texte clair `#141414` /
`#5c5c5c`, texte sur carte `#ffffff` / `rgba(255,255,255,0.78)`, bordures
`rgba(255,255,255,0.22)` / `rgba(0,0,0,0.25)`, et ombres violettes
`rgba(139,92,246,0.4/0.5/0.22/0.16/0.12)` + `drop-shadow(0 8px 30px rgba(139,92,246,0.5))`.

## Couleurs des 14 thèmes en fichiers (identiques dans les deux palettes — ne jamais inventer)

12 thèmes actifs + 2 retirés du jeu (insolite, pop-culture — questions reclassées,
voir `docs/questions.md`). Source de vérité : `npm run count:questions` + `src/data/theme-manifest.js`.

| Thème (id) | Couleur | Dans le jeu |
|---|---|---|
| cinema-series | `#fb7185` | oui |
| cuisine | `#fb923c` | oui |
| culture-generale | `#818cf8` | oui |
| espace | `#818cf8` | oui |
| geographie | `#2dd4bf` | oui |
| histoire | `#a3e635` | oui |
| insolite | `#fb923c` | non (retiré) |
| jeux-videos | `#38bdf8` | oui |
| mangas-animes | `#f472b6` | oui |
| musique | `#a78bfa` | oui |
| mythologie | `#fbbf24` | oui |
| pop-culture | `#e879f9` | non (retiré) |
| sciences | `#2dd4bf` | oui |
| sport | `#4ade80` | oui |
| technologie | `#38bdf8` | oui (ajout 2026-11) |
| nature | `#4ade80` | oui (ajout 2026-11) |
| economie | `#fbbf24` | oui (ajout 2026-11) |
| auto | `#fb7185` | oui (ajout 2026-11) |

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

## Refonte design en profondeur

### Architecture CSS

- `src/styles.css` ne fait que des `@import` vers les 30 modules de `src/styles/`, **dans un
  ordre précis qui est la cascade** : ne jamais le réordonner (voir liste ci-dessous).
- `src/styles/tokens.css` (importé en premier) : **seul endroit où vivent les valeurs brutes**
  (couleurs, rayons, ombres, durées, z-index, espacements, flous). C'est le levier principal
  d'une refonte globale.
- Un fichier CSS par écran / feature (`accueil.css`, `partie.css`, `resultat.css`,
  `classement.css`, `stats.css`, `badges.css`, `profil.css`, `formulaire.css`, `partage.css`,
  `modes.css`, `parametres.css`, `tuto.css`, `propositions.css`, `signaler.css`,
  `deblocage.css`, `streak.css`, `suggestions.css`, `cta-fixe.css`, `epure.css`, `mobile.css`,
  `animations.css`, `modale-niveau.css`, `partie-points.css`, `classement-filtres.css`,
  `accueil-extras.css`, `stats-avancees.css`, `boutons.css`).
- `src/styles/palette.css` : surcharges du **thème clair** (`body.theme-clair`) + règles
  transverses de contraste (texte foncé sur fond accent).
- `src/styles/accessibilite.css` (importé parmi les derniers) : mode **daltonien** (palette
  Okabe-Ito, couleurs en dur intentionnelles), mode **dys**, halo `:focus-visible` WCAG 2.4.7
  et `prefers-reduced-motion` — ces overrides doivent rester après les fichiers de feature.

### Changer le look global : ne toucher (presque) que `tokens.css`

Familles de tokens dans `:root` de `tokens.css` :

| Famille | Exemples de tokens |
|---|---|
| Palette 60-30-10 | `--fond`, `--carte`, `--carte-2`, `--bordure`, `--texte`, `--texte-doux`, `--accent1`, `--accent2`, `--or` |
| Couleurs à alpha | `--accent-08` … `--accent-95`, `--erreur-12/14/15/40/50`, `--succes-15`, `--desactive-*`, `--blanc-doux`, `--blanc-40`, `--bordure-fine`, `--bordure-foncee`, `--voile-modal` |
| Sémantique | `--texte-sur-accent` (`#141414` sur fond accent, WCAG AA), `--blanc`, `--succes`, `--succes-fond`, `--erreur`, `--erreur-fort`, `--erreur-texte`, `--erreur-fond` |
| Rayons | `--radius-pilule` (999px), `--radius-carte` (26px), `--radius-grand/moyen/petit/mini/micro`, `--radius-rond` (50%), `--radius-2/9/11/15/16/28` |
| Ombres (neutres `rgba(0,0,0,…)`, jamais colorées) | `--ombre-3d`, `--ombre-petite`, `--ombre-moyenne`, `--ombre-carte`, `--ombre-bouton(-hover)`, `--ombre-modal`, `--filtre-glow` |
| Durées | `--dur-rapide` (0.12s), `--dur-court` (0.15s), `--dur-moyen` (0.2s), `--dur-pop` (0.25s), `--dur-standard` (0.3s), `--dur-demi` (0.5s), `--dur-lent` (0.6s) |
| Z-index | `--z-infobulle` 5, `--z-fixe` 40, `--z-confettis` 50, `--z-gain` 60, `--z-modal` 100 |
| Espacements (nommés en px) | `--esp-2` … `--esp-24` (`--esp-8` = 8px) |
| Divers | `--flou-carte`, `--flou-modal` |

Pour le **thème clair**, surcharger les mêmes variables dans `body.theme-clair`
(dans `palette.css`) : `--fond #FFFFFF`, `--carte #ECECF1`, `--carte-2 #E2E2E9`,
`--texte #1A1A1A`, `--texte-doux #595959`, `--bordure rgba(0,0,0,0.14)`, etc.

Règle d'or : **dans les fichiers de feature, jamais de valeur en dur** — uniquement
`var(--…)` (grep de contrôle en review : `#[0-9a-fA-F]{3}` hors `tokens.css`/`palette.css`/
`accessibilite.css` doit renvoyer zéro résultat hors commentaires).

### Changer une feature : toucher son fichier CSS

Ex. refondre l'écran de jeu -> `partie.css` (+ `propositions.css`, `partie-points.css`),
l'accueil -> `accueil.css` + `accueil-extras.css`, etc. Un écran = un fichier, plafond
indicatif 200 lignes par fichier (souple, voir AGENTS.md).

### Règles à respecter pendant la refonte

- **60-30-10** et **AUCUN dégradé** (`grep -rn "gradient" src/styles src/styles.css` = 0).
- **Aucun emoji** (UI et doc).
- **Contraste WCAG AA** : texte foncé `--texte-sur-accent` sur tout fond accent ; ne jamais
  mettre de blanc sur le sable `#D9D0B8`.
- Thème **clair**, **daltonien** (Okabe-Ito) et **dys** couverts par `palette.css` /
  `accessibilite.css` ; `prefers-reduced-motion` aussi — ne pas casser ces overrides.
- Couleurs des 12 thèmes : ne jamais inventer (tableau ci-dessus) ; elles posent la variable
  `--couleur` par thème.
- Ombres toujours neutres ; z-index via les tokens ; `prefers-reduced-motion` et
  `.sans-animations` doivent pouvoir tout couper.
- **Noms de classes CSS encore en français** pour l'instant (ex. `.btn-principal`,
  `.reponse`) : ils seront renommés en anglais lors de la refonte (règle AGENTS.md n°2).
  Ne pas renommer en douce dans un coin : le faire globalement, avec un codemod JSX+CSS.

### Ordre des `@import` de `src/styles.css` à préserver (cascade)

`tokens, boutons, accueil, partie, animations, mobile, formulaire, propositions,
classement, modes, parametres, tuto, resultat, stats, partie-points, classement-filtres,
signaler, accessibilite, palette, streak, badges, profil, partage, epure, suggestions,
deblocage, cta-fixe, stats-avancees, modale-niveau, accueil-extras`

Pourquoi : des modules se surchargent volontairement (`modes.css` après `accueil.css` pour
`.mode-tab`, `palette.css` et `accessibilite.css` en dernier pour l'emporter sur tout).
Vérifié avant/après chaque commit par `npm run lint && npm test && npm run build`.

### Valeurs en dur restantes admises (audit)

- Tailles de police, paddings composés (`12px 14px`), largeurs/hauteurs de composants,
  `border-radius: 3px 3px 0 0` (barres du graphique) : spécifiques à chaque composant.
- Durées d'animation one-off des keyframes (0.08s–1.6s, 1s du minuteur) : dans le fichier
  concerné.
- `accessibilite.css` : palette Okabe-Ito du mode daltonien, `#3A3A3A` (focus en thème clair),
  `#ffffff`/`#111111` (lettres daltonien) — intentionnels.
- `src/lib/share.ts` : l'image "story" est dessinée en canvas (pas de var() CSS) avec la
  palette sobre en dur (`#000000`, `#26262B`, `#D9D0B8`, `#ECECEC`, `#9C9C94`) — à
  synchroniser avec `tokens.css` si la palette change.
- `src/features/game/Game.tsx` : barre de points en dur (`#2fd27a` / `#FFD60A` / `#ff5d73`)
  — candidat à migrer vers des tokens (hors périmètre de cette passe).
