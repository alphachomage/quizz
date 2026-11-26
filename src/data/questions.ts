// Point d'entrée pour TOUTES les questions intégrées.
//
// Source de vérité : content/themes.json + content/questions/<theme>.json (voir
// docs/questions.md). Le chemin normal est public/corpus.json (généré) puis IndexedDB ;
// les fichiers content/questions/*.json ne sont chargés (chunks lazy, glob non eager)
// qu'en repli si corpus.json est indisponible. Le chunk initial de l'appli ne contient que
// les métadonnées des thèmes (theme-manifest.js, généré depuis content/themes.json).
// Les thèmes retirés (actif:false dans themes.json) n'apparaissent ni dans le manifeste
// ni dans le corpus servi.

import { loadExcluded } from '@lib/exclusions.js';
import { applyOverrides } from '@lib/overrides.js';
import { normalizeQuestionText } from '@lib/text.js';
import {
  getStoredCorpusVersion,
  saveCorpus,
  loadCorpus,
} from '@lib/question-db.js';
import type { Question, Theme } from '@lib/types.js';

import { THEME_MANIFEST, CORPUS_VERSION } from './theme-manifest.js';

interface ThemeFile {
  theme: string;
  questions: Question[];
}

// Chargeurs lazy : chemin -> fonction() -> Promise<contenu JSON du thème>.
const chargeurs = import.meta.glob<ThemeFile>('../../content/questions/*.json', {
  import: 'default',
});

// Métadonnées seules (id, nom, icône, couleur), dispo immédiatement au chargement.
export const THEMES_META: Array<Omit<Theme, 'questions'>> = THEME_MANIFEST;

// Repli : charge les fichiers content/questions/<theme>.json des thèmes actifs, dans l'ordre
// du manifeste (corpus.json indisponible — appelé une seule fois, au premier lancement ou
// après un changement de CORPUS_VERSION, pour remplir IndexedDB).
async function loadFromChunks(): Promise<Theme[]> {
  const parId = new Map(
    Object.entries(chargeurs).map(([chemin, charger]) => [
      chemin.replace(/^.*\/(.+)\.json$/, '$1'),
      charger,
    ])
  );
  const themes: Theme[] = [];
  for (const meta of THEME_MANIFEST) {
    const charger = parId.get(meta.id);
    if (!charger) continue;
    const fichier = await charger();
    themes.push({ ...meta, questions: fichier.questions });
  }
  return themes;
}

// Charge le corpus complet : d'abord public/corpus.json (1 requête, généré au build
// par scripts/gen-corpus-json.mjs, précaché par la PWA car dans public/), fallback sur
// les chunks JSON si le fetch échoue ou si la version ne correspond pas.
async function loadFromCorpus(): Promise<Theme[]> {
  try {
    // BASE_URL : '/' en prod, './' quand l'appli est servie depuis un sous-dossier (atelier)
    const r = await fetch(`${import.meta.env.BASE_URL}corpus.json`);
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

// Applique les exclusions admin + les overrides (supprimer/modifier). Les fichiers source
// ne sont jamais modifiés.
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
  return applyOverrides(tous);
}

// Charge TOUTES les questions : d'abord depuis IndexedDB si la version du corpus
// correspond (rapide), sinon depuis corpus.json puis les chunks JSON (lent, une seule fois)
// + indexation dans IndexedDB pour les prochains démarrages. Repli gracieux si IndexedDB est
// indisponible (navigation privée, vieux navigateur) : on retombe sur corpus.json/chunks.
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
