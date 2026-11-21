# Ajouter mes propres questions

Voir **docs/questions.md** : format JSON (clés en français : `q`, `reponses`, `bonne`,
`niveau`, `info`), proposition depuis l'appli avec détection de similarité + validation
manuelle (`?admin=1`), ou fichier `public/questions-utilisateur.json` (validé au chargement).

Compteur officiel du corpus (thèmes, questions, doublons) : `npm run count:questions`.
Ne jamais modifier les fichiers existants de `src/data/questions-*.js` : ajout uniquement.
