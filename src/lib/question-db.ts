// question-db.ts — persistance du corpus de questions dans IndexedDB.
// Objectif : au premier lancement (ou après un changement de version du corpus),
// on charge les 263 chunks JS une fois et on indexe tout dans IndexedDB ;
// aux démarrages suivants, on lit depuis IndexedDB (bien plus rapide que
// 263 requêtes de chunks + parsing JS).
//
// Module PUR (zéro React) : IndexedDB est un global navigateur (pas couvert par R5
// qui ne vise que localStorage/sessionStorage/location).
//
// Schéma :
//   base "voltquiz-questions" v1
//   - store "meta"      (keyPath "key")   -> { key: "corpus_version", value: string }
//   - store "questions" (keyPath "id", autoIncrement)
//       index "by_theme"         sur "themeId"
//       index "by_theme_niveau"  sur ["themeId", "niveau"]
//     question stockée : { themeId, q, reponses, bonne, niveau, info? }

import type { Question, Theme } from './types.js';

const DB_NAME = 'voltquiz-questions';
const DB_VERSION = 1;
const STORE_META = 'meta';
const STORE_QUESTIONS = 'questions';

// Question telle que stockée dans IndexedDB (aplatie, avec son themeId).
export interface StoredQuestion extends Question {
  themeId: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_QUESTIONS)) {
        const store = db.createObjectStore(STORE_QUESTIONS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('by_theme', 'themeId', { unique: false });
        store.createIndex('by_theme_niveau', ['themeId', 'niveau'], { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// Version du corpus actuellement indexée dans IndexedDB (null si jamais indexé).
export async function getStoredCorpusVersion(): Promise<string | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readonly');
    const req = tx.objectStore(STORE_META).get('corpus_version');
    req.onsuccess = () => resolve((req.result as { value: string } | undefined)?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}

// Indexe tout le corpus (thèmes aplatis) dans IndexedDB + mémorise la version.
export async function saveCorpus(themes: Theme[], version: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([STORE_META, STORE_QUESTIONS], 'readwrite');
  tx.objectStore(STORE_META).put({ key: 'corpus_version', value: version });
  const store = tx.objectStore(STORE_QUESTIONS);
  store.clear();
  for (const t of themes) {
    for (const q of t.questions) {
      const sq: StoredQuestion = {
        themeId: t.id,
        q: q.q,
        reponses: q.reponses,
        bonne: q.bonne,
        niveau: q.niveau,
      };
      if (q.info) sq.info = q.info;
      store.add(sq);
    }
  }
  await txDone(tx);
}

// Lit tout le corpus depuis IndexedDB et reconstruit les thèmes (métadonnées fournies
// par l'appelant — lib/ ne dépend pas de data/, R2).
export async function loadCorpus(themesMeta: Array<Omit<Theme, 'questions'>>): Promise<Theme[]> {
  const db = await openDb();
  const rows = await new Promise<StoredQuestion[]>((resolve, reject) => {
    const tx = db.transaction(STORE_QUESTIONS, 'readonly');
    const req = tx.objectStore(STORE_QUESTIONS).getAll();
    req.onsuccess = () => resolve(req.result as StoredQuestion[]);
    req.onerror = () => reject(req.error);
  });
  const metaById = new Map(themesMeta.map((m) => [m.id, m]));
  const map = new Map<string, Theme>();
  for (const r of rows) {
    let t = map.get(r.themeId);
    if (!t) {
      const meta = metaById.get(r.themeId);
      t = {
        id: r.themeId,
        nom: meta?.nom ?? r.themeId,
        icone: meta?.icone ?? 'question',
        couleur: meta?.couleur ?? '#8b5cf6',
        questions: [],
      };
      map.set(r.themeId, t);
    }
    const q: Question = { q: r.q, reponses: r.reponses, bonne: r.bonne, niveau: r.niveau };
    if (r.info) q.info = r.info;
    t.questions.push(q);
  }
  return [...map.values()];
}
