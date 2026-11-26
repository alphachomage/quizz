// Tests de src/lib/question-db.ts (persistance du corpus dans IndexedDB).
// jsdom ne fournit pas IndexedDB : on branche un stub en mémoire suffisant pour
// open/transaction/objectStore/get/put/add/clear/getAll/index.getAll.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Theme } from '@lib/types.js';

// --- Stub IndexedDB en mémoire ---
type Row = Record<string, unknown> & { id?: number };

// Requête factice : le handler onsuccess est posé par le code testé juste après
// l'appel ; on le déclenche dans un microtask (après cette assignation synchrone).
function requete<T>(result: T): {
  onsuccess: null | (() => void);
  onerror: null | (() => void);
  result: T;
  error: null;
} {
  const req: {
    onsuccess: null | (() => void);
    onerror: null | (() => void);
    result: T;
    error: null;
  } = { onsuccess: null, onerror: null, result, error: null };
  queueMicrotask(() => req.onsuccess?.());
  return req;
}

class StoreStub {
  rows = new Map<number, Row>();
  autoInc = 1;
  indexes = new Map<string, string | string[]>();
  constructor(
    public name: string,
    public keyPath: string
  ) {}
  createIndex(name: string, keyPath: string | string[]): void {
    this.indexes.set(name, keyPath);
  }
  private cle(row: Row): number {
    if (this.keyPath === 'id' && row.id === undefined) row.id = this.autoInc++;
    return row[this.keyPath] as number;
  }
  add(row: Row) {
    const k = this.cle(row);
    this.rows.set(k, { ...row });
    return requete(k);
  }
  put(row: Row) {
    const k = this.cle(row);
    this.rows.set(k, { ...row });
    return requete(k);
  }
  get(key: unknown) {
    const row = this.rows.get(key as number);
    return requete(row ? { ...row } : undefined);
  }
  clear() {
    this.rows.clear();
    return requete(undefined);
  }
  getAll() {
    return requete([...this.rows.values()].map((r) => ({ ...r })));
  }
  index(name: string) {
    const kp = this.indexes.get(name)!;
    const store = this;
    return {
      getAll(key?: unknown) {
        const match = (r: Row): boolean => {
          if (Array.isArray(kp)) return JSON.stringify(kp.map((k) => r[k])) === JSON.stringify(key);
          return key === undefined || r[kp] === key;
        };
        return requete([...store.rows.values()].filter(match).map((r) => ({ ...r })));
      },
    };
  }
}

class DbStub {
  stores = new Map<string, StoreStub>();
  createObjectStore(name: string, opts: { keyPath: string }): StoreStub {
    const s = new StoreStub(name, opts.keyPath);
    this.stores.set(name, s);
    return s;
  }
  get objectStoreNames(): { contains: (n: string) => boolean } {
    return { contains: (n: string) => this.stores.has(n) };
  }
  transaction(_names: string[], _mode: string) {
    const db = this;
    const tx = {
      oncomplete: null as null | (() => void),
      onerror: null as null | (() => void),
      onabort: null as null | (() => void),
      error: null as unknown,
      objectStore(name: string) {
        return db.stores.get(name)!;
      },
    };
    // La transaction se termine après les appels synchrones de la méthode appelante.
    queueMicrotask(() => tx.oncomplete?.());
    return tx;
  }
}

function installerStubIDB(): void {
  const bases = new Map<string, DbStub>();
  vi.stubGlobal('indexedDB', {
    open(name: string, _version: number) {
      const req = {
        result: undefined as unknown as DbStub,
        error: null as unknown,
        onupgradeneeded: null as null | (() => void),
        onsuccess: null as null | (() => void),
        onerror: null as null | (() => void),
      };
      queueMicrotask(() => {
        let db = bases.get(name);
        if (!db) {
          db = new DbStub();
          bases.set(name, db);
        }
        req.result = db;
        req.onupgradeneeded?.();
        req.onsuccess?.();
      });
      return req;
    },
  });
}

// --- Helpers de test ---
const THEMES: Theme[] = [
  {
    id: 'culture-generale',
    nom: 'Culture générale',
    icone: 'globe',
    couleur: '#818cf8',
    questions: [
      { q: 'Capitale de la France ?', reponses: ['Paris', 'Lyon'], bonne: 0, niveau: 'moyen' },
      { q: 'Combien font 2+2 ?', reponses: ['3', '4'], bonne: 1, niveau: 'facile' },
    ],
  },
  {
    id: 'sport',
    nom: 'Sport',
    icone: 'ball',
    couleur: '#4ade80',
    questions: [{ q: 'Joueurs au foot ?', reponses: ['9', '11'], bonne: 1, niveau: 'facile' }],
  },
];
const META = THEMES.map(({ questions: _q, ...m }) => m);

beforeEach(() => {
  installerStubIDB();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('question-db — persistance IndexedDB du corpus', () => {
  it('saveCorpus puis loadCorpus reconstruit les thèmes avec leurs questions', async () => {
    const db = await import('@lib/question-db.js');
    await db.saveCorpus(THEMES, 'v1');
    const relu = await db.loadCorpus(META);
    expect(relu).toHaveLength(2);
    const cg = relu.find((t) => t.id === 'culture-generale')!;
    expect(cg.nom).toBe('Culture générale');
    expect(cg.questions).toHaveLength(2);
    expect(cg.questions[0].q).toBe('Capitale de la France ?');
    expect(cg.questions[0].reponses).toEqual(['Paris', 'Lyon']);
    expect(cg.questions[0].bonne).toBe(0);
  });

  it('getStoredCorpusVersion renvoie la version sauvée, null avant', async () => {
    const db = await import('@lib/question-db.js');
    expect(await db.getStoredCorpusVersion()).toBeNull();
    await db.saveCorpus(THEMES, 'v1');
    expect(await db.getStoredCorpusVersion()).toBe('v1');
  });

  it('saveCorpus remplace l’ancien corpus (clear avant put)', async () => {
    const db = await import('@lib/question-db.js');
    await db.saveCorpus(THEMES, 'v1');
    await db.saveCorpus([THEMES[1]], 'v2'); // un seul thème
    const relu = await db.loadCorpus(META);
    expect(relu).toHaveLength(1);
    expect(relu[0].id).toBe('sport');
  });
});
