# ✏️ Comment ajouter MES questions dans VoltQuiz

**Le plus simple : passe par l'appli** — bouton « Proposer une question » sur l'accueil :
l'appli détecte automatiquement les questions similaires (doublons) avant d'ajouter,
et tu peux tout exporter en JSON ensuite avec le bouton « Exporter en JSON ».

Sinon, tu peux remplir directement un fichier texte au format JSON (méthode ci-dessous).

## 📄 Le fichier à remplir

Ouvre avec le **Bloc-notes** le fichier :

```
C:\Users\Joris\Downloads\QUIZZWALLAH\public\questions-utilisateur.json
```

## 🧩 Le format (exemple complet)

```json
{
  "themes": [
    {
      "id": "ma-famille",
      "nom": "Ma famille",
      "icone": "sparkles",
      "couleur": "#ff6600",
      "questions": [
        {
          "q": "Comment s'appelle notre chien ?",
          "reponses": ["Rex", "Médor", "Patapouf", "Biscotte"],
          "bonne": 2,
          "niveau": "facile",
          "info": "Il adore les balades en forêt."
        },
        {
          "q": "En quelle année mes parents se sont-ils rencontrés ?",
          "reponses": ["2008", "2010", "2012", "2015"],
          "bonne": 1,
          "niveau": "dur"
        }
      ]
    }
  ]
}
```

## 📖 Les règles à respecter

| Champ | Explication |
|---|---|
| `id` | Identifiant unique du thème, en minuscules avec des tirets (ex: `ma-famille`). **Même id qu'un thème existant** (ex: `sport`) = tes questions sont **ajoutées** à ce thème. |
| `nom` | Nom affiché dans l'appli. |
| `icone` | **Nom d'une icône SVG** (pas d'emoji !) : `globe`, `film`, `music`, `ball`, `gamepad`, `sparkles`, `question`, `pin`. |
| `couleur` | Couleur en hexadécimal (ex: `#ff6600`). Tu peux copier celle d'un autre thème. |
| `q` | Texte de la question. |
| `reponses` | Liste des réponses : **entre 2 et 4**. |
| `bonne` | **Numéro de la bonne réponse** : `0` = 1ʳᵉ, `1` = 2ᵉ, `2` = 3ᵉ, `3` = 4ᵉ. ⚠️ Piège classique ! |
| `niveau` | **Obligatoire** : `"facile"`, `"moyen"` ou `"dur"`. En solo, la question apparaîtra uniquement au niveau choisi. En duel, tous les niveaux sont mélangés. |
| `info` | Anecdote affichée après la réponse. **Optionnel** : tu peux supprimer la ligne. |

## ⚠️ Les 3 erreurs qui cassent le fichier

1. **Virgule en trop à la fin** d'une liste (ex: `["A", "B",]` ❌).
2. **Guillemets simples** (`'`) au lieu de doubles (`"`) ❌.
3. Accolade `}` ou crochet `]` oublié ❌.

Astuce : sauvegarde (**Ctrl + S**) puis recharge la page de l'appli (**F5**).
Si le fichier est cassé, l'appli garde simplement les questions intégrées — rien n'est perdu.

## ✅ Vérifier que le fichier est valide

Dans le terminal du projet :

```powershell
npm run build
```

Si la commande se termine sans erreur, ton fichier est valide.
