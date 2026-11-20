# Mobile (Capacitor) — roadmap V3

Le code React est réutilisé tel quel ; seule la couche stockage/API change (voir
`docs/stockage-d1.md`).

```bash
npm i @capacitor/core @capacitor/cli
npx cap add android
npx cap add ios
npx cap sync            # après chaque build : npm run build && npx cap sync
npx cap open android    # ouvre Android Studio
```

- Le routing par état (`useNavigation`, PAS de react-router d'URL) est volontaire :
  100 % compatible WPA + Capacitor.
- WPA déjà installable + hors-ligne ; Capacitor embarque la même build (`dist/`).
- V2 (duel en ligne) d'abord : WebSocket `/api/duel/:room` (Durable Object `DuelRoom`)
  + comptes D1 — le mobile en profite directement.
