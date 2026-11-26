# Boîte de dépôt des nouvelles questions

Déposer ici un fichier `<nom-libre>.json` (un par personne ou par agent) :

```json
{
  "theme": "<id présent dans content/themes.json>",
  "questions": [
    {"q":"...","reponses":["...","...","...","..."],"bonne":0,"niveau":"facile","info":"optionnel"}
  ]
}
```

Pas d'`id` : il est attribué à l'import. Puis :

```bash
npm run questions:import -- --dry-run   # simulation
npm run questions:import                # import réel (les refus restent ici, annotés "rejet")
```

Procédure complète et règles qualité : `docs/ajouter-questions.md`.
