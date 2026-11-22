// Tests de la logique de chargement de src/data/questions.ts :
// loadThemes() doit lire depuis IndexedDB quand la version du corpus correspond,
// et retomber sur les chunks JS (import.meta.glob) sinon ou si IndexedDB est
// indisponible — en indexant alors le corpus dans IDB pour la prochaine fois.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Theme } from '@lib/types.js';

// --- Mock du module question-db (couche IndexedDB) ---
const getStoredCorpusVersion = vi.fn<() => Promise<string | null>>();
const saveCorpus = vi.fn<(t: Theme[], v: string) => Promise<void>>();
const loadCorpus = vi.fn<(m: unknown) => Promise<Theme[]>>();
vi.mock('@lib/question-db.js', () => ({
  getStoredCorpusVersion: () => getStoredCorpusVersion(),
  saveCorpus: (t: Theme[], v: string) => saveCorpus(t, v),
  loadCorpus: (m: unknown) => loadCorpus(m),
}));

// Le vrai CORPUS_VERSION du manifest généré (tests tournés après `npm run gen:manifest`).
import { CORPUS_VERSION } from '@/data/theme-manifest.js';

const THEMES_FACTICES: Theme[] = [
  {
    id: 'culture-generale',
    nom: 'Culture générale',
    icone: 'globe',
    couleur: '#818cf8',
    questions: [{ q: 'Capitale de la France ?', reponses: ['Paris', 'Lyon'], bonne: 0, niveau: 'moyen' }],
  },
];

beforeEach(() => {
  vi.resetModules();
  getStoredCorpusVersion.mockReset();
  saveCorpus.mockReset();
  loadCorpus.mockReset();
});

describe('loadThemes — IndexedDB vs chunks', () => {
  it('version IDB = CORPUS_VERSION -> lit depuis IDB, ne sauvegarde pas', async () => {
    getStoredCorpusVersion.mockResolvedValue(CORPUS_VERSION);
    loadCorpus.mockResolvedValue(THEMES_FACTICES);
    const { loadThemes } = await import('@/data/questions.js');
    const themes = await loadThemes();
    expect(loadCorpus).toHaveBeenCalledTimes(1);
    expect(saveCorpus).not.toHaveBeenCalled();
    expect(themes).toHaveLength(1);
    expect(themes[0].id).toBe('culture-generale');
  });

  it('version IDB différente -> charge les chunks et indexe dans IDB', async () => {
    getStoredCorpusVersion.mockResolvedValue('ancienne-version');
    saveCorpus.mockResolvedValue(undefined);
    const { loadThemes } = await import('@/data/questions.js');
    const themes = await loadThemes();
    // Les vrais chunks sont chargés (le corpus réel a 12 thèmes actifs après filtrage).
    expect(themes.length).toBeGreaterThanOrEqual(12);
    expect(saveCorpus).toHaveBeenCalledTimes(1);
    expect(saveCorpus.mock.calls[0][1]).toBe(CORPUS_VERSION);
  });

  it('IndexedDB indisponible (throw) -> fallback chunks sans planter', async () => {
    getStoredCorpusVersion.mockRejectedValue(new Error('indexedDB absent'));
    saveCorpus.mockRejectedValue(new Error('indexedDB absent'));
    const { loadThemes } = await import('@/data/questions.js');
    const themes = await loadThemes();
    expect(themes.length).toBeGreaterThanOrEqual(12);
  });

  it('IDB à jour mais vide (loadCorpus renvoie []) -> recharge les chunks', async () => {
    getStoredCorpusVersion.mockResolvedValue(CORPUS_VERSION);
    loadCorpus.mockResolvedValue([]);
    saveCorpus.mockResolvedValue(undefined);
    const { loadThemes } = await import('@/data/questions.js');
    const themes = await loadThemes();
    expect(themes.length).toBeGreaterThanOrEqual(12);
    expect(saveCorpus).toHaveBeenCalledTimes(1);
  });
});
