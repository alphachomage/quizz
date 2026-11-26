# Ajouter des questions ou un thème — guide pas à pas

Ce guide explique comment enrichir le corpus **proprement**. Le corpus est du JSON dans
`content/` (voir `docs/questions.md`) ; tout est automatique ensuite (manifeste, IndexedDB, PWA).

> Règle d'or (règle 7 de `AGENTS.md`) : les **ids** des questions existantes ne sont
> jamais modifiés ni réattribués, et l'**ordre** des questions ne change jamais (le Quizz
> du jour en dépend) : on AJOUTE en fin de fichier de thème. Corriger ou supprimer une
> question existante est permis dans une branche relue, en conservant l'id des autres.
> L'ancien format (fichiers `questions-*.js` dans `src/data/`) est refusé par `npm run lint`.
> (L'import par lots via `inbox/` viendra dans une étape ultérieure.)

---

## 1. Ajouter des questions à un thème existant

### Étape 1 — ajouter les objets en fin de `content/questions/<theme-id>.json`

Une question par ligne, juste avant la fin du tableau `questions` (sans `id`) :

```json
    {"q":"En quelle année a eu lieu la Révolution française ?","reponses":["1789","1815","1848","1914"],"bonne":0,"niveau":"facile","info":"Le 14 juillet 1789, prise de la Bastille."},
    {"q":"Qui était le premier empereur romain ?","reponses":["Jules César","Auguste","Néron","Caligula"],"bonne":1,"niveau":"moyen"}
```

(Penser à la virgule après l'objet qui était le dernier ; le dernier objet n'a pas de virgule.)

### Étape 2 — attribuer les ids

```bash
npm run questions:ids     # donne un id aux questions qui n'en ont pas, sans toucher aux autres
```

### Étape 3 — respecter le format (validé par zod, `src/lib/schema.ts`)

| Champ | Règle |
|---|---|
| `id` | attribué par `npm run questions:ids` (`<theme>-<hex>`), unique, **jamais modifié** |
| `q` | texte de la question, 4 à 500 caractères |
| `reponses` | 2 à 4 réponses, chacune 1 à 200 caractères |
| `bonne` | index de la bonne réponse, **0-based** (`0` = première réponse) et `< reponses.length` |
| `niveau` | obligatoire : `"facile"` \| `"moyen"` \| `"dur"` |
| `info` | anecdote optionnelle (max 1000 caractères), affichée après la réponse |

Clés en français (`q`, `reponses`, `bonne`, `niveau`, `info`, `nom`, `icone`, `couleur`) :
c'est le format JSON documenté du client, ne pas les traduire.

### Étape 4 — vérifier

```bash
npm run count:questions   # compte le nouveau total + détecte les doublons exacts
npm run test:data         # structure de content/ + schéma zod de TOUT le corpus (0 invalide attendu)
npm run lint && npm run typecheck && npm test
```

### Étape 5 — commit

```bash
git add content/
git commit -m "feat(questions): +10 questions histoire"
```

C'est tout. Au prochain `npm run dev` / `npm run build` (Vite lance automatiquement
les deux scripts au démarrage) :
- `scripts/gen-manifest.mjs` régénère `theme-manifest.js` **avec un nouveau
  `CORPUS_VERSION`** (hash de `content/`) -> le cache IndexedDB des joueurs est
  invalidé automatiquement, ils reçoivent les nouvelles questions au prochain
  lancement ;
- `scripts/gen-corpus-json.mjs` régénère `public/corpus.json` (tout le corpus servi
  en un seul JSON minifié, avec la même version) -> servi en 1 requête
  et **précaché par la PWA** (hors-ligne OK) ;
- les fichiers `content/questions/*.json` restent découpés en chunks par le bundler
  (repli si `corpus.json` est indisponible).

---

## 2. Créer un NOUVEAU thème

### Étape 1 — choisir id, icône, couleur (ne JAMAIS inventer de couleur)

- **id** : minuscules, chiffres et tirets uniquement (ex. `astronomie`). Le schéma
  zod impose `/^[a-z0-9-]+$/`.
- **icone** : nom d'une icône SVG existante dans `src/shared/ui/Icon.tsx` :

  `bolt, sun, eye, share, timer, swords, globe, film, music, ball, gamepad, sparkles,
  question, pin, podium, trophy, home, replay, device, star, check, x, plus, download,
  trash, alert, pencil, user, logout, sliders, chart, skull, calendar, vibrate, flame,
  temple, flask, planet, utensils, thumbsdown, book, scroll`

- **couleur** : reprendre une couleur d'un thème existant (table ci-dessous, identique
  dans `docs/design.md`) — **aucune couleur inventée** hors de cette liste :

  | Couleur | Exemples de thèmes |
  |---|---|
  | `#fb7185` | cinema-series |
  | `#fb923c` | cuisine |
  | `#818cf8` | culture-generale, espace |
  | `#2dd4bf` | geographie, sciences |
  | `#a3e635` | histoire |
  | `#38bdf8` | jeux-videos |
  | `#f472b6` | mangas-animes |
  | `#a78bfa` | musique |
  | `#fbbf24` | mythologie |
  | `#e879f9` | (pop-culture, retiré) |
  | `#4ade80` | sport |

### Étape 2 — créer le thème

1. Ajouter une ligne en fin de `content/themes.json` (l'ordre des thèmes est significatif) :

```json
  {"id":"astronomie","nom":"Astronomie","icone":"planet","couleur":"#818cf8","actif":true}
```

2. Créer le fichier `content/questions/<id>.json` (ici `astronomie.json`) :

```json
{
  "theme": "astronomie",
  "questions": [
    {"q":"Combien de planètes dans le système solaire ?","reponses":["7","8","9","10"],"bonne":1,"niveau":"facile"}
  ]
}
```

3. `npm run questions:ids` pour attribuer les ids (au moins 1 question par niveau recommandé).

### Étape 3 — vérifier + commit (idem §1 étapes 4-5)

Le thème apparaîtra automatiquement dans la grille d'accueil (via `theme-manifest.js`)
et sera jouable dans tous les modes. Pense à remplir **les 3 niveaux** pour que le
mode Solo ait un pool suffisant par difficulté.

---

## 3. Ce qui est AUTOMATIQUE (pas besoin d'y toucher)

| Mécanisme | Quand |
|---|---|
| `theme-manifest.js` régénéré (métadonnées + `CORPUS_VERSION`) | auto au démarrage de Vite (`npm run dev`, `npm run build`, `npm run deploy` : plugin `generateCorpus` de `vite.config.ts`), ou à la main `npm run gen:manifest` |
| Invalidation du cache IndexedDB des joueurs | auto : `CORPUS_VERSION` (hash de `content/`) change dès qu'un fichier de `content/` change |
| `public/corpus.json` (tout le corpus servi, précaché PWA = hors-ligne) | auto au build (`scripts/gen-corpus-json.mjs`) ; les chunks `content/questions/*.json` restent servis en ligne pour le repli mais ne sont pas précachés |
| Validation du schéma (zod) + ids uniques | `npm run test:data` + test auto dans `npm test` |
| Détection de doublons exacts | `npm run count:questions` (le nombre ne doit jamais augmenter) |
| Modération in-app (propositions des joueurs) | bouton « Proposer une question » (niveau 3 requis), validation dans `?admin=1` |

---

## 4. Checklist avant commit

- [ ] Ajouts en fin de fichier de thème uniquement : `git diff content/` ne montre que des lignes ajoutées (ou des corrections voulues), aucun id existant modifié, aucune question déplacée
- [ ] `npm run questions:ids` lancé (aucune question sans id)
- [ ] Format respecté : 2-4 réponses, `bonne` < `reponses.length`, `niveau` renseigné
- [ ] Couleur reprise d'un thème existant, icône existante dans `Icon.tsx`
- [ ] `npm run count:questions` : total augmenté, 0 invalide, doublons pas en hausse
- [ ] `npm run test:data` vert
- [ ] `npm run lint` + `npm run typecheck` + `npm test` verts
- [ ] `CHANGELOG.md` a une entrée (section « Non publié »)

---

## 5. Questions des joueurs (hors corpus intégré)

Deux façons **sans toucher aux fichiers source** :

1. **Dans l'appli** : « Proposer une question » (niveau 3 du thème requis) →
   détection de similarité → validation manuelle dans `?admin=1` → jouable.
   Synchronisée cross-device via la table D1 `soumissions`.
2. **Fichier perso** : `public/questions-utilisateur.json` (même format, validé par
   zod au chargement). Pratique pour tester ses questions avant de les proposer.

Voir `docs/questions.md` pour le détail.

---

## 6. Ajouts en masse (vagues de sous-agents) et dédoublonnage

Méthode utilisée pour monter chaque thème vers son objectif :

- un pack de départ écrit à la main, puis des **vagues** de sous-agents qui ajoutent
  environ 50 questions par lot en fin de `content/questions/<theme>.json` ;
- avant chaque lot, donner au sous-agent la liste normalisée des questions existantes
  du thème (anti-doublon) et lui imposer le format de la section 1 ;
- après chaque vague : `npm run questions:ids` puis `npm run count:questions` (doublons pas en hausse, 0 invalide).

Dédoublonnage exact : `node scripts/dedupe-questions.mjs` supprime les doublons (même
question normalisée dans le même thème, même règle que `count:questions`), garde la
première occurrence (avec son id) et réécrit uniquement les fichiers de thème concernés.
Relire le diff git et le noter dans `CHANGELOG.md`.

Un nouveau thème s'accompagne de titres (`TITLES_PER_THEME`, `src/lib/titles.ts`) et de
badges (`themeLevels`, `src/lib/badges.ts`) dédiés, et d'une icône dans `src/shared/ui/Icon.tsx`.

