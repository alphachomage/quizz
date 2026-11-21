// repositories.js — repositories métier au-dessus de storage.js (R7/R8).
// Chaque "repo" encapsule UNE clé de stockage (CLES) et expose des méthodes métier :
// plus aucun appel direct lire(CLES.x)/ecrire(CLES.x) dans le reste du code.
// Demain (V2, MODE_STOCKAGE='d1'), on branche ces repos sur l'API serveur
// (api.js) sans toucher aux appelants.
import { STORAGE_KEYS, read, write, remove } from './storage.js';

// --- Fabrique générique : repo simple pour une clé ---
// Le défaut est CLONÉ à chaque lecture : jamais de mutation du défaut partagé
// (ex. ajouterPartie fait liste.push sur le retour de tout()).
function cloneDefault(defaultValue) {
  return defaultValue === null || defaultValue === undefined
    ? defaultValue
    : JSON.parse(JSON.stringify(defaultValue));
}
function repoSimple(key, defaultValue) {
  return {
    key,
    all: () => {
      const v = read(key, null);
      return v === null || v === undefined ? cloneDefault(defaultValue) : v;
    },
    save: (value) => write(key, value),
    clear: () => remove(key),
  };
}

// --- Repos ---

export const PrefsRepo = {
  ...repoSimple(STORAGE_KEYS.prefs, {}),
  load: () => ({
    sons: true,
    music: true,
    animations: true,
    vibrations: true,
    themeClair: false,
    daltonien: false,
    dys: false,
    ...(read(STORAGE_KEYS.prefs, {}) || {}),
  }),
};
export const RecordsRepo = {
  ...repoSimple(STORAGE_KEYS.records, {}),
  best: (recordKey) => (read(STORAGE_KEYS.records, {}) || {})[recordKey] || 0,
  saveIfBetter: (recordKey, score) => {
    const records = read(STORAGE_KEYS.records, {}) || {};
    if (score > (records[recordKey] || 0)) {
      records[recordKey] = score;
      write(STORAGE_KEYS.records, records);
      return true; // nouveau record
    }
    return false;
  },
};
export const XpRepo = {
  ...repoSimple(STORAGE_KEYS.xp, {}),
  perTheme: (themeId) => (read(STORAGE_KEYS.xp, {}) || {})[themeId] || 0,
  add: (themeId, points) => {
    const xp = read(STORAGE_KEYS.xp, {}) || {};
    xp[themeId] = (xp[themeId] || 0) + points;
    write(STORAGE_KEYS.xp, xp);
    return xp[themeId];
  },
};
export const GamesRepo = {
  ...repoSimple(STORAGE_KEYS.games, []),
  LIMITE: 500,
  add: (game) => {
    const list = read(STORAGE_KEYS.games, []) || [];
    list.push(game);
    write(STORAGE_KEYS.games, list.slice(-GamesRepo.LIMITE)); // 500 dernières max
  },
};
export const SubmissionsRepo = repoSimple(STORAGE_KEYS.submissions, []);
export const ApprovedRepo = repoSimple(STORAGE_KEYS.approved, []);
export const ReportsRepo = repoSimple(STORAGE_KEYS.reports, []);
export const SuggestionsRepo = {
  ...repoSimple(STORAGE_KEYS.suggestions, []),
  add: (suggestion) => {
    const list = read(STORAGE_KEYS.suggestions, []) || [];
    list.unshift(suggestion);
    write(STORAGE_KEYS.suggestions, list.slice(0, 200)); // 200 max
  },
};
export const ExcludedRepo = repoSimple(STORAGE_KEYS.excluded, []);
export const SeriesRepo = repoSimple(STORAGE_KEYS.series, {});
export const DailyStreakRepo = {
  ...repoSimple(STORAGE_KEYS.dailyStreak, {
    account: 0,
    lastDay: null,
  }),
  read: () => {
    const v = read(STORAGE_KEYS.dailyStreak, null);
    return (
      v || {
        account: 0,
        lastDay: null,
      }
    );
  },
};
export const FavoriteBadgeRepo = repoSimple(STORAGE_KEYS.favoriteBadge, null);
export const ActiveTitleRepo = repoSimple(STORAGE_KEYS.activeTitle, null);
export const ResetSubmissionsRepo = repoSimple(STORAGE_KEYS.resetSubmissions, null);

// Reset global (?reset=1 / ?resetcompte=1) : passe par les repos.
function clearAll() {
  for (const repo of [
    RecordsRepo,
    GamesRepo,
    XpRepo,
    SeriesRepo,
    DailyStreakRepo,
    FavoriteBadgeRepo,
    ActiveTitleRepo,
    ReportsRepo,
  ]) {
    repo.clear();
  }
}
export { clearAll };
