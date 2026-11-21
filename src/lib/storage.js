// storage.js — UNIQUE point d'accès au stockage persistant (localStorage aujourd'hui,
// demain Cloudflare D1 via fetch('/api/kv/<cle>') derrière le même contrat lire/ecrire).
//
// RÈGLES :
// - Aucun composant ne touche localStorage directement : tout passe par lire/ecrire.
// - Toutes les clés sont déclarées UNE FOIS ici (registre CLES).
// - Ce module est PUR (aucun import react/DOM) : le hook réactif useStockage vit
//   dans shared/hooks/useStockage.js.
// - lire() tolère l'ancien format "chaîne brute" (non JSON) pour rester compatible
//   avec les données écrites avant cette couche.
//
// - MODE STOCKAGE : 'local' (défaut, 100 % hors-ligne) ou 'd1' (V2 : synchro serveur
//   via /api/kv). En 'd1', lire() sert le cache localStorage (rempli au démarrage par
//   prechargerDepuisServeur()) et ecrire() pousse aussi au serveur en arrière-plan :
//   l'appli reste utilisable hors-ligne, la synchro est best-effort.
//   Flag : ?stockage=d1 dans l'URL (test), sinon 'local'.

import { readUrlParam } from './nav.js';
import { kvGet, kvSet } from './api.js';
export const STORAGE_MODE = readUrlParam('stockage') === 'd1' ? 'd1' : 'local';

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
};

// Abonnés prévenus à chaque écriture (pour useSyncExternalStore via le hook).
const auditeurs = new Set();
function subscribe(auditeur) {
  auditeurs.add(auditeur);
  return () => auditeurs.delete(auditeur);
}
export { subscribe };
export function notify() {
  for (const a of auditeurs) a();
}

// Lit une valeur JSON. Retourne `defaut` si absente ou illisible.
// Compat : si la valeur stockée n'est pas du JSON (ancien format brut), on la renvoie telle quelle.
export function read(key, defaultValue = null) {
  try {
    const brut = localStorage.getItem(key);
    if (brut === null) return defaultValue;
    try {
      return JSON.parse(brut);
    } catch {
      return brut; // ancien format : chaîne brute
    }
  } catch {
    return defaultValue;
  }
}

// Écrit une valeur (JSON) et prévient les abonnés.
// En mode 'd1', pousse aussi au serveur en arrière-plan (best-effort, jamais bloquant).
export function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // stockage indisponible (quota dépassé, navigation privée) : on ignore
  }
  if (STORAGE_MODE === 'd1') {
    kvSet(key, value).catch(() => {
      // serveur injoignable : la valeur reste en local, la synchro reprendra au prochain write
    });
  }
  notify();
}

// En mode 'd1' : pré-charge TOUTES les clés depuis le serveur (/api/kv) dans le cache
// local, puis notifie. Appelé UNE FOIS au démarrage de l'appli (main.jsx).
export async function preloadFromServer() {
  if (STORAGE_MODE !== 'd1') return;
  await Promise.all(
    Object.values(STORAGE_KEYS).map(async (key) => {
      try {
        const r = await kvGet(key);
        if (r && r.value !== undefined && r.value !== null) {
          localStorage.setItem(key, JSON.stringify(r.value));
        }
      } catch {
        // clé absente côté serveur ou réseau coupé : on garde le local
      }
    })
  );
  notify();
}

// Supprime une clé et prévient les abonnés.
export function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // idem
  }
  notify();
}
