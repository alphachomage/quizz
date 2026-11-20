// Point d'entrée pour TOUTES les questions intégrées.
//
// Les fichiers questions-*.js sont des CHUNKS chargés À LA DEMANDE (glob lazy) :
// le chunk initial de l'appli ne contient plus les ~13 500 questions (2,7 Mo),
// seulement leurs métadonnées (manifest-themes.js, généré, ~2 Ko).
// La WPA reste 100 % hors-ligne : workbox précache tous les chunks émis.
//
// Chaque fichier exporte UN SEUL tableau de thèmes ; la fusion se fait par id :
// mêmes thèmes = questions AJOUTÉES, jamais supprimées.
// Les thèmes "insolite" et "pop-culture" ont été retirés : leurs questions ont été
// reclassées dans les autres thèmes via questions-redistribution.js.

import { chargerExclues, normaliserTexteQuestion } from '@lib/index.js';

import { MANIFEST_THEMES } from './manifest-themes.js';

// Chargeurs lazy : chemin -> fonction() -> Promise<module>
const chargeurs = import.meta.glob('./questions-*.js');

const THEMES_RETIRES = ['insolite', 'pop-culture'];

// Métadonnées seules (id, nom, icône, couleur), dispo immédiatement au chargement.
export const THEMES_META = MANIFEST_THEMES.filter((t) => !THEMES_RETIRES.includes(t.id));

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

// Charge TOUTES les questions (tous les chunks) et applique les exclusions admin.
export async function chargerThemes() {
  const modules = await Promise.all(Object.values(chargeurs).map((f) => f()));
  let tous = [];
  for (const mod of modules) {
    const lot = Object.values(mod)[0]; // chaque fichier exporte un seul tableau
    if (Array.isArray(lot)) tous = fusionner(tous, lot);
  }
  // Questions retirées du pool par l'admin (signalées puis vérifiées comme mauvaises) :
  // elles ne sont plus jamais tirées, mais les fichiers source ne sont pas modifiés.
  const exclues = new Set(chargerExclues());
  if (exclues.size > 0) {
    for (const t of tous) {
      t.questions = t.questions.filter((q) => !exclues.has(normaliserTexteQuestion(q.q)));
    }
  }
  return tous.filter((t) => !THEMES_RETIRES.includes(t.id));
}
