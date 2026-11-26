# Feature accueil

`src/features/home/Home.tsx` (render-only) + `useHome.ts` (état) + `useCarousel.ts`
(carrousel en boucle + roulette) + `components/`. Modales transverses dans
`src/shared/modals/`. Écran chargé en React.lazy (`src/app/routes.ts`, clé `home`).

Principe (refonte atelier 2026-11-23) : **on choisit d'abord son mode, tout le reste se
passe dans une popin — aucun défilement sur l'accueil.**

- Barre utilisateur (`UserBar`) : profil, badges, tuto, stats, paramètres, déconnexion.
- Logo VQuizz (image fournie par le client, `public/logo-vquizz.png` ; variante lettres
  bleu nuit `public/logo-vquizz-clair.png` affichée en mode clair).
- 4 grandes tuiles de mode (`ModeTabs`) : Solo, Duel en ligne (désactivé, « à venir »),
  Rogue Quizz, Quizz du jour (pastille série). Un clic appelle `openMode` (mode + popin).
- Popin **Solo** (`ThemePickerModal`) : carrousel des thèmes en boucle infinie
  (`ThemeCarousel` + `useCarousel`, 5 copies de la liste, recalage invisible), **la carte
  au centre est le thème choisi** ; bouton « Thème aléatoire » qui fait tourner le
  carrousel façon roulette (`spinTo`, au moins un tour, décélération, jamais deux fois le
  même thème ; saut direct si animations coupées ou « mouvement réduit ») ; choix de la
  difficulté ; « C'est parti ! » lance la partie (`lancerTheme`).
- Popin **Rogue Quizz / Quizz du jour** (`ModeConfirmModal`) : règles du mode (tutoriel Rogue affiché une seule fois), record ou score
  du jour + série, « C'est parti ! » (bloqué si le quizz du jour est déjà joué).
- « Prochain badge » (`BadgeBanner` + `Crest`) : petit blason, nom, progression ; clic =
  détail (`BadgeDetailModal`).
- Liens discrets : Classement, Proposer une question, Suggestion.
