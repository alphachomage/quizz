# Deployer VoltQuiz sur Cloudflare Workers

VoltQuiz est en ligne sur : **https://voltquiz.joris-leo81.workers.dev**

Le deploiement utilise l'**adaptateur officiel Cloudflare pour Vite**
(`@cloudflare/vite-plugin`) : en local, `npm run dev` fait tourner l'appli dans le
vrai runtime Workers (workerd) ; `npm run deploy` fabrique puis publie le site.

## Premiere fois (une seule fois par ordinateur)

```bash
npm install        # installe les dependances (dont l'adaptateur Cloudflare)
npx wrangler login # ouvre le navigateur : se connecter a son compte Cloudflare et cliquer "Autoriser"
```

Le compte Cloudflare est **gratuit** (100 000 requetes/jour offertes, largement
suffisant pour VoltQuiz).

## Deployer (a chaque modification)

```bash
npm run deploy
```

Cette commande :
1. `vite build` — fabrique la version de production :
   - `dist/client/` = les fichiers statiques (index.html, sw.js de la WPA, icônes, JSON...)
   - `dist/voltquiz/` = le Worker (code serveur) + sa config generee automatiquement
2. `wrangler deploy` — envoie tout sur Cloudflare.

L'URL du site est affichee a la fin, ex. :
`https://voltquiz.joris-leo81.workers.dev`
(`<nom-du-worker>.<sous-domaine-workers.dev>.workers.dev` — le sous-domaine
`joris-leo81` est celui du compte Cloudflare, enregistre une fois pour toutes.)

## Comment ca marche (les 3 fichiers ajoutes)

| Fichier | Rôle |
|---|---|
| `vite.config.js` | contient `cloudflare()` (l'adaptateur) dans les plugins Vite |
| `wrangler.toml` | config Workers : nom `voltquiz`, entree `worker.js`, assets = `public/` en dev, `run_worker_first = true` (chaque requete passe par le Worker) |
| `worker.js` | le code du Worker : sert les fichiers statiques via `env.ASSETS`, repli SPA sur `index.html`, headers `no-cache` pour `sw.js` (WPA), cache 1 an pour `/assets/*`, et une route d'exemple `/api/ping` |

La WPA fonctionne telle quelle en ligne : `sw.js` est servi depuis la racine avec
`Service-Worker-Allowed: /`, donc l'appli reste **installable et hors-ligne**.

## Domaine perso (optionnel)

1. Acheter un nom de domaine (ou en ajouter un gratuit, ex. `.fr` chez un registrar,
   puis changer ses DNS pour Cloudflare).
2. Dans le dashboard Cloudflare > Workers & Pages > `voltquiz` > **Settings > Domains & Routes**
   > ajouter le domaine (ex. `voltquiz.fr`).
3. Ou directement dans `wrangler.toml` :
   ```toml
   routes = [{ pattern = "voltquiz.fr", custom_domain = true }]
   ```

## Pour la V2 (duel en ligne, comptes...)

C'est la que le Worker avec du code sert : ajouter des routes API dans `worker.js`
(ex. `/api/room`), des bindings KV/D1/ Durable Objects dans `wrangler.toml`, etc.
Le client React n'a pas besoin d'etre reecrit.
