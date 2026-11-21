# VoltQuiz — Guide de lancement (sans être développeur)

Ce guide t'explique, étape par étape, comment faire tourner **VoltQuiz** sur ton PC Windows.
Aucune compétence en code n'est nécessaire : il suffit de copier-coller quelques commandes.

---

## Créer ton compte (à chaque ouverture de l'appli)

Au lancement, crée ton compte : **pseudo + e-mail + mot de passe** (8 caractères min).
Tout est stocké **uniquement sur ton PC** (mot de passe hashé, jamais en clair).
Le pseudo est vérifié automatiquement : les pseudos haineux, discriminatoires ou insultants
(y compris déguisés, type « nz » sans le « a ») sont refusés. Tu peux te déconnecter via le
bouton à côté de ton pseudo en haut de l'accueil. Tu peux aussi jouer en **invité**
(rien n'est enregistré dans ce mode).

---

## Prérequis : Node.js (déjà fait sur ce PC)

**Node.js** est le « moteur » qui fait tourner le projet.

> Déjà installé sur ce PC : Node.js (v22 LTS) dans `%LOCALAPPDATA%\nodejs`, ajouté au PATH.
> Sur un autre PC : va sur **https://nodejs.org/fr**, télécharge la version **LTS** (fichier `.msi`),
> installe-le (Suivant / Suivant / Installer), puis ferme et rouvre le terminal.

---

## Ouvrir un terminal dans le dossier du projet

1. Explorateur de fichiers `C:\Users\Joris\Downloads\QUIZZWALLAH`.
2. **Clic droit** dans le dossier -> **« Ouvrir dans Terminal »**.
3. Une fenêtre s'ouvre : c'est le **terminal**.

---

## Installer les dépendances (une seule fois)

```powershell
npm install
```

(Compte 2 à 3 minutes. Le dossier `node_modules/` apparaît : ne le supprime pas.)

---

## Lancer l'appli

```powershell
npm run dev
```

Puis ouvre **http://localhost:5173** dans Chrome ou Edge.

**Ne ferme pas la fenêtre du terminal** : c'est elle qui fait tourner l'appli.
Pour **arrêter** : `Ctrl + C` dans le terminal.

**Comment jouer** : choisis un mode — **Solo** (puis un niveau : Facile / Moyen / Dur),
**Duel 1v1** (deux joueurs sur le même PC, pseudos suggérés si déjà vus), **Survie**
(1 vie, jusqu'à 30 questions) ou **Quizz du jour** (le même pour tout le monde) —
puis un thème, et c'est parti !

**Règles** : 10 s par question, 10 questions en solo (6 par joueur en duel), en
**3 manches** dont la dernière en **bonus ×2**. Bonne réponse = **20 pts − 1 pt par
seconde passée** (min 10), **0** si faux. Les réponses s'enchaînent automatiquement.
Chaque partie rapporte de **l'XP au thème** : tu montes de **niveau par thème**
(badge « Niv. X » sur chaque carte). À partir du **niveau 3** dans un thème, tu peux y
**proposer tes propres questions** (bouton « Proposer une question », avec détection de
doublons et validation manuelle). Le **classement** (bouton dédié) récapitule les
meilleurs scores.

---

## Installer VoltQuiz comme une vraie appli (PWA)

Une **PWA** = un site qu'on installe comme une appli : icône sur le bureau, fenêtre
dédiée, fonctionne même **sans internet**.

1. Dans la barre d'adresse, à droite de `localhost:5173`, clique sur le bouton
 **« Installer »** (ou menu « Installer VoltQuiz »).
2. L'icône de VoltQuiz apparaît sur le bureau et dans le menu Démarrer.

---

## Proposer une question depuis l'appli (le plus simple)

1. Sur l'accueil, clique sur **« Proposer une question »**.
2. Remplis : thème, niveau (Facile/Moyen/Dur), la question, 2 à 4 réponses (coche la
 bonne), anecdote optionnelle.
3. Pendant que tu écris, l'appli signale en direct si une question ressemble déjà à la tienne.
4. Au clic sur **« Vérifier et ajouter »**, si des questions similaires existent, elles
 s'affichent avec leur pourcentage de ressemblance (et leur thème) : tu confirmes ou tu modifies.
5. La question est ajoutée immédiatement (jouable dans le thème choisi) et apparaît dans
 la liste **« Questions proposées »** en bas de l'accueil, où tu peux la supprimer.
6. Bouton **« Exporter en JSON »** : télécharge un fichier `questions-utilisateur.json` prêt
 à l'emploi -> copie-le dans `public/` pour rendre tes questions permanentes et partageables.

## bis — Ajouter des questions à la main (méthode fichier)

Remplis le fichier `public/questions-utilisateur.json` en suivant
**`docs/questions.md`** (format simple, chaque question a un niveau
`facile` / `moyen` / `dur`). Sauvegarde, recharge la page (F5) : tes questions sont là.

---

## Version « production » locale (optionnel)

```powershell
npm run build
npm run preview
```

Puis ouvre **http://localhost:4173** (version optimisée, idéale pour l'installation PWA).

---

## En cas de problème

| Symptôme | Solution |
|---|---|
| `npm` ou `node` « n'est pas reconnu » | Node.js non installé (étape « Prérequis ») ou terminal ouvert avant l'installation : ferme et rouvre le terminal |
| Port « déjà utilisé » | L'appli tourne déjà dans une autre fenêtre : va directement sur http://localhost:5173 |
| Page blanche | Le terminal tourne encore ? (`npm run dev`) : recharge la page (F5) |
| Mes questions n'apparaissent pas | Vérifie `public/questions-utilisateur.json` (chaque question doit avoir un `niveau`), sauvegarde, F5 |

## Pour aller plus loin

- `AGENTS.md` : mode d'emploi technique du projet (stack, règles, arborescence, roadmap mobile).
- `docs/` : documentation complète (index dans `docs/INDEX.md`) — règles du jeu, questions,
 sécurité, déploiement, tests.
- `docs/questions.md` : le format pour écrire tes questions.
- `docs/deploiement.md` : mettre le jeu en ligne (Cloudflare).
