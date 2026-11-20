# Sons, vibrations, animations, partage

## Sons (`src/lib/sons.js`) — 100 % Web Audio, aucun fichier

`correct`, `faux`, `tick` (3 dernières secondes), `fin`, `record`, `clic`, `tonnerre`
(déblocage badge). **Son évolutif selon la série** (`sonPourStreak`) : 1-2 = `correct`,
3-5 = 2 chirps, 6-9 = 3 chirps + accord grave, 10+ = 4 chirps + accord large.
Vibrations `navigator.vibrate` qui s'intensifient (paliers 3/6/10). Confettis CSS sur bonne
réponse (si animations ON).

## Musique de fond

`demarrerMusique`/`arreterMusique` : nappe Am7-Fa-Do-Sol en triangle détuné + pluck penta,
gain ~0.055. Toggle « Musique de fond » indépendant des sons, ON par défaut.

## Préférences (`src/lib/prefs.js`, clé `voltquiz_prefs`)

`sons`, `musique`, `animations`, `vibrations` (tous ON par défaut) + accessibilité
`themeClair`/`daltonien`/`dys` (OFF). Modifiables dans Paramètres (`Parametres.jsx`).
`animations: false` -> classe `.sans-animations` sur `.app`.

## Partage du quizz du jour (`src/lib/partage.js` + `usePartage.js`)

Bouton « Partager mon résultat » sur l'écran de résultats du quotidien : X, Facebook,
WhatsApp, Messenger (liens pré-remplis), Instagram/TikTok/story (image 1080x1920 générée
en canvas : fond noir, carte violette, éclair, score, série), partage natif
`navigator.share` (feuille système), « Copier le résultat ». 100 % local.
