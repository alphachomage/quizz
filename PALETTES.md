# Palettes de couleurs VoltQuiz

Deux palettes sont documentées ici. UNE SEULE est active à la fois dans `src/styles.css`.

## Palette ACTUELLE : « sobre » (active depuis la demande client)

Règle 60-30-10, aucun dégradé.

| Rôle | Sombre | Clair (`body.theme-clair`) |
|---|---|---|
| 60 % fond (`--fond`) | `#000000` | `#FFFFFF` |
| 30 % cartes (`--carte` / `--carte-2`) | `#26262B` / `#1D1D23` | `#ECECF1` / `#E2E2E9` |
| 10 % accent PEPS (`--accent1`/`--accent2`/`--or`) | `#D9D0B8` (sable doux) | `#D9D0B8` |
| texte | `--texte #ECECEC`, `--texte-doux #9C9C94` | `--texte #1A1A1A`, `--texte-doux #6E6E6E` |
| texte sur carte | `#F4F4F2` / `rgba(255,255,255,0.62)` | `#1A1A1A` / `rgba(0,0,0,0.6)` |
| bordure | `rgba(255,255,255,0.14)` | `rgba(0,0,0,0.14)` |

Texte foncé `#141414` sur les fonds accent (boutons, onglets actifs) — inchangé.
Ombres violettes remplacées par des ombres neutres `rgba(0,0,0,...)` / `rgba(128,128,128,...)`.
Manifest WPA + meta theme-color : `#000000` (inchangé).

## Palette « vivante » (SAUVEGARDÉE pour plus tard — à restaurer en recopiant ces valeurs dans `:root` et `body.theme-clair` de `src/styles.css`)

Règle 60-30-10, aucun dégradé.

| Rôle | Sombre | Clair (`body.theme-clair`) |
|---|---|---|
| 60 % fond (`--fond`) | `#000000` | `#FFFFFF` |
| 30 % cartes (`--carte` / `--carte-2`) | `#A48DFF` (violet) / `#8f78f0` | `#2D5BFF` (bleu) / `#1f47d6` |
| 10 % accent PEPS (`--accent1`/`--accent2`/`--or`) | `#FFD60A` (jaune) | `#FFD60A` |
| texte | `--texte #f5f2ea`, `--texte-doux #b3ad9e` | `--texte #141414`, `--texte-doux #5c5c5c` |
| texte sur carte | `#ffffff` / `rgba(255,255,255,0.78)` | `#ffffff` / `rgba(255,255,255,0.78)` |
| bordure | `rgba(255, 255, 255, 0.22)` | `rgba(0, 0, 0, 0.25)` |

Ombres/glows violets de la palette vivante (à restaurer aussi) :
`box-shadow: 0 10px 26px rgba(139, 92, 246, 0.4)` et `0 14px 32px rgba(139, 92, 246, 0.5)` (btn-principal),
`0 10px 24px rgba(139, 92, 246, 0.5)` (ligne ~260), `rgba(139, 92, 246, 0.22)` (fond ~1321),
`rgba(139, 92, 246, 0.12)` + bordure `rgba(139, 92, 246, 0.35)` (~1341-1342),
bordure `rgba(139, 92, 246, 0.4)` (~1413), fond `rgba(139, 92, 246, 0.16)` (~1613),
`drop-shadow(0 8px 30px rgba(139, 92, 246, 0.5))` (~1878).

## Couleurs des 12 thèmes (identiques dans les deux palettes — badges de l'identité des thèmes)

| Thème (id) | Couleur |
|---|---|
| cinema-series (Cinéma & Séries) | `#fb7185` |
| cuisine (Cuisine) | `#fb923c` |
| culture-generale (Culture générale) | `#818cf8` |
| espace (Espace) | `#818cf8` |
| geographie (Géographie) | `#2dd4bf` |
| histoire (Histoire) | `#a3e635` |
| jeux-videos (Jeux vidéos) | `#38bdf8` |
| mangas-animes (Mangas & Animés) | `#f472b6` |
| musique (Musique) | `#a78bfa` |
| mythologie (Mythologie) | `#fbbf24` |
| sciences (Sciences) | `#2dd4bf` |
| sport (Sport) | `#4ade80` |
