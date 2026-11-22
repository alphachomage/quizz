// storage.ts — UNIQUE point d'accès au stockage persistant : localStorage en cache
// local + miroir serveur D1 (table sync_client) via fetch('/api/kv/<cle>') derrière
// le même contrat read/write/remove.
//
// RÈGLES :
// - Aucun composant ne touche localStorage directement : tout passe par lire/ecrire.
// - Toutes les clés sont déclarées UNE FOIS ici (registre CLES).
// - Ce module est PUR (aucun import react/DOM) : le hook réactif useStockage vit
//   dans shared/hooks/useStorage.js.
// - lire() tolère l'ancien format "chaîne brute" (non JSON) pour rester compatible
//   avec les données écrites avant cette couche.
//
// - MODE STOCKAGE : 'd1' (défaut, synchro serveur D1 via /api/kv) ou 'local' (hors-ligne
//   forcé avec ?stockage=local). En 'd1', lire() sert le cache localStorage (rempli au
//   démarrage par preloadFromServer()) et ecrire() pousse aussi au serveur en arrière-plan :
//   l'appli reste utilisable hors-ligne, la synchro est best-effort.

import { readUrlParam } from './nav.js';
import { kvGet, kvSet, kvDelete, definirFournisseurToken } from './api.js';

// --- Token de session serveur (Bearer) ---
// Clé localStorage LOCALE (hors STORAGE_KEYS) : le token n'est JAMAIS poussé vers
// /api/kv ni pré-chargé depuis le serveur (il ne quitte le client que dans le header
// Authorization). api.ts le lit via le fournisseur enregistré ci-dessous (évite un
// cycle storage <-> api).
const TOKEN_KEY = 'voltquiz_token_local';
export function lireTokenSession(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function ecrireTokenSession(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // stockage indisponible : le token reste en mémoire via le fournisseur ? non,
    // il est relu à chaque appel — sans persistance, la session saute au reload.
  }
}
export function supprimerTokenSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // idem
  }
}
definirFournisseurToken(lireTokenSession);

/** Mode de stockage actif : 'd1' (défaut, synchro serveur D1) ou 'local' (hors-ligne, via ?stockage=local). */
export type StorageMode = 'local' | 'd1';
export const STORAGE_MODE: StorageMode = readUrlParam('stockage') === 'local' ? 'local' : 'd1';

// Registre de TOUTES les clés de stockage de l'application.
export const STORAGE_KEYS = {
  prefs: 'voltquiz_prefs',
  session: 'voltquiz_session',
  accounts: 'voltquiz_comptes',
  records: 'voltquiz_records',
  xp: 'voltquiz_xp',
  games: 'voltquiz_parties',
  submissions: 'voltquiz_soumissions',
  approved: 'voltquiz_validees',
  reports: 'voltquiz_signales',
  suggestions: 'voltquiz_suggestions',
  excluded: 'voltquiz_exclues',
  overrides: 'voltquiz_overrides',
  series: 'voltquiz_dernieres_series',
  dailyStreak: 'voltquiz_streak_quotidien',
  tutorial: 'voltquiz_tuto_vu',
  favoriteBadge: 'voltquiz_badge_favori',
  activeTitle: 'voltquiz_titre_actif',
  resetSubmissions: 'voltquiz_reset_soumissions',
} as const;

/** Valeur littérale d'une clé du registre (ex. 'voltquiz_prefs'). */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

// Abonnés prévenus à chaque écriture (pour useSyncExternalStore via le hook).
type Listener = () => void;
const auditeurs = new Set<Listener>();
function subscribe(auditeur: Listener): () => boolean {
  auditeurs.add(auditeur);
  return () => auditeurs.delete(auditeur);
}
export { subscribe };
export function notify(): void {
  for (const a of auditeurs) a();
}

// Cache de lecture : tant que la chaîne brute ne change pas, read() renvoie la MÊME
// référence. Indispensable pour useSyncExternalStore (hook useStorage) : un snapshot
// qui change de référence à chaque appel déclenche une boucle de rendu infinie
// (erreur React #185 « Maximum update depth exceeded » en prod).
const cacheLecture = new Map<string, { brut: string; valeur: unknown }>();

// Lit une valeur JSON. Retourne `defaultValue` si absente ou illisible.
// Compat : si la valeur stockée n'est pas du JSON (ancien format brut), on la renvoie telle quelle.
// Le `string` dans le retour modélise justement ce cas de compatibilité.
export function read<T = unknown>(key: string, defaultValue: T | null = null): T | string | null {
  let brut: string | null;
  try {
    brut = localStorage.getItem(key);
  } catch {
    return defaultValue;
  }
  if (brut === null) return defaultValue;
  const enCache = cacheLecture.get(key);
  if (enCache && enCache.brut === brut) return enCache.valeur as T | string;
  let valeur: unknown;
  try {
    valeur = JSON.parse(brut);
  } catch {
    valeur = brut; // ancien format : chaîne brute
  }
  cacheLecture.set(key, { brut, valeur });
  return valeur as T | string;
}

// --- File d'attente des écritures serveur (mode 'd1') ---
// Un POST /api/kv peut échouer (hors-ligne, 429, 4xx/5xx, body trop gros...) : sans
// file d'attente, l'écriture restait en localStorage uniquement ET preloadFromServer()
// écrasait ensuite le local par l'état serveur au prochain démarrage -> perte silencieuse.
// La file est persistée en localStorage sous une clé LOCALE (hors STORAGE_KEYS, donc
// jamais pré-chargée depuis le serveur) : value = valeur à pousser, null = suppression.
const PENDING_KEY = 'voltquiz_pending_writes';
type PendingMap = Record<string, unknown>;
let pendingMemo: PendingMap | null = null;
function pending(): PendingMap {
  if (pendingMemo === null) {
    let p: unknown;
    try {
      p = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
    } catch {
      p = null;
    }
    pendingMemo = p && typeof p === 'object' && !Array.isArray(p) ? (p as PendingMap) : {};
  }
  return pendingMemo;
}
function persisterPending(): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending()));
  } catch {
    // quota dépassé : la copie mémoire (pendingMemo) reste valable pour la session
  }
}

// Pousse une valeur au serveur (mode 'd1'). true = accepté, false = à mettre en file.
async function pushToServer(key: string, value: unknown): Promise<boolean> {
  try {
    await kvSet(key, value);
    return true;
  } catch {
    return false;
  }
}
async function deleteOnServer(key: string): Promise<boolean> {
  try {
    await kvDelete(key);
    return true;
  } catch {
    return false;
  }
}

let vidageEnCours = false;
// Vide la file d'attente vers le serveur. Appelé au démarrage (après preloadFromServer),
// après chaque write/remove, et sur l'événement 'online' (main.tsx). Best-effort :
// une écriture qui échoue reste en file et sera retentée au prochain vidage.
export async function flushPendingWrites(): Promise<void> {
  if (STORAGE_MODE !== 'd1' || vidageEnCours) return;
  vidageEnCours = true;
  try {
    const enAttente = { ...pending() };
    for (const [key, value] of Object.entries(enAttente)) {
      const ok = value === null ? await deleteOnServer(key) : await pushToServer(key, value);
      if (ok) {
        const p = pending();
        if (key in p) {
          delete p[key];
          persisterPending();
        }
      }
    }
  } finally {
    vidageEnCours = false;
  }
}

// Écrit une valeur (JSON) et prévient les abonnés.
// En mode 'd1', pousse aussi au serveur en arrière-plan : si le serveur refuse
// (hors-ligne, 429...), la valeur part en file d'attente (jamais bloquant).
export function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // stockage indisponible (quota dépassé, navigation privée) : on ignore
  }
  cacheLecture.delete(key); // la prochaine read() re-lira la nouvelle chaîne brute
  if (STORAGE_MODE === 'd1') {
    void pushToServer(key, value).then((ok) => {
      const p = pending();
      if (ok) {
        if (key in p) {
          delete p[key];
          persisterPending();
        }
      } else {
        p[key] = value;
        persisterPending();
      }
      void flushPendingWrites();
    });
  }
  notify();
}

// En mode 'd1' : pré-charge TOUTES les clés depuis le serveur (/api/kv) dans le cache
// local, puis notifie. Appelé UNE FOIS au démarrage de l'appli (main.tsx).
// Une clé qui a une écriture locale EN ATTENTE (file pending) n'est PAS écrasée :
// le local est plus récent que le serveur, et la file sera poussée juste après.
export async function preloadFromServer(): Promise<void> {
  if (STORAGE_MODE !== 'd1') return;
  const enAttente = pending();
  await Promise.all(
    Object.values(STORAGE_KEYS).map(async (key) => {
      if (key in enAttente) return; // écriture locale en attente : on garde le local
      try {
        const r = await kvGet(key);
        if (r && r.value !== undefined && r.value !== null) {
          localStorage.setItem(key, JSON.stringify(r.value));
          cacheLecture.delete(key);
        }
      } catch {
        // clé absente côté serveur ou réseau coupé : on garde le local
      }
    })
  );
  await flushPendingWrites(); // on pousse les écritures en attente dès le démarrage
  notify();
}

// Supprime une clé et prévient les abonnés.
// En mode 'd1', pousse aussi la suppression au serveur (DELETE /api/kv) ; si le serveur
// est injoignable, la suppression part en file d'attente (pending[key] = null).
export function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // idem
  }
  cacheLecture.delete(key);
  if (STORAGE_MODE === 'd1') {
    void deleteOnServer(key).then((ok) => {
      const p = pending();
      if (ok) {
        if (key in p) {
          delete p[key];
          persisterPending();
        }
      } else {
        p[key] = null; // null = suppression à pousser au serveur
        persisterPending();
      }
    });
  }
  notify();
}
