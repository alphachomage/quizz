# Mobile (Capacitor) — roadmap V3

Le code React est réutilisé tel quel ; seule la couche stockage/API change (décision
documentée dans `docs/stockage-d1.md` : sur Capacitor natif, `Preferences` /
`SecureStorage` remplacent le localStorage, jamais de hash/mot de passe en clair).

```bash
npm i @capacitor/core @capacitor/cli
npx cap add android
npx cap add ios
npx cap sync            # après chaque build : npm run build && npx cap sync
npx cap open android    # ouvre Android Studio
```

- Le routing par état (`src/app/useNavigation.ts`, PAS de react-router d'URL) est
  volontaire : 100 % compatible PWA + Capacitor.
- PWA déjà installable + hors-ligne ; Capacitor embarque la même build (`dist/`).
- V2 (duel en ligne) d'abord : WebSocket `/api/duel/:room` (Durable Object
  `durable-objects/DuelRoom.ts`) + comptes D1 — le mobile en profite directement.
