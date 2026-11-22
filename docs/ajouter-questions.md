# Ajouter des questions ou un thème — guide pas à pas

Ce guide explique comment enrichir le corpus **proprement** : un nouveau fichier à
chaque fois, jamais de modification d'un fichier existant, et les vérifications à
lancer avant de commit. Tout est automatique ensuite (manifest, IndexedDB, PWA).

> Règle d'or (règle 7 de `AGENTS.md`) : **on n'édite JAMAIS un fichier
> `src/data/questions-*.js` existant** — on crée un NOUVEAU fichier. Le corpus est
> fusionné par id de thème : même `id` = questions ajoutées, rien n'est supprimé.

---

## 1. Ajouter des questions à un thème existant

### Étape 1 — créer un nouveau fichier

Nom : `src/data/questions-<theme-id>-<suffixe>.js` (suffixe libre, ex. `-z`, `-v6`).

Exemple pour ajouter 10 questions à `histoire` :

```bash
cat > src/data/questions-histoire-z.js << 'EOF'
// Lot de questions — thème histoire (ajout uniquement, ne jamais éditer un fichier existant).
export const QUESTIONS_HISTOIRE_Z = [
  {
    id: "histoire",
    nom: "Histoire",
    icone: "scroll",
    couleur: "#a3e635",
    questions: [
      { q: "En quelle année a eu lieu la Révolution française ?", reponses: ["1789", "1815", "1848", "1914"], bonne: 0, niveau: "facile", info: "Le 14 juillet 1789, prise de la Bastille." },
      { q: "Qui était le premier empereur romain ?", reponses: ["Jules César", "Auguste", "Néron", "Caligula"], bonne: 1, niveau: "moyen" },
      // ... jusqu'à 10 questions
    ],
  },
];
EOF
```

### Étape 2 — respecter le format (validé par zod, `src/lib/schema.ts`)

| Champ | Règle |
|---|---|
| `q` | texte de la question, 4 à 500 caractères |
| `reponses` | 2 à 4 réponses, chacune 1 à 200 caractères |
| `bonne` | index de la bonne réponse, **0-based** (`0` = première réponse) et `< reponses.length` |
| `niveau` | obligatoire : `"facile"` \| `"moyen"` \| `"dur"` |
| `info` | anecdote optionnelle (max 1000 caractères), affichée après la réponse |

Clés en français (`q`, `reponses`, `bonne`, `niveau`, `info`, `nom`, `icone`, `couleur`) :
c'est le format JSON documenté du client, ne pas les traduire.

### Étape 3 — vérifier

```bash
npm run count:questions   # compte le nouveau total + détecte les doublons exacts
npm run test:data         # valide le schéma zod de TOUT le corpus (0 invalide attendu)
npm run lint && npm run typecheck && npm test
```

### Étape 4 — commit

```bash
git add src/data/questions-histoire-z.js
git commit -m "feat(questions): +10 questions histoire"
```

C'est tout. Au prochain `npm run dev` / `npm run build` :
- `scripts/gen-manifest.mjs` régénère `theme-manifest.js` **avec un nouveau
  `CORPUS_VERSION`** (hash des fichiers) → le cache IndexedDB des joueurs est
  invalidé automatiquement, ils reçoivent les nouvelles questions au prochain
  lancement ;
- le nouveau fichier est découpé en un chunk par le bundler et **précaché par la
  PWA** (hors-ligne OK).

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

### Étape 2 — créer le fichier

```bash
cat > src/data/questions-astronomie-a.js << 'EOF'
// Premier lot du thème astronomie (nouveau thème).
export const QUESTIONS_ASTRONOMIE_A = [
  {
    id: "astronomie",
    nom: "Astronomie",
    icone: "planet",
    couleur: "#818cf8",
    questions: [
      { q: "Combien de planètes dans le système solaire ?", reponses: ["7", "8", "9", "10"], bonne: 1, niveau: "facile" },
      // ... au moins 1 question par niveau recommandé (facile/moyen/dur)
    ],
  },
];
EOF
```

### Étape 3 — vérifier + commit (idem §1 étape 3-4)

Le thème apparaîtra automatiquement dans la grille d'accueil (via `theme-manifest.js`)
et sera jouable dans tous les modes. Pense à remplir **les 3 niveaux** pour que le
mode Solo ait un pool suffisant par difficulté.

---

## 3. Ce qui est AUTOMATIQUE (pas besoin d'y toucher)

| Mécanisme | Quand |
|---|---|
| `theme-manifest.js` régénéré (métadonnées + `CORPUS_VERSION`) | auto avant `npm run dev` / `npm run build` (`predev`/`prebuild`), ou à la main `npm run gen:manifest` |
| Invalidation du cache IndexedDB des joueurs | auto : `CORPUS_VERSION` change dès qu'un fichier `questions-*.js` est ajouté/modifié/supprimé |
| Chunk lazy + précache PWA (hors-ligne) | auto au build (un chunk par fichier `questions-*.js`) |
| Validation du schéma (zod) | `npm run test:data` + test auto dans `npm test` |
| Détection de doublons exacts | `npm run count:questions` (73 doublons actuels, à surveiller) |
| Modération in-app (propositions des joueurs) | bouton « Proposer une question » (niveau 3 requis), validation dans `?admin=1` |

---

## 4. Checklist avant commit

- [ ] Nouveau fichier uniquement (aucun `questions-*.js` existant édité) — `git status` ne montre que des `A` (added) dans `src/data/`
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
