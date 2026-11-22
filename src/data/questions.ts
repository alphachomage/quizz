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

import { loadExcluded } from '@lib/exclusions.js';
import { applyOverrides } from '@lib/overrides.js';
import { normalizeQuestionText } from '@lib/text.js';
import {
  getStoredCorpusVersion,
  saveCorpus,
  loadCorpus,
} from '@lib/question-db.js';
import type { Theme } from '@lib/types.js';

import { THEME_MANIFEST, CORPUS_VERSION } from './theme-manifest.js';

// Chargeurs lazy : chemin -> fonction() -> Promise<module>.
// Les modules eux-mêmes sont des chunks JS non typés : leur forme est déclarée
// dans questions.d.ts (contrat) et narrowée ici vers Theme[].
const chargeurs: Record<string, () => Promise<unknown>> = import.meta.glob('./questions-*.js');

const RETIRED_THEMES = ['insolite', 'pop-culture'];

// Métadonnées seules (id, nom, icône, couleur), dispo immédiatement au chargement.
export const THEMES_META: Array<Omit<Theme, 'questions'>> = THEME_MANIFEST.filter(
  (t) => !RETIRED_THEMES.includes(t.id)
);

// Garde de type : un chunk de données est un tableau de thèmes (voir questions.d.ts).
function isThemeArray(value: unknown): value is Theme[] {
  return Array.isArray(value);
}

function fusionner(a: Theme[], b: Theme[]): Theme[] {
  const map = new Map<string, Theme>(a.map((t) => [t.id, { ...t, questions: [...t.questions] }]));
  for (const t of b) {
    const ex = map.get(t.id);
    if (ex) {
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

// Charge tous les chunks questions-*.js et les fusionne (fallback si corpus.json
// est indisponible — appelé une seule fois, au premier lancement ou après un
// changement de CORPUS_VERSION, pour remplir IndexedDB).
async function loadFromChunks(): Promise<Theme[]> {
  const modules = await Promise.all(Object.values(chargeurs).map((f) => f()));
  let tous: Theme[] = [];
  for (const mod of modules) {
    const lot = Object.values(mod as Record<string, unknown>)[0]; // chaque fichier exporte un seul tableau
    if (isThemeArray(lot)) tous = fusionner(tous, lot);
  }
  return tous;
}

// Charge le corpus complet : d'abord public/corpus.json (1 requête, généré au build
// par scripts/gen-corpus-json.mjs, précaché par la PWA car dans public/), fallback sur
// les chunks JS si le fetch échoue ou si la version ne correspond pas.
async function loadFromCorpus(): Promise<Theme[]> {
  try {
    const r = await fetch('/corpus.json');
    if (r.ok) {
      const data = (await r.json()) as { version?: string; themes?: unknown };
      if (
        data &&
        data.version === CORPUS_VERSION &&
        Array.isArray(data.themes) &&
        data.themes.length > 0 &&
        data.themes.every(
          (t) => t && typeof t === 'object' && Array.isArray((t as Theme).questions)
        )
      ) {
        return data.themes as unknown as Theme[];
      }
    }
  } catch {
    // fetch échoué (hors-ligne, test) : fallback chunks
  }
  return loadFromChunks();
}

// Applique les exclusions admin + les overrides (supprimer/modifier) + filtre les thèmes
// retirés. Les fichiers source ne sont jamais modifiés.
function applyExclusions(tous: Theme[]): Theme[] {
  // Questions retirées du pool par l'admin (signalées puis vérifiées comme mauvaises) :
  // elles ne sont plus jamais tirées, mais les fichiers source ne sont pas modifiés.
  const exclues = new Set(loadExcluded());
  if (exclues.size > 0) {
    for (const t of tous) {
      t.questions = t.questions.filter((q) => !exclues.has(normalizeQuestionText(q.q)));
    }
  }
  // Overrides admin (modifier/supprimer une question du corpus sans toucher aux fichiers).
  const avecOverrides = applyOverrides(tous);
  return avecOverrides.filter((t) => !RETIRED_THEMES.includes(t.id));
}

// Charge TOUTES les questions : d'abord depuis IndexedDB si la version du corpus
// correspond (rapide), sinon depuis les chunks JS (lent, une seule fois) + indexation
// dans IndexedDB pour les prochains démarrages. Repli gracieux si IndexedDB est
// indisponible (navigation privée, vieux navigateur) : on retombe sur les chunks.
export async function loadThemes(): Promise<Theme[]> {
  try {
    const stored = await getStoredCorpusVersion();
    if (stored === CORPUS_VERSION) {
      const fromDb = await loadCorpus(THEME_MANIFEST);
      if (fromDb.length > 0) return applyExclusions(fromDb);
    }
  } catch {
    // IndexedDB indisponible : on ignore et on passe aux chunks
  }
  const tous = await loadFromCorpus();
  try {
    await saveCorpus(tous, CORPUS_VERSION);
  } catch {
    // IndexedDB indisponible : on joue sans cache, le corpus est déjà chargé
  }
  return applyExclusions(tous);
}
