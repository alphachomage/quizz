# Sons, vibrations, animations, partage

## Sons (`src/lib/sounds.js`) — 100 % Web Audio, aucun fichier

`playSound` : `correct`, `faux`, `tick` (3 dernières secondes), `fin`, `record`,
`clic`, `tonnerre` (déblocage badge). **Son évolutif selon la série**
(`soundForStreak`) : 1-2 = `correct`, 3-5 = 2 chirps, 6-9 = 3 chirps + accord grave,
10+ = 4 chirps + accord large.
Vibrations `navigator.vibrate` (`vibrate`) qui s'intensifient (paliers 3/6/10).
Confettis CSS sur bonne réponse (si animations ON).

## Musique de fond

`startMusic`/`stopMusic` : nappe Am7-Fa-Do-Sol en triangle détuné + pluck penta,
gain ~0.055. Toggle « Musique de fond » indépendant des sons, ON par défaut.

## Préférences (`src/lib/prefs.js`, clé `voltquiz_prefs`)

`loadPrefs`/`savePrefs` : `sons`, `musique`, `animations`, `vibrations` (tous ON par
défaut) + accessibilité `themeClair`/`daltonien`/`dys` (OFF). Modifiables dans
Paramètres (`src/shared/modals/Settings.jsx`).
`animations: false` -> classe `.sans-animations` sur `.app`.

## Partage du quizz du jour (`src/lib/share.js` + `src/features/results/useShare.js`)

Bouton « Partager mon résultat » sur l'écran de résultats du quotidien
(`src/features/results/components/ShareModal.jsx`) : X, Facebook, WhatsApp, Messenger
(liens pré-remplis via `shareLinks`), Instagram/TikTok/story (image 1080x1920
générée en canvas par `storyImage` : fond noir, carte, éclair, score, série), partage
natif `navigator.share` (`shareNative`, feuille système), « Copier le résultat »
(`copyToClipboard`). Texte via `shareText`. 100 % local.
