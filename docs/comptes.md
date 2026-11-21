# Comptes, invité, modération, reset

## Comptes (`src/lib/accounts.ts`) — deux modes

- **Mode `d1` (défaut)** : création/connexion via le serveur
  (`POST /api/auth/inscription|connexion`, hash **PBKDF2 210 000 itérations** côté
  worker, comparaison timing-safe — table D1 `comptes`). Le mot de passe ne transite
  que vers `/api/auth/*`. Le `localStorage` (`voltquiz_comptes`) ne garde qu'un **cache
  du profil** (pseudo, e-mail, avatar) : jamais de hash ni de mot de passe en clair.
  Serveur injoignable -> erreur claire (« réessaie, ou ouvre l'appli avec ?stockage=local »).
- **Mode `local` (`?stockage=local`, hors-ligne)** : comptes 100 % locaux, mot de passe
  **hashé SHA-256 salé** (`crypto.subtle` + sel `crypto.randomUUID`), jamais en clair.
  Guard `secureContext()` : hors contexte sécurisé (HTTPS/localhost), erreur
  utilisateur claire au lieu d'un crash.
- Session : clé `voltquiz_session` (`currentSession()`). Sans session, l'app affiche
  l'écran `Account` (`src/features/account/Account.tsx`).
- Modération des pseudos à la création (`src/lib/moderation.ts`, `isValidPseudo`) :
  liste bloquée (nazisme, homophobie, misogynie, racisme, insultes, contenu sexuel),
  normalisation + leetspeak décodé (`n4z1` -> `nazi`), sous-chaîne pour les termes
  >= 4 caractères (évite les faux positifs type « Cassandra »).

## Mode invité

Bouton « Jouer en invité » : pseudo auto `user-xxxxxxx` (`startGuest`), session
`{ invite: true }`. Un invité n'a **rien de persistant** : pas d'XP, badges, titres,
classement, stats ni historique (`persistResult` saute tout si `isGuest`), et sa
partie du jour ne bloque pas la tentative du compte. Records locaux conservés.
Pastille « Invité », barre d'XP/titre masquée, célébration de déblocage désactivée.

## Tuto de bienvenue (`src/features/tutorial/Tutorial.tsx`)

4 points (10 s/question, points, streak, 4 modes), ouvert UNE fois par compte
(clé `voltquiz_tuto_vu`, `hasSeenTutorial`/`markTutorialSeen`, pseudo `invite` pour
les invités), rouvrable via `?tuto=1` ou le bouton « ? » de la barre utilisateur.

## Reset (version d'essai, aucun bouton)

- `?reset=1` : `resetScores()` (records, parties, XP, séries) puis nettoyage d'URL.
- `?resetcompte=1` : `resetProgress()` (`src/lib/reset.ts`) — reset total
  (streak jour, badge favori, titre actif) ; les questions perso sont CONSERVÉES, un
  offset `voltquiz_reset_soumissions` est posé pour que les badges « proposer/valider »
  repartent de 0.

## Avatar

Upload uniquement dans les Paramètres (`src/shared/modals/Settings.tsx`), recadré
128 px en dataURL sur le compte (`AVATAR_SIZE` dans `src/lib/avatar.ts`).
Modération auto : formats JPEG/PNG/WebP <= 3 Mo, heuristique de nudité (ratio pixels
"peau" > 50 % -> refus, `SKIN_THRESHOLD`), hash perceptuel aHash 8x8 comparé à
`public/avatars-bloques.json` (distance de Hamming <= 6, `MAX_HASH_DISTANCE`).
