// Point d'entrée unique pour TOUTES les questions intégrées.
// Charge AUTOMATIQUEMENT tous les fichiers questions-*.js de ce dossier
// (chaque fichier exporte UN SEUL tableau de thèmes) et les fusionne par id de
// thème : mêmes thèmes = questions AJOUTÉES, jamais supprimées.
// Les thèmes "insolite" et "pop-culture" ont été retirés : leurs questions ont été
// reclassées dans les autres thèmes via questions-redistribution.js.

function fusionner(a, b) {
  const map = new Map(a.map((t) => [t.id, { ...t, questions: [...t.questions] }]));
  for (const t of b) {
    if (map.has(t.id)) {
      const ex = map.get(t.id);
      ex.questions.push(...t.questions);
      // si le thème a été créé sans métadonnées (ex: via la redistribution), on les complète
      if (!ex.nom && t.nom) {
        ex.nom = t.nom;
        ex.icone = t.icone;
        ex.couleur = t.couleur;
      }
    } else {
      map.set(t.id, t);
    }
  }
  return [...map.values()];
}

import { chargerExclues, normaliserTexteQuestion } from '@lib/index.js';

const modules = import.meta.glob('./questions-*.js', { eager: true });

let tous = [];
for (const mod of Object.values(modules)) {
  const lot = Object.values(mod)[0]; // chaque fichier exporte un seul tableau
  if (Array.isArray(lot)) tous = fusionner(tous, lot);
}

const THEMES_RETIRES = ['insolite', 'pop-culture'];

// Questions retirées du pool par l'admin (signalées puis vérifiées comme mauvaises) :
// elles ne sont plus jamais tirées, mais les fichiers source ne sont pas modifiés.
const EXCLUES = new Set(chargerExclues());
if (EXCLUES.size > 0) {
  for (const t of tous) {
    t.questions = t.questions.filter((q) => !EXCLUES.has(normaliserTexteQuestion(q.q)));
  }
}

export const THEMES = tous.filter((t) => !THEMES_RETIRES.includes(t.id));
