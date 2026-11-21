# Déployer VoltQuiz en ligne (Cloudflare Workers)

Voir **docs/deploiement.md** : les 4 environnements (`npm run dev` local 5173,
`npm run preview` local 4173, `npm run deploy:preview` Cloudflare preview avec
V2_ENABLED=true, `npm run deploy` production avec V2_ENABLED=false), la CI GitHub
Actions (lint + tests + couverture + build, deploy preview sur PR, deploy prod sur
main, secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`), et
`npx wrangler deploy --dry-run` avant chaque commit touchant au worker.
Vérifier la prod : `curl -s https://voltquiz.joris-leo81.workers.dev/api/ping`.
