// index.js — barrel de la couche lib/ (strangler fig).
// Pendant la migration, les composants peuvent importer depuis './@lib' (ce fichier) ;
// à terme chaque import pointe directement vers le module concerné.
// R1 : lib/ n'importe JAMAIS react, features/, shared/ ni app/.
export * from './storage.js';
export * from './prefs.js';
export * from './scoring.js';
export * from './draw.js';
export * from './dates.js';
export * from './streak.js';
export * from './texte.js';
export * from './xp.js';
export * from './series.js';
export * from './records.js';
export * from './submissions.js';
export * from './reports.js';
export * from './suggestions.js';
export * from './exclusions.js';
export * from './game-history.js';
export * from './reset.js';
export * from './accounts.js';
export * from './moderation.js';
export * from './badges.js';
export * from './titles.js';
export * from './similarity.js';
export * from './avatar.js';
export * from './share.js';
export * from './sounds.js';
