# ⚡ VoltQuiz — Documentation projet (AGENTS.md)

Ce fichier est le **mode d'emploi du projet**. Toute personne (ou tout agent IA) qui reprend
ce code doit le lire en premier.

> Le dossier s'appelle encore `QUIZZWALLAH` (nom historique du dossier), mais le projet
> s'appelle **VoltQuiz** partout dans le code, le manifeste WPA et les docs.
> Changer le nom = modifier `package.json`, `vite.config.js` (manifest), `index.html` (title)
> et ce fichier. Propositions validées : VoltQuiz (actuel), Qlash, Fulgur, Synapse, Ding!.

## 🎯 C'est quoi ?

VoltQuiz est un **quiz web rapide façon QuizUp** :

- **Mode Solo** : le joueur choisit un **niveau de difficulté** (Facile / Moyen / Dur), puis un thème.
  **10 questions** sont posées, tirées au hasard dans le niveau choisi (**12 141 questions intégrées,
  12 thèmes à 1000+ questions chacun** — voir le compteur par thème dans la visu admin `?admin=1` ;
  l'ordre des thèmes à l'accueil est FIXE (tri alphabétique) : seules les questions et l'ordre des
  réponses sont aléatoires).
- **Mode Duel 1v1** : 2 joueurs sur le même appareil, chacun répond à son tour aux mêmes
  questions (tous niveaux confondus), avec un écran « passe l'appareil » entre chaque tour.
- **Mode Survie** : tous les thèmes ET **tous les niveaux (facile/moyen/dur) mélangés**, plus de choix
  de difficulté à l'accueil, **1 seule vie** — la première mauvaise réponse (ou le temps écoulé) termine
  la partie. Record dédié `survie:mix:tous` (chip « Tous niveaux » dans la partie).
- **Quizz du jour** : **10 questions parmi TOUS les thèmes et niveaux**, identiques pour tout le
  monde le même jour (tirage « seedé » par la date AAAA-MM-JJ, voir `questionsQuotidien` dans
  `logique.js`). Record dédié `quotidien:AAAA-MM-JJ:tous`. **Série de jours façon Snapchat** :
  `voltquiz_streak_quotidien` (`enregistrerStreakJour`/`streakJourActuelle` dans `logique.js`),
  affichée avec le **logo éclair jaune PEPS** (`.streak-jour`) sur la carte « Quizz du jour »
  (accueil) et sur l'écran de résultats.
- **Partage du quizz du jour** (`src/lib/partage.js` + bouton « Partager mon résultat » sur
  l'écran de résultats du quotidien) : X, Facebook, WhatsApp, Messenger (liens directs
  pré-remplis), Instagram/TikTok/story (image 1080x1920 générée en canvas : fond noir, carte
  violette, éclair jaune, score, série) via `navigator.share`, bouton natif « Partager… »
  (feuille système : stories, amis, apps) et « Copier le résultat ». 100 % local.
- **Score** : minuteur **10 s** par question, **enchainement automatique** après la réponse.
  Bonne réponse = **jusqu'à 20 points** (−1 point par seconde écoulée, minimum 10), **0 si faux** ;
  la dernière manche d'un duel est **bonus ×2**. **Bonus de série (streak)** : 0 pt à la 1re bonne
  réponse, puis **+1 pt à la 2e enchaînée, +2 à la 3e, etc.** (bonus = n° de série − 1, **plafonné à +10**)
  — pastille flamme dans la barre de jeu + ligne « dont +X bonus série » dans le gros compteur central.
- **Records** : un record par mode × niveau × thème, stocké dans `localStorage` (clé `voltquiz_records`).
- **WPA** : installable comme une vraie application (bouton « Installer » du navigateur),
  fonctionne **hors-ligne** une fois installée.
- **Tes questions perso** : ajoutables de 2 façons —
  1. **Depuis l'appli** (bouton « Proposer une question ») : formulaire avec **détection de
     questions similaires**, puis **VALIDATION MANUELLE obligatoire** : la proposition va dans
     « Questions proposées (en attente) » ; au clic sur ✅ elle est déplacée dans les questions
     validées (jouables, exportables en JSON) et **disparaît de la liste des propositions** ;
  2. **Via le fichier** `public/questions-utilisateur.json` (voir `COMMENT-AJOUTER-MES-QUESTIONS.md`).
- **Détection de similarité** (`src/lib/similarite.js`) : comparaison floue 100 % locale
  (normalisation sans accents/ponctuation/mots vides + indice de Jaccard sur les mots et les
  bigrammes). À la soumission d'une question, si une question existante dépasse
  `SEUIL_SIMILAIRE = 0.4`, l'appli affiche les similaires avec leur % et demande confirmation
  (`SEUIL_IDENTIQUE = 0.85` = « quasi identique »). Un indicateur en direct signale aussi le
  meilleur match pendant la saisie.
- **Suggestions des joueurs** : bouton « Une suggestion ? » sur l'accueil (`Suggestions.jsx`) →
  texte stocké dans `localStorage` (`voltquiz_suggestions`, fonctions `ajouterSuggestion`/
  `chargerSuggestions`/`supprimerSuggestion` dans `logique.js`), **affiché UNIQUEMENT dans la vue admin
  `?admin=1`** (section « Suggestions des joueurs » avec pseudo + date + bouton supprimer). Le joueur ne
  voit qu'un message de confirmation, jamais la liste.
- **Animation de déblocage badge/titre** (`Deblocage.jsx`, affiché sur l'ACCUEIL au retour d'une
  partie) : `App.jsx` prend un snapshot des badges/titres débloqués au lancement (`calculerBadges`/
  `calculerTitres`) et calcule le diff à la fin ; si nouveautés → carte animée (pop + halo, items en
  cascade, respecte `sans-animations`) + son **« tonnerre » doux** (`sons.js` : crack bref filtré +
  grondement grave, volume contenu) + vibration `[70, 50, 130]`. Boutons « Continuer » / « Voir mes
  badges & titres ».
- **Signalement de questions (pouce rouge)** : bouton sous chaque question (`Partie.jsx`) →
  compteur dans `voltquiz_signales`, **jamais visible côté joueur** (le bouton affiche juste
  « Question signalée — merci ! »). Vue admin `?admin=1` : liste triée par nombre de
  signalements avec **vérification manuelle** — « Garder » (reste dans le pool) ou
  « Retirer du pool » (exclusion via `voltquiz_exclues`, filtre appliqué dans `questions.js`
  au chargement ; retrait effectif au rechargement, fichiers source jamais modifiés).

## 🔊 Sons, vibrations, animations + paramètres

- Sons générés en direct par le navigateur (**Web Audio API**, aucun fichier externe) dans
  `src/lib/sons.js` : `correct`, `faux`, `tick` (3 dernières secondes), `fin`, `record`.
  **Son évolutif selon la série (streak)** (`sonPourStreak` + helper `chirp` dans `sons.js`, son de
  « confirmation » GRAVE original façon kill-feed : onde triangle dans les graves (zéro buzz),
  glissando montant, filtre passe-bas très sombre, double oscillateur detuné, plus un gros coup
  de basse en sine une octave sous la note — façon « boum » profond) : 1-2 = `correct`
  (Sol3→Re4 + basse), 3-5 = `streak3` (2 chirps montants), 6-9 = `streak6` (3 chirps + accord grave
  + aigu discret), 10+ = `streak10` (4 chirps + accord large + aigu) ; vibration qui s'intensifie
  aussi (paliers 3 / 6 / 10).
  Vibrations via `navigator.vibrate` (`vibrer()`). Confettis CSS sur bonne réponse (si animations on).
- **Musique de fond** (`demarrerMusique`/`arreterMusique` dans `src/lib/sons.js`) : nappe douce
  générée en Web Audio (accords Am7–Fa–Do–Sol en triangle détuné + pluck penta occasionnel,
  gain master ~0.055 avec fondus). Lancée/arrêtée par `Partie.jsx` selon la pref `musique`
  (toggle « Musique de fond » dans Paramètres, **ON par défaut**, indépendant de `sons`).
- **Barre de temps dynamique** (`Partie.jsx` + `.minuteur-ligne`/`.minuteur-pts` dans
  `styles.css`) : la barre change de couleur selon les **points encore en jeu**
  (`pointsPour(true, TEMPS_PAR_QUESTION - temps, bonus)` : vert >= 17, jaune PEPS >= 13,
  rouge sinon), pastille « X pts » à droite, et pulsation `.danger` dans les 3 dernières secondes.
- **Préférences** stockées dans `localStorage` (`voltquiz_prefs`, voir `chargerPrefs`/`sauverPrefs`) :
  `sons`, `musique`, `animations`, `vibrations` (toutes ON par défaut). Modifiables dans la fenêtre
  **Paramètres** (icône sliders dans la barre utilisateur, composant `Parametres.jsx`).
  Si animations OFF : classe `sans-animations` sur `.app` (toutes les animations/transition coupées).
- **Accessibilité** (3 réglages dans Paramètres, OFF par défaut, classes posées sur `body`
  par `App.jsx`) :
  - `themeClair` → classe `theme-clair` : thème clair (variables CSS inversées + surfaces claires) ;
  - `daltonien` → classe `daltonien` : réponses en palette **Okabe-Ito** (`#0072B2/#E69F00/#009E73/#D55E00`,
    vrai/faux = bleu/vermillon dans `Partie.jsx`), lettres A/B/C/D renforcées, contours
    bonne (bleu) / mauvaise (vermillon) + icônes coche/croix ;
  - `dys` → classe `dys` : police Verdana/Tahoma, espacements de lettres/mots augmentés,
    interligne 1.7, question plus grosse.

## 📊 Statistiques perso

Écran **Stats** (`Stats.jsx`, icône chart dans la barre utilisateur) : calculées depuis
l'historique local `voltquiz_parties` (chaque partie y est enregistrée AVEC le détail
question par question `details: [{themeId, themeNom, niveau, correct, gain}]`) :
parties jouées, questions répondues, % de réussite, points cumulés, meilleur score par mode,
taux de réussite par thème, XP globale + niveaux par thème, top 5 des records.

## 🚫 Règles de design importantes

- **Aucun emoji dans l'interface.** Toutes les icônes sont des **SVG modernes** définies
  dans `src/components/Icone.jsx` (ajouter un chemin 24×24 pour en créer une).
- **Icônes de thèmes en duotone** : forme pleine blanche (`currentColor`) + détails découpés
  dans la couleur du badge via la variable CSS `--couleur` du parent (`.theme`). Les badges
  ont un dégradé + reflet interne (effet "app icon"). Ne pas remettre de simples icônes
  monolignes fines (rendu « cheap »).
- **Pas de compteur de questions dans la visu joueur** : la carte thème affiche le badge
  « Niv. X », la barre d'XP et le record. Le **nombre de questions par thème n'est visible que
  dans la visu admin** (`?admin=1`, section « Thèmes — nombre de questions », affiché EN DESSOUS
  du nom de chaque thème).
- **Palette 60-30-10, AUCUN dégradé** (couleurs pleines uniquement) :
  60 % couleur principale (fond), 30 % couleur secondaire (cartes/surfaces), 10 % couleur PEPS (boutons,
  accents, scores). **Palette active « sobre »** : sombre = noir `#000000` / gris ardoise `#26262B` /
  sable `#D9D0B8` ; clair (`body.theme-clair`) = blanc `#FFFFFF` / gris perle `#ECECF1` / sable `#D9D0B8`.
  **Palette « vivante » d'avant (violet `#A48DFF` / bleu `#2D5BFF` / jaune PEPS `#FFD60A`) sauvegardée
  dans `PALETTES.md`** : pour la restaurer, recopier ses valeurs dans `:root` et `body.theme-clair`
  de `styles.css` (ombres violettes `rgba(139,92,246,...)` documentées aussi dans PALETTES.md).
  Texte foncé `#141414` sur les fonds accent (boutons, onglets actifs).
  Variables dans `:root` de `styles.css` (`--fond`, `--carte`, `--accent1` = PEPS, `--texte-carte`
  pour le texte foncé sur les cartes jaunes). Les icônes de thèmes gardent leur couleur propre.
- **Design actuel « épuré »** (choix client, UX d'abord) : accueil allégé — sélecteur de mode en
  **4 onglets pilule** (`modes-tabs`/`mode-tab`) + une seule ligne de description du mode choisi,
  slogan supprimé, hero compact ; grille de thèmes en cartes compactes (icône+nom sur une ligne
  `theme-haut`, badge Niv., record, fine barre XP). Parcours : mode → thème → niveau (solo) →
  gros bouton « C'est parti » **fixé en bas de l'écran** (`.cta-fixe`, toujours visible sans scroller,
  `padding-bottom` réservé sur `.app`) ; libellé « Choisis d'abord un thème » tant qu'aucun thème n'est
  sélectionné. En solo, le **choix du niveau se fait dans une modale au clic sur le thème**
  (`modalNiveau` + `.niveaux-modal`/`.niveau-modal` dans `Accueil.jsx`) : thème + 3 difficultés +
  « C'est parti » dans la même fenêtre, zéro scroll. Coins très arrondis (pilule `999px`
  sur boutons/niveaux/
  réponses, `26px` sur cartes modes/thèmes), cartes plates sans ombre ni `backdrop-filter`, espacement
  large (`.app` 36px, sections aérées), titres fins (`h1-h3` weight 400, logo en serif Georgia weight 400,
  éclair plat `currentColor`), boutons du bas de l'accueil transparents. Palette sobre active (voir
  `PALETTES.md` pour l'ancienne palette « vivante »).
- **GitHub** : après CHAQUE amélioration terminée (et testée : `npm run build` + `node test-unitaire.mjs`),
  commiter et pousser sur `origin main` (repo `github.com/alphachomage/quizz`) :
  `git add -A && git commit -m "..." && git push origin main` (ne JAMAIS toucher à `node_modules/`,
  `dist/`, `backups/` — déjà dans `.gitignore`).
- UI et contenus **en français**, JavaScript (JSX) uniquement — le client n'est pas développeur.

## 🧰 Stack technique (et pourquoi)

| Outil | Rôle | Pourquoi ce choix |
|---|---|---|
| **React** | Librairie d'interface (les écrans) | Standard de l'industrie, réutilisable tel quel pour l'appli mobile |
| **Vite** | Outil de build / serveur local | Rapide, simple, idéal pour un débutant |
| **vite-plugin-pwa** | Transforme le site en WPA | Installable + hors-ligne, sans changer le code |
| **Capacitor** (plus tard) | Transforme ce projet web en appli Android/iOS | Roadmap mobile : `npm i @capacitor/core @capacitor/cli` puis `npx cap add android/ios` — le code React n'est PAS réécrit |

⚠️ Ne pas réécrire le projet en HTML/CSS/JS pur : la roadmap mobile repose sur React + Capacitor.

## ▶️ Commandes (à lancer dans le dossier du projet)

```bash
npm install     # UNE SEULE FOIS (installe node_modules/)
npm run dev     # serveur local de développement → http://localhost:5173
npm run build   # version de production dans dist/
npm run preview # sert la prod → http://localhost:4173
npm run deploy  # met le site EN LIGNE sur Cloudflare Workers (voir DEPLOIEMENT-CLOUDFLARE.md)
```

> 🌩️ **Mise en ligne (Cloudflare Workers)** : `npm run deploy` publie le site sur
> `https://voltquiz.joris-leo81.workers.dev` via l'adaptateur `@cloudflare/vite-plugin`
> (voir `DEPLOIEMENT-CLOUDFLARE.md`, `wrangler.toml`, `worker.js`). Première fois :
> `npx wrangler login`. La WPA (installable + hors-ligne) fonctionne telle quelle en ligne.

Arrêter le serveur : `Ctrl + C`. Prérequis : Node.js 18+ dans le PATH.

## 📁 Arborescence

```
QUIZZWALLAH/
├── AGENTS.md                        ← ce fichier
├── README.md                        ← guide pas à pas pour le client (non-technique)
├── COMMENT-AJOUTER-MES-QUESTIONS.md ← guide pour ajouter ses propres questions
├── DEPLOIEMENT-CLOUDFLARE.md      ← guide pas à pas : publier VoltQuiz en ligne (Cloudflare Workers)
├── wrangler.toml                  ← config Cloudflare Workers (nom, assets, run_worker_first)
├── worker.js                      ← code du Worker : sert dist/client, repli SPA, headers WPA, /api/*
├── make-icons.ps1                   ← script qui régénère les icônes PNG (lettre V, dégradé)
├── package.json                     ← dépendances et commandes npm
├── vite.config.js                   ← config Vite + WPA (manifest, icônes, service worker)
├── index.html
├── public/
│   ├── questions-utilisateur.json   ← QUESTIONS PERSO de l'utilisateur
│   └── icons/                       ← icônes PNG (WPA, favicon, mobile)
└── src/
    ├── main.jsx                     ← point d'entrée + service worker (WPA)
    ├── App.jsx                      ← chef d'orchestre : accueil / partie / résultats + fusion des questions
    ├── styles.css                   ← tout le style (thème sombre « verre », façon QuizUp modernisée)
    ├── data/
    │   ├── questions-base.js        ← base de questions (8 thèmes × 30 = 10 par niveau)
    │   ├── questions-extra.js       ← lot 2 (8 thèmes × 30)
    │   ├── questions-extra2.js      ← lot 3 (8 thèmes × 30)
    │   ├── questions-extra3a/b/c.js ← lot 4 : 8 thèmes × 30 (10 facile + 10 moyen + 10 dur), rédigé en direct
    │   ├── questions-extra4a/b/c.js ← lot 5 : 8 thèmes × 30 (sous-agent redacteur-lot4)
    │   └── questions.js             ← fusionne TOUS les lots en AJOUT (rien n'est jamais supprimé) :
    │                                  8 thèmes × 120 = 50 par niveau, 1200 questions au total
    ├── lib/
    │   ├── logique.js               ← règles : niveaux, mélange, points, minuteur, records, soumissions
    │   └── similarite.js            ← détection de questions similaires (Jaccard mots + bigrammes)
    └── components/
        ├── Icone.jsx                ← iconothèque SVG (aucun emoji) + jauge de niveau (Barres)
        ├── Accueil.jsx              ← mode, niveau (solo), joueurs (duel), thème + propositions de questions
        ├── Partie.jsx               ← déroulement d'une partie (minuteur, réponses, duel)
        ├── Resultat.jsx             ← scores, gagnant, records
        └── FormulaireQuestion.jsx   ← formulaire de proposition avec alerte de similarité
```

## 🎮 Règles du jeu (à ne pas casser)

- Minuteur : `TEMPS_PAR_QUESTION = 15` s (`src/lib/logique.js`).
- Solo : pool = les 20 questions du niveau choisi dans le thème, on en tire `QUESTIONS_SOLO = 10` au hasard.
- Duel : `QUESTIONS_DUEL = 6` questions **par joueur**, mêmes questions pour les deux, tous niveaux.
- Points : `100 + 10 × secondes restantes` si bonne réponse, `0` sinon (`pointsPour`).
- Niveaux : `NIVEAUX` dans `logique.js` — ids `facile` / `moyen` / `dur`.
- Record : clé `"<mode>:<niveau|mix>:<themeId>"` via `cleRecord()`. Reset de la version d'essai
  (records + leaderboards + XP + séries mémorisées) : ouvrir `?reset=1` une fois, aucun bouton.
- Soumissions de questions : deux listes `localStorage` — `voltquiz_soumissions` (en attente de
  validation, affichées dans « Questions proposées ») et `voltquiz_validees` (validées = jouables,
  fusionnées aux thèmes, exportables via `exporterSoumissionsJSON()`). La détection de similarité
  couvre base + validées + en attente.
- Aléatoire : à chaque partie, chaque joueur reçoit son propre tirage de questions, **et l'ordre des
  réponses de chaque question est mélangé aussi** (`avecReponsesAleatoires` dans Partie.jsx, avec
  recalcul de l'index `bonne`) — la position de la bonne réponse change à chaque partie.
  **Diversité des sujets ET des thèmes** (`sujetDe` + `tirerSerie` dans `logique.js`) : le tirage détecte
  le sujet de chaque question (groupe de mots en capitales hors début de phrase, ex. « One Piece »,
  « Naruto ») et limite à **2 questions du même sujet par série**, et en mode multi-thèmes (survie) à
  **max ~ceil(nb/12)+1 questions du même thème** (`maxParTheme`, paramètre de `tirerSerie`). Le quizz du
  jour utilise la même fonction avec le générateur seedé (`rand`) : tirage diversifié MAIS identique pour
  tous le même jour (max 2/sujet, max 2/thème). Tests : solo mangas 0/500 séries avec 3+ du même sujet ;
  survie simulée max 4/thème (vs 9 avant), 0 dépassement, 12/12 thèmes touchés ; quotidien déterministe
  (même date = même tirage, jour suivant = différent). L'ordre des thèmes à l'accueil est FIXE (tri
  alphabétique).

## ❓ Format des questions

```json
{
  "themes": [
    {
      "id": "mon-theme",
      "nom": "Mon thème",
      "icone": "sparkles",
      "couleur": "#ff6600",
      "questions": [
        {
          "q": "Texte de la question ?",
          "reponses": ["A", "B", "C", "D"],
          "bonne": 2,
          "niveau": "moyen",
          "info": "Anecdote optionnelle."
        }
      ]
    }
  ]
}
```

- `bonne` = index de la bonne réponse (`0` = 1ʳᵉ, `1` = 2ᵉ, etc.).
- `niveau` : **obligatoire** — `"facile"`, `"moyen"` ou `"dur"`.
- `icone` : nom d'une icône de `Icone.jsx` (globe, film, music, ball, gamepad, sparkles, question, pin) — **pas d'emoji**.
- 2 à 4 réponses. Même `id` qu'un thème existant = questions ajoutées à ce thème.

## 👤 Comptes locaux & modération des pseudos

- **Comptes 100 % locaux** (`src/lib/comptes.js`) : création avec **pseudo + e-mail + mot de passe**,
  stockés dans `localStorage` (clé `voltquiz_comptes`). Mot de passe **hashé SHA-256 salé**
  (`crypto.subtle`, dispo car localhost est un contexte sécurisé), jamais en clair.
  Session : clé `voltquiz_session`. Sans session, l'app affiche l'écran `Compte.jsx`.
- **Tuto de bienvenue** (`src/components/Tuto.jsx`) : à la **première connexion de chaque
  compte uniquement** (flag par pseudo dans `localStorage` clé `voltquiz_tuto_vu`, fonctions
  `aVuTuto`/`marquerTutoVu` dans `comptes.js`), une fenêtre explique en 4 points courts : le
  principe (10 s/question, réponse la plus rapide), les points (max 20, −1 pt/s, min 10, ×2
  dernière manche), la série/streak (+1 à +10), et les 4 modes (Solo, Duel 1v1, Survie,
  Quizz du jour). Une fois fermée, elle ne réapparaît plus pour ce compte. On peut la
  **rouvrir à tout moment** avec le bouton « ? » de la barre utilisateur (Accueil) ou en
  ouvrant l'app avec `?tuto=1`.
  Le pseudo du compte sert de nom par défaut en solo et en duel (suggestions de pseudos connus).
- **Modération** (`src/lib/moderation.js`) : à la création, le pseudo est refusé s'il contient un
  terme de la liste bloquée (catégories : nazisme, homophobie, misogynie, racisme, insultes,
  contenu sexuel). Détection robuste : normalisation (minuscules, accents, **leetspeak décodé**
  : `n4z1`→`nazi`, `m1s0gyne`→`misogyne`), sous-chaîne pour les termes ≥ 4 caractères,
  égalité exacte sinon (évite les faux positifs type « Cassandra »). Tests unitaires exécutés
  en node : tous les cas passent.
- ⚠️ Limites connues (volontaires, version locale) : pas de vérification d'e-mail réelle,
  un seul PC = une « base de comptes » locale ; en V2 (serveur), passage à une vraie BDD
  avec modération + signalement.
- **Avatar de profil** : upload UNIQUEMENT dans les **Paramètres** (section « Photo de profil »,
  `Parametres.jsx`). Le clic sur l'avatar ouvre la **carte profil** (`Profil.jsx`) : photo, pseudo,
  niveau global + barre XP, **titre** dans une pastille jaune dédiée, **top 3 thèmes par XP**,
  progression badges (X/30) et **badge favori** choisi parmi les débloqués (`voltquiz_badge_favori`).
  Modération auto (`src/lib/avatar.js`) : upload local (JPEG/PNG/WebP, ≤ 3 Mo, ≥ 32 px),
  recadré en carré 128 px et stocké en dataURL sur le compte. **Modération automatique** :
  heuristique de nudité (ratio de pixels "peau" > 50 % → refus) + **hash perceptuel aHash 8×8**
  comparé à `public/avatars-bloques.json` (distance de Hamming ≤ 6) pour bloquer les personnages
  historiques problématiques. Pour ajouter une figure à la liste : calculer son aHash (8×8, même
  algo que `aHash()` dans avatar.js) et l'ajouter dans le JSON avec un `label`. Limite : sans IA,
  seules les images listées sont bloquées ; la V2 utilisera une vraie API de modération d'images.
- **XP globale du joueur** : somme de l'XP des thèmes, affichée sous le pseudo (barre + niveau global).

## 🤖 Sub-agents (méthode de travail)

Pour les grosses demandes, le travail est **délégué à des sub-agents** (enfants de cette session,
lancés en parallèle via `agents.spawn`) plutôt que traité en bloc :

| Sub-agent | Rôle | Quand l'utiliser |
|---|---|---|
| `redacteur-questions` | Rédige un lot de questions inédites dans `src/data/questions-extraN.js` (format validé par script node) | dès qu'on ajoute ≥ 50 questions intégrées |
| `vague<N>-<theme>` | Rédige un **lot de questions neuves pour UN thème** (3 fichiers `questions-v<N>-<theme>-{a1,b1,c1}.js`, 50 questions/niveau ou moins selon le besoin), **anti-doublons obligatoire** par script node (normalisation minuscules/sans accents/sans ponctuation) contre TOUS les `questions-*.js` existants, écriture au fur et à mesure | campagne « 1000 questions par thème » — **max 3 agents `vague*` en même temps** (sinon erreurs réseau), relancer un agent `failed` sous un nouveau nom (`vague4f-espace` → `vague4f-espace2`) |
| `chercheur-quizup` | Recherche web documentée + rédaction de `COMPARAISON-QUIZUP.md` | veilles, comparatifs, documentation métier |

Règles : chaque sub-agent a des **instructions autonomes** (il ne voit pas celles du parent),
ne touche qu'à SES fichiers, et retourne un résumé vérifiable. Le parent valide ensuite
(comptage, build) avant d'intégrer. Les sub-agents sont listés via `agents.list`.

### 📊 Corpus de questions (état final)

**12 141 questions réparties en 12 thèmes, chacun à 1000+ questions** (240 fichiers
`src/data/questions-*.js`, chargés automatiquement par `import.meta.glob` dans `questions.js`) :

| Thème | Questions |
|---|---|
| Cinéma & Séries | 1000 |
| Cuisine | 1000 |
| Culture générale | 1000 |
| Espace | 1004 |
| Géographie | 1002 |
| Histoire | 1050 |
| Jeux vidéos | 1002 |
| Mangas & Animés | 1001 |
| Musique | 1000 |
| Mythologie | 1050 |
| Sciences | 1032 |
| Sport | 1000 |

Répartition par niveau : 4164 facile / 4113 moyen / 3864 dur. Quelques doublons exacts
hérités des tout premiers fichiers de base existent encore (~69 intra-thèmes, ex. « Combien de
minutes dans une heure ? » en double) ; les lots rédigés par sub-agents (vagues v4+) sont
 garantis 0 doublon. Compteur en temps réel : `node --input-type=module -e "..."` (fusionner
tous les `questions-*.js`, compter par thème) ou visu admin `?admin=1`.

## 🎮 Règles du jeu (mises à jour)

- Minuteur : `TEMPS_PAR_QUESTION = 10` s. **Barre dynamique** : couleur selon les points restants
  (vert/jaune/rouge), pastille « X pts » en direct, pulse dans les 3 dernières secondes.
- **Structure en 3 manches** (`infoManche`) : la 3ᵉ manche est **bonus (points ×2)**.
  Solo = 10 questions, duel = 6 questions par joueur.
- **Score arcade** (`pointsPour`) : bonne réponse = 20 pts − 1 pt/seconde écoulée (min 10),
  0 si faux ou temps écoulé, ×2 en manche bonus. Max solo = 240 pts.
- **Enchaînement automatique** : 2 s après chaque réponse, la question suivante démarre sans clic.
  En duel, l'écran « passe l'appareil » garde son bouton (secret oblige).
- **XP + niveaux par thème** (`chargerXP`/`ajouterXP`/`niveauTheme`) : chaque partie rapporte au
  thème ses points en XP (clé `voltquiz_xp`). Niveau = 1 + floor(sqrt(XP/100)). Affiché sur les
  cartes thèmes (badge « Niv. X » + barre de progression) et dans le leaderboard.
- **Déblocage** : proposer une question dans un thème requiert le **niveau 3 dans ce thème**
  (`SEUIL_SOUMISSION_NIVEAU`), thèmes verrouillés dans le formulaire.
- **Social local** : suggestions de pseudos (joueurs déjà rencontrés) dans le duel via datalist ;
  profils/statistiques des joueurs dans le leaderboard.
- **Leaderboard local** (`src/components/Classement.jsx`) : UNIQUEMENT les classements par mode
  (Solo avec filtre Facile/Moyen/Dur, Duel 1v1, Survie, Quizz du jour), chaque ligne = rang +
  joueur + **badge du thème coloré avec son icône** (`.lc-theme`) + difficulté + **points**.
  Bouton « Mes statistiques » en bas pour basculer.
  Historique : `localStorage` clé `voltquiz_parties` (500 dernières parties max).
- **Statistiques** (bouton **chart** dans la barre utilisateur, `Stats.jsx`) : bilan global,
  progression XP, par mode, **% de bonnes réponses par thème ET par niveau de difficulté**,
  meilleurs records, **+ stats avancées** : calendrier d'activité façon GitHub (12 dernières
  semaines, `cleJourLocal`), barres des points sur 30 jours, et **temps de réaction moyen**
  (champ `secondes` enregistré dans chaque détail de partie depuis la v5).
- **Classement hebdo** (`Classement.jsx`) : sélecteur « Tout l’historique / Cette semaine »
  (`dansSemaineEnCours` dans `logique.js`, semaine = lundi→dimanche) appliqué à tous les onglets.
- **Écran de fin enrichi** (`Resultat.jsx`) : bloc « stats de la partie » (temps moyen/question,
  meilleure série) + record avec comparaison « avant : X pts » quand nouveau record.
- **Écran de fin de partie** (`Resultat.jsx`) : affiche le score/record, l'**XP gagnée par
  thème** (niveau avant/après + barre) et l'**XP globale du compte** avec sa barre de
  progression, la **position au leaderboard si top 10** (calculée depuis `voltquiz_parties`),
  et un bouton **Rejouer**. Anti-répétition : la dernière série jouée est mémorisée par
  mode/niveau/thème (`voltquiz_dernieres_series`, fonctions `cleSerie`/`sauverSerie`/`poolSansSeriePrecedente`
  dans `logique.js`) → « Rejouer » tire des questions **hors de la série précédente** (testé :
  0 chevauchement). Le quizz du jour n'est pas concerné (1 tentative/jour, tirage seedé).

- **Badges (succès)** : écran « Mes badges » (bouton étoile ⭐ dans la barre utilisateur,
  `src/components/Badges.jsx`), **30 badges** définis dans `src/lib/badges.js`
  (`BADGES` + `calculerBadges()` depuis `chargerParties`/`chargerRecords`/`chargerXP`/streak jour/
  soumissions). Débloqué = icône jaune PEPS + « Débloqué » ; verrouillé = grisé + **condition exacte
  affichée**. Purement visuel, aucun bonus. Progression « X / 30 » avec barre en haut.
- **Titres de profil** (2e onglet « Titres » du même écran, `src/lib/titres.js`) : **50 titres** =
  3 par thème (niveaux 3/5/10 du thème, 36 titres) + 14 généraux (parties, streak ⚡, records,
  survie, duel, questions…). Verrouillé = « ??? » ; débloqué = sélectionnable, le titre choisi
  s'affiche **sous la barre d'XP du profil** (`voltquiz_titre_actif`, `titreAffiche()` dans
  `Accueil.jsx`). Si le choix devient invalide (reset), retombe sur le plus haut palier débloqué.

## 🗺️ Roadmap

1. ✅ V1 : solo (3 niveaux) + duel local + WPA + questions perso + SVG sans emoji.
2. ✅ V1.5 : **720 questions intégrées** (8 thèmes × 30/niveau, 3 lots de fichiers), timer **10 s**,
   **auto-advance** (2 s, plus de bouton continuer), tirage aléatoire par joueur + thèmes mélangés,
   leaderboard local (joueurs + records), validation manuelle des propositions (elles disparaissent
   de la liste une fois validées), logos modernisés (éclair vectoriel + icônes « app icon »),
   comparatif QuizUp (`COMPARAISON-QUIZUP.md`, rédigé par le sub-agent chercheur-quizup).
3. ✅ **12 thèmes × 1000+ questions** (12 141 questions au total, lots rédigés par sub-agents
   `vague*`, 0 doublon sur les lots récents, compteur par thème dans la visu admin `?admin=1`
   affiché sous chaque thème).
4. ⏳ V2 : duel en ligne à distance (serveur WebSocket) + comptes joueurs + leaderboard en ligne.
4. ⏳ V3 : appli mobile Android/iOS via **Capacitor**.
5. ⏳ V4 : badges, classements hebdo, plus de thèmes.
