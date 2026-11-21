# VoltQuiz — Guide de lancement (sans être développeur)

Ce guide t'explique, étape par étape, comment faire tourner **VoltQuiz** sur ton PC Windows.
Aucune compétence en code n'est nécessaire : il suffit de copier-coller quelques commandes.

---

## Créer ton compte (à chaque ouverture de l'appli)

Au lancement, crée ton compte : **pseudo + e-mail + mot de passe** ( caractères min).
Tout est stocké **uniquement sur ton PC** (mot de passe hashé, jamais en clair).
Le pseudo est vérifié automatiquement : les pseudos haineux, discriminatoires ou insultants
(y compris déguisés, type « nz ») sont refusés. Tu peux te déconnecter via le bouton à côté
de ton pseudo en haut de l'accueil.

---

## Prérequis : Node.js (déjà fait sur ce PC)

**Node.js** est le « moteur » qui fait tourner le projet.

> Déjà installé sur ce PC : Node.js v dans `%LOCALAPPDATA%\nodejs`, ajouté au PATH.
> Sur un autre PC : va sur **https://nodejs.org/fr**, télécharge la version **LTS** (fichier `.msi`),
> installe-le (Suivant / Suivant / Installer), puis ferme et rouvre le terminal.

---

## Ouvrir un terminal dans le dossier du projet

. Explorateur de fichiers `C:\Users\Joris\Downloads\QUIZZWALLAH`.
. **Clic droit** dans le dossier **« Ouvrir dans Terminal »**.
. Une fenêtre s'ouvre : c'est le **terminal**.

---

## Installer les dépendances (une seule fois)

```powershell
npm install
```

( à minutes. Le dossier `node_modules/` apparaît : ne le supprime pas.)

---

## Lancer l'appli

```powershell
npm run dev
```

Puis ouvre **http://localhost:** dans Chrome ou Edge.

**Ne ferme pas la fenêtre du terminal** : c'est elle qui fait tourner l'appli.
Pour **arrêter** : `Ctrl + C` dans le terminal.

 **Comment jouer** : choisis **Solo** (puis un niveau : Facile / Moyen / Dur) ou **Duel v**
(deux joueurs sur le même PC, pseudos suggérés si déjà vus), puis un thème, et c'est parti !

**Règles** : s par question, questions en solo ( par joueur en duel), en ** manches** dont
la dernière en **bonus ×**. Bonne réponse = ** pts − pt par seconde passée** (min ), si faux.
Les réponses s'enchaînent automatiquement. Chaque partie rapporte de **l'XP au thème** : monte de
**niveau par thème** (badge « Niv. X » sur chaque carte). À partir du **niveau dans un thème**, tu
peux y **proposer tes propres questions** (bouton « Proposer une question », avec détection de
doublons et validation manuelle). Le **leaderboard** (bouton dédié) récapitule les meilleurs scores.

---

## Installer VoltQuiz comme une vraie appli (WPA)

Une **WPA** = un site qu'on installe comme une appli : icône sur le bureau, fenêtre dédiée,
fonctionne même **sans internet**.

. Dans la barre d'adresse, à droite de `localhost:`, clique sur **⨁ « Installer »**
 (ou menu ⋮ « Installer VoltQuiz »).
. L'icône **V** de VoltQuiz apparaît sur le bureau et dans le menu Démarrer.

---

## Proposer une question depuis l'appli (le plus simple)

. Sur l'accueil, clique sur **« Proposer une question »**.
. Remplis : thème, niveau (Facile/Moyen/Dur), la question, à réponses (coche la bonne), anecdote optionnelle.
. Pendant que tu écris, l'appli signale en direct si une question ressemble déjà à la tienne.
. Au clic sur **« Vérifier et ajouter »**, si des questions similaires existent, elles s'affichent
 avec leur pourcentage de ressemblance (et leur thème) : tu confirmes ou tu modifies.
. La question est ajoutée immédiatement (jouable dans le thème choisi) et apparaît dans la liste
 **« Questions proposées »** en bas de l'accueil, où tu peux la supprimer.
. Bouton **« Exporter en JSON »** : télécharge un fichier `questions-utilisateur.json` prêt à l'emploi
 copie-le dans `public/` pour rendre tes questions permanentes et partageables.

## bis Ajouter des questions à la main (méthode fichier)

Remplis le fichier `public/questions-utilisateur.json` en suivant
**`COMMENT-AJOUTER-MES-QUESTIONS.md`** (format simple, chaque question a un niveau
`facile` / `moyen` / `dur`). Sauvegarde recharge la page (F) tes questions sont là.

---

## Version « production » locale (optionnel)

```powershell
npm run build
npm run preview
```

Puis ouvre **http://localhost:** (version optimisée, idéale pour l'installation WPA).

---

## 🆘 En cas de problème

| Symptôme | Solution |
|---|---|
| `npm` ou `node` « n'est pas reconnu » | Node.js non installé (étape ) ou terminal ouvert avant l'install ferme et rouvre le terminal |
| Port « déjà utilisé » | L'appli tourne déjà dans une autre fenêtre va directement sur http://localhost: |
| Page blanche | Le terminal tourne encore ? (`npm run dev`) recharge la page (F) |
| Mes questions n'apparaissent pas | Vérifie `public/questions-utilisateur.json` (chaque question doit avoir un `niveau`), sauvegarde, F |

## Pour aller plus loin

- `AGENTS.md` : mode d'emploi technique du projet (stack, règles, arborescence, roadmap mobile).
- `COMMENT-AJOUTER-MES-QUESTIONS.md` : le format pour écrire tes questions.
- `make-icons.ps` : régénère les icônes PNG de l'appli (si tu changes le logo).
