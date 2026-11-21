// storage.ts — UNIQUE point d'accès au stockage persistant (localStorage aujourd'hui,
// demain Cloudflare D1 via fetch('/api/kv/<cle>') derrière le même contrat lire/ecrire).
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
import { kvGet, kvSet } from './api.js';

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

// Écrit une valeur (JSON) et prévient les abonnés.
// En mode 'd1', pousse aussi au serveur en arrière-plan (best-effort, jamais bloquant).
export function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // stockage indisponible (quota dépassé, navigation privée) : on ignore
  }
  cacheLecture.delete(key); // la prochaine read() re-lira la nouvelle chaîne brute
  if (STORAGE_MODE === 'd1') {
    kvSet(key, value).catch(() => {
      // serveur injoignable : la valeur reste en local, la synchro reprendra au prochain write
    });
  }
  notify();
}

// En mode 'd1' : pré-charge TOUTES les clés depuis le serveur (/api/kv) dans le cache
// local, puis notifie. Appelé UNE FOIS au démarrage de l'appli (main.jsx).
export async function preloadFromServer(): Promise<void> {
  if (STORAGE_MODE !== 'd1') return;
  await Promise.all(
    Object.values(STORAGE_KEYS).map(async (key) => {
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
  notify();
}

// Supprime une clé et prévient les abonnés.
export function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // idem
  }
  cacheLecture.delete(key);
  notify();
}
