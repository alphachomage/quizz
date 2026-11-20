// repositories.js — repositories métier au-dessus de storage.js (R7/R8).
// Chaque "repo" encapsule UNE clé de stockage (CLES) et expose des méthodes métier :
// plus aucun appel direct lire(CLES.x)/ecrire(CLES.x) dans le reste du code.
// Demain (V2, MODE_STOCKAGE='d1'), on branche ces repos sur l'API serveur
// (api.js) sans toucher aux appelants.
import { CLES, lire, ecrire, supprimer } from './storage.js';

// --- Fabrique générique : repo simple pour une clé ---
// Le défaut est CLONÉ à chaque lecture : jamais de mutation du défaut partagé
// (ex. ajouterPartie fait liste.push sur le retour de tout()).
function cloneDefaut(defaut) {
  return defaut === null || defaut === undefined ? defaut : JSON.parse(JSON.stringify(defaut));
}

function repoSimple(cle, defaut) {
  return {
    cle,
    tout: () => {
      const v = lire(cle, null);
      return v === null || v === undefined ? cloneDefaut(defaut) : v;
    },
    sauver: (valeur) => ecrire(cle, valeur),
    vider: () => supprimer(cle),
  };
}

// --- Repos ---

export const PrefsRepo = {
  ...repoSimple(CLES.prefs, {}),
  charger: () => ({ sons: true, musique: true, animations: true, vibrations: true, themeClair: false, daltonien: false, dys: false, ...(lire(CLES.prefs, {}) || {}) }),
};

export const SessionRepo = repoSimple(CLES.session, null);
export const ComptesRepo = repoSimple(CLES.comptes, []);
export const RecordsRepo = {
  ...repoSimple(CLES.records, {}),
  meilleur: (cleRecord) => (lire(CLES.records, {}) || {})[cleRecord] || 0,
  sauverSiMeilleur: (cleRecord, score) => {
    const records = lire(CLES.records, {}) || {};
    if (score > (records[cleRecord] || 0)) {
      records[cleRecord] = score;
      ecrire(CLES.records, records);
      return true; // nouveau record
    }
    return false;
  },
};

export const XpRepo = {
  ...repoSimple(CLES.xp, {}),
  parTheme: (themeId) => (lire(CLES.xp, {}) || {})[themeId] || 0,
  ajouter: (themeId, points) => {
    const xp = lire(CLES.xp, {}) || {};
    xp[themeId] = (xp[themeId] || 0) + points;
    ecrire(CLES.xp, xp);
    return xp[themeId];
  },
};

export const PartiesRepo = {
  ...repoSimple(CLES.parties, []),
  LIMITE: 500,
  ajouter: (partie) => {
    const liste = lire(CLES.parties, []) || [];
    liste.push(partie);
    ecrire(CLES.parties, liste.slice(-PartiesRepo.LIMITE)); // 500 dernières max
  },
};

export const SoumissionsRepo = repoSimple(CLES.soumissions, []);
export const ValideesRepo = repoSimple(CLES.validees, []);
export const SignalesRepo = repoSimple(CLES.signales, []);
export const SuggestionsRepo = {
  ...repoSimple(CLES.suggestions, []),
  ajouter: (suggestion) => {
    const liste = lire(CLES.suggestions, []) || [];
    liste.unshift(suggestion);
    ecrire(CLES.suggestions, liste.slice(0, 200)); // 200 max
  },
};
export const ExcluesRepo = repoSimple(CLES.exclues, []);
export const SeriesRepo = repoSimple(CLES.series, {});
export const StreakJourRepo = {
  ...repoSimple(CLES.streakJour, { compte: 0, dernierJour: null }),
  lire: () => {
    const v = lire(CLES.streakJour, null);
    return v || { compte: 0, dernierJour: null };
  },
};
export const TutoRepo = repoSimple(CLES.tuto, []);
export const BadgeFavoriRepo = repoSimple(CLES.badgeFavori, null);
export const TitreActifRepo = repoSimple(CLES.titreActif, null);
export const ResetSoumRepo = repoSimple(CLES.resetSoum, null);

// Reset global (?reset=1 / ?resetcompte=1) : passe par les repos.
export function toutVider() {
  for (const repo of [RecordsRepo, PartiesRepo, XpRepo, SeriesRepo, StreakJourRepo, BadgeFavoriRepo, TitreActifRepo, SignalesRepo]) {
    repo.vider();
  }
}
