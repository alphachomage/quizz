// index.js — barrel de la couche lib/ (strangler fig).
// Pendant la migration, les composants peuvent importer depuis '@lib' (ce fichier) ;
// à terme chaque import pointe directement vers le module concerné.
// R1 : lib/ n'importe JAMAIS react, components/, features/, shared/ ni app/.
export * from './storage.js';
export * from './prefs.js';
export * from './scoring.js';
export * from './tirage.js';
export * from './dates.js';
export * from './streak.js';
export * from './texte.js';
export * from './xp.js';
export * from './series.js';
export * from './records.js';
export * from './soumissions.js';
export * from './signalements.js';
export * from './suggestions.js';
export * from './exclusions.js';
export * from './parties-historique.js';
export * from './reset.js';
export * from './comptes.js';
export * from './moderation.js';
export * from './badges.js';
export * from './titres.js';
export * from './similarite.js';
export * from './avatar.js';
export * from './partage.js';
export * from './sons.js';
