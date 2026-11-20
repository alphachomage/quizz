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

import { lireParamUrl } from './nav.js';
import { kvGet, kvSet } from './api.js';

export const MODE_STOCKAGE = lireParamUrl('stockage') === 'd1' ? 'd1' : 'local';

// Registre de TOUTES les clés de stockage de l'application.
export const CLES = {
  prefs: 'voltquiz_prefs',
  session: 'voltquiz_session',
  comptes: 'voltquiz_comptes',
  records: 'voltquiz_records',
  xp: 'voltquiz_xp',
  parties: 'voltquiz_parties',
  soumissions: 'voltquiz_soumissions',
  validees: 'voltquiz_validees',
  signales: 'voltquiz_signales',
  suggestions: 'voltquiz_suggestions',
  exclues: 'voltquiz_exclues',
  series: 'voltquiz_dernieres_series',
  streakJour: 'voltquiz_streak_quotidien',
  tuto: 'voltquiz_tuto_vu',
  badgeFavori: 'voltquiz_badge_favori',
  titreActif: 'voltquiz_titre_actif',
  resetSoum: 'voltquiz_reset_soumissions',
};

// Abonnés prévenus à chaque écriture (pour useSyncExternalStore via le hook).
const auditeurs = new Set();

export function sabonner(auditeur) {
  auditeurs.add(auditeur);
  return () => auditeurs.delete(auditeur);
}

export function notifier() {
  for (const a of auditeurs) a();
}

// Lit une valeur JSON. Retourne `defaut` si absente ou illisible.
// Compat : si la valeur stockée n'est pas du JSON (ancien format brut), on la renvoie telle quelle.
export function lire(cle, defaut = null) {
  try {
    const brut = localStorage.getItem(cle);
    if (brut === null) return defaut;
    try {
      return JSON.parse(brut);
    } catch {
      return brut; // ancien format : chaîne brute
    }
  } catch {
    return defaut;
  }
}

// Écrit une valeur (JSON) et prévient les abonnés.
// En mode 'd1', pousse aussi au serveur en arrière-plan (best-effort, jamais bloquant).
export function ecrire(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    // stockage indisponible (quota dépassé, navigation privée) : on ignore
  }
  if (MODE_STOCKAGE === 'd1') {
    kvSet(cle, valeur).catch(() => {
      // serveur injoignable : la valeur reste en local, la synchro reprendra au prochain write
    });
  }
  notifier();
}

// En mode 'd1' : pré-charge TOUTES les clés depuis le serveur (/api/kv) dans le cache
// local, puis notifie. Appelé UNE FOIS au démarrage de l'appli (main.jsx).
export async function prechargerDepuisServeur() {
  if (MODE_STOCKAGE !== 'd1') return;
  await Promise.all(
    Object.values(CLES).map(async (cle) => {
      try {
        const r = await kvGet(cle);
        if (r && r.valeur !== undefined && r.valeur !== null) {
          localStorage.setItem(cle, JSON.stringify(r.valeur));
        }
      } catch {
        // clé absente côté serveur ou réseau coupé : on garde le local
      }
    })
  );
  notifier();
}

// Supprime une clé et prévient les abonnés.
export function supprimer(cle) {
  try {
    localStorage.removeItem(cle);
  } catch {
    // idem
  }
  notifier();
}
