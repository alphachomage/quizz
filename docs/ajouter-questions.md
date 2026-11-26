# Ajouter des questions ou un thème — guide pas à pas

Ce guide explique comment enrichir le corpus **proprement**. Le corpus est du JSON dans
`content/` (voir `docs/questions.md`). Les nouveaux lots passent TOUJOURS par la boîte de
dépôt `content/inbox/` + `npm run questions:import` : le script contrôle la qualité, évite
les doublons, attribue les ids et ajoute les questions en fin de fichier de thème.

> Règle d'or (règle 7 de `AGENTS.md`) : les **ids** des questions existantes ne sont
> jamais modifiés ni réattribués, et l'**ordre** des questions ne change jamais (le Quizz
> du jour en dépend). L'import ajoute EN FIN de fichier, c'est tout. Aucune nouvelle entrée
> dans `content/qualite-dette.json` : le nouveau contenu respecte toutes les règles.
> L'ancien format (fichiers `questions-*.js` dans `src/data/`) est refusé par `npm run lint`.

---

## 1. Ajouter des questions à un thème existant (inbox)

Procédure identique pour une personne et pour un agent. Un agent crée UN fichier inbox
qui lui est propre (nom libre, ex. `histoire-lot-agent3.json`) : aucun conflit git entre
agents qui travaillent en parallèle.

### Étape 1 — créer `content/inbox/<nom-libre>.json`

Un thème par fichier, questions SANS `id`, une par ligne :

```json
{
  "theme": "histoire",
  "questions": [
    {"q":"En quelle année a eu lieu la Révolution française ?","reponses":["1789","1815","1848","1914"],"bonne":0,"niveau":"facile","info":"Le 14 juillet 1789, prise de la Bastille."},
    {"q":"Qui était le premier empereur romain ?","reponses":["Jules César","Auguste","Néron","Caligula"],"bonne":1,"niveau":"moyen"}
  ]
}
```

`theme` = un `id` présent dans `content/themes.json` (sinon le fichier entier est refusé).
Faits vérifiables uniquement, formulation courte, 4 réponses plausibles de longueur
comparable.

### Étape 2 — importer

```bash
npm run questions:import -- --dry-run   # simulation : affiche acceptées/refusées, n'écrit rien
npm run questions:import                # import réel
```

- **Acceptées** : ajoutées à la fin de `content/questions/<theme>.json` avec leur id.
- **Refusées** : le fichier inbox est réécrit avec SEULEMENT les refusées, chacune annotée
  `"rejet": ["code: message", ...]`. Si tout est accepté, le fichier est supprimé.
  Code de sortie 1 s'il reste des refus.

### Étape 3 — corriger les refus, relancer

Lire les `rejet` (code + message, voir la liste des règles plus bas), corriger la question
(ou la supprimer du fichier si c'est un vrai doublon), relancer `npm run questions:import`.
Les clés `rejet` et `id` éventuellement présentes sont ignorées au nouvel import.

### Étape 4 — vérifier et commiter

```bash
npm run count:questions   # nouveau total, 0 invalide
npm run lint && npm run typecheck && npm test
git add content/
git commit -m "feat(questions): +N questions <theme>"
```

Ne jamais commiter de fichier inbox non vide : un fichier restant dans `content/inbox/`
signale un lot non terminé (seuls `.gitkeep` et `README.md` y restent versionnés).

### Format d'une question (validé par zod, `src/lib/schema.ts`)

| Champ | Règle |
|---|---|
| `id` | attribué par l'import (`<theme>-<hex>`), unique, **jamais modifié** |
| `q` | texte de la question, 4 à 500 caractères (150 max imposé par les règles qualité) |
| `reponses` | 4 réponses (règle qualité), chacune 1 à 200 caractères (60 max imposé par les règles qualité) |
| `bonne` | index de la bonne réponse, **0-based** (`0` = première réponse) et `< reponses.length` |
| `niveau` | obligatoire : `"facile"` \| `"moyen"` \| `"dur"` |
| `info` | anecdote optionnelle (max 1000 caractères), affichée après la réponse |

Clés en français (`q`, `reponses`, `bonne`, `niveau`, `info`, `nom`, `icone`, `couleur`) :
c'est le format JSON documenté du client, ne pas les traduire.

### Règles qualité (`scripts/lib/quality.mjs`)

Toutes bloquantes pour du nouveau contenu :

| Code | Règle | Raison |
|---|---|---|
| `reponse-dans-question` | la bonne réponse (>= 4 caractères normalisés, mot entier) apparaît dans la question ; « vrai » et « faux » exemptés | la question donne la réponse (« Paris » dans la question, pas « Parisien ») |
| `question-trop-longue` | `q` > 150 caractères | illisible en 10 s sur mobile, souvent un indice déguisé |
| `reponse-trop-longue` | une réponse > 60 caractères | ne tient pas sur un bouton |
| `reponses-en-double` | deux réponses identiques après normalisation | choix factice |
| `nombre-reponses` | différent de 4 réponses | norme QuizUp, grille de boutons 2x2 |
| `reponse-trahie-par-longueur` | bonne réponse >= 3 fois plus longue que la plus longue des mauvaises ET >= 20 caractères de plus | on devine sans connaître (seuils choisis pour limiter le bruit sur le corpus existant) |
| `doublon-exact` | même texte normalisé qu'une question précédente du thème | le 1er exemplaire n'est pas en faute |
| `format` | schéma invalide (champ manquant, chaîne vide, `bonne` hors bornes, niveau inconnu, tailles zod) | la question planterait au chargement |

À l'import s'ajoutent `quasi-doublon` (même algorithme que l'appli, `src/lib/similarity.ts`,
seuil `THRESHOLD_SIMILAR`, contre le thème ET le lot) et la vérification du thème. La
normalisation est celle de `normalizeQuestionText` (`src/lib/text.ts`).

### La dette qualité (`content/qualite-dette.json`) et le lint

Le corpus historique viole certaines règles. `npm run questions:lint` (lancé aussi par
`npm run lint`) accepte ces violations seulement si l'id est listé dans
`content/qualite-dette.json` (`{ "<code>": ["<id>", ...] }`, ids triés), et échoue si :

1. une question viole une règle sans être en dette (**la dette ne grossit jamais**) :
   corriger la question ;
2. la dette contient un id qui ne viole plus la règle ou qui n'existe plus (**dette
   périmée**, par exemple après un nettoyage) : lancer
   `npm run questions:lint -- --update-dette`, qui RETIRE les entrées périmées et n'en
   ajoute jamais.

Le fichier initial a été produit une seule fois par `npm run questions:lint -- --init-dette`
(la commande refuse d'écraser un fichier existant). Corriger une question de la dette est
encouragé (en gardant son id), puis `--update-dette` pour la sortir de la liste.

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
  "questions": []
}
```

3. Déposer les premières questions via l'inbox (§1, `"theme": "astronomie"`) puis
   `npm run questions:import` : ne pas commiter le thème tant qu'il est vide.

### Étape 3 — vérifier + commit (idem §1 étape 4)

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
| Règles qualité du corpus (avec dette) | `npm run questions:lint`, inclus dans `npm run lint` |
| Détection de doublons exacts | `npm run count:questions` (le nombre ne doit jamais augmenter) |
| Modération in-app (propositions des joueurs) | bouton « Proposer une question » (niveau 3 requis), validation dans `?admin=1` |

---

## 4. Checklist avant commit

- [ ] Ajouts en fin de fichier de thème uniquement : `git diff content/` ne montre que des lignes ajoutées (ou des corrections voulues), aucun id existant modifié, aucune question déplacée
- [ ] Lot passé par `content/inbox/` + `npm run questions:import` (aucun refus restant, aucun fichier inbox non vide commité)
- [ ] `npm run questions:lint` vert, `content/qualite-dette.json` sans nouvelle entrée (il ne peut que rétrécir)
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

- chaque sous-agent rédige son lot dans SON fichier `content/inbox/<nom>.json` (zéro
  conflit git), après avoir reçu la liste des questions existantes du thème (anti-doublon) ;
- le parent lance `npm run questions:import` (ou chaque agent pour son fichier), relit les
  refus, puis `npm run count:questions` (doublons pas en hausse, 0 invalide).

Dédoublonnage exact : `node scripts/dedupe-questions.mjs` supprime les doublons (même
question normalisée dans le même thème, même règle que `count:questions`), garde la
première occurrence (avec son id) et réécrit uniquement les fichiers de thème concernés.
Relire le diff git et le noter dans `CHANGELOG.md`.

Un nouveau thème s'accompagne de titres (`TITLES_PER_THEME`, `src/lib/titles.ts`) et de
badges (`themeLevels`, `src/lib/badges.ts`) dédiés, et d'une icône dans `src/shared/ui/Icon.tsx`.

