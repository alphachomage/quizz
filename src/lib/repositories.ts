// repositories.ts — repositories métier au-dessus de storage.ts (R7/R8).
// Chaque "repo" encapsule UNE clé de stockage (STORAGE_KEYS) et expose des méthodes
// métier : plus aucun appel direct read(STORAGE_KEYS.x)/write(...) dans le reste du code.
// En mode 'd1', chaque write part aussi dans la table D1 sync_client (via storage.ts) ;
// les données métier structurées (comptes, parties, records, XP, soumissions) partent
// en plus vers leurs tables dédiées via api.ts (voir accounts/game-history/records/xp/submissions).
import { STORAGE_KEYS, read, write, remove } from './storage.js';
import type {
  GameDetail,
  GameMode,
  LevelId,
  OverrideEntry,
  Prefs,
  Report,
  Submission,
  Suggestion,
} from './types.js';

// --- Formes persistées (types locaux, alignés sur src/lib/types.ts) ---

/** Records : clé "mode:niveau:themeId" -> meilleur score. */
type Records = Record<string, number>;
/** XP cumulée par thème. */
type XpByTheme = Record<string, number>;

/** Partie persistée dans l'historique local (forme aplatie + id/date posés par game-history). */
export interface StoredGame {
  mode: GameMode;
  niveau: LevelId | string | null;
  themeId: string;
  themeName?: string;
  total: number;
  details?: GameDetail[];
  players: { nom: string; score: number; bonnes: number }[];
  id?: string;
  date?: string;
}

/** Soumission validée (jouable) : une soumission + sa date de validation. */
export interface ApprovedSubmission extends Submission {
  valideLe?: string;
}

/** Signalement stocké (id/last/themeNom peuvent s'ajouter au schéma de base). */
export interface StoredReport extends Report {
  id?: string;
  last?: string;
  themeNom?: string;
}

/** Suggestion stockée (l'auteur est porté par le champ pseudo). */
export interface StoredSuggestion extends Suggestion {
  pseudo?: string;
}

/** Streak du quizz du jour : { account: N, lastDay: 'AAAA-MM-JJ' | null }. */
export interface DailyStreak {
  account: number;
  lastDay: string | null;
}

/** Offset posé par ?resetcompte=1 (badges « proposer/valider » repartent de zéro). */
export interface ResetSubmissions {
  proposees: number;
  validees: number;
}

// --- Fabrique générique : repo simple pour une clé ---
// Le défaut est CLONÉ à chaque lecture : jamais de mutation du défaut partagé
// (ex. ajouterPartie fait liste.push sur le retour de tout()).
function cloneDefault<T>(defaultValue: T): T {
  return defaultValue === null || defaultValue === undefined
    ? defaultValue
    : JSON.parse(JSON.stringify(defaultValue));
}

/** Contrat d'un repo simple : une clé de stockage + lire/sauver/vider. */
interface SimpleRepo<T> {
  key: string;
  all: () => T;
  save: (value: T) => void;
  clear: () => void;
}
function repoSimple<T>(key: string, defaultValue: T): SimpleRepo<T> {
  return {
    key,
    all: () => {
      const v = read<T>(key, null);
      return v === null || v === undefined ? cloneDefault(defaultValue) : (v as T);
    },
    save: (value) => write(key, value),
    clear: () => remove(key),
  };
}

// --- Repos ---

export const PrefsRepo = {
  ...repoSimple<Partial<Prefs>>(STORAGE_KEYS.prefs, {}),
  load: (): Prefs => ({
    sons: true,
    music: true,
    animations: true,
    vibrations: true,
    themeClair: false,
    daltonien: false,
    dys: false,
    ...((read<Partial<Prefs>>(STORAGE_KEYS.prefs, {}) || {}) as Partial<Prefs>),
  }),
};
export const RecordsRepo = {
  ...repoSimple<Records>(STORAGE_KEYS.records, {}),
  best: (recordKey: string): number =>
    ((read<Records>(STORAGE_KEYS.records, {}) || {}) as Records)[recordKey] || 0,
  saveIfBetter: (recordKey: string, score: number): boolean => {
    const records = (read<Records>(STORAGE_KEYS.records, {}) || {}) as Records;
    if (score > (records[recordKey] || 0)) {
      records[recordKey] = score;
      write(STORAGE_KEYS.records, records);
      return true; // nouveau record
    }
    return false;
  },
};
export const XpRepo = {
  ...repoSimple<XpByTheme>(STORAGE_KEYS.xp, {}),
  perTheme: (themeId: string): number =>
    ((read<XpByTheme>(STORAGE_KEYS.xp, {}) || {}) as XpByTheme)[themeId] || 0,
  add: (themeId: string, points: number): number => {
    const xp = (read<XpByTheme>(STORAGE_KEYS.xp, {}) || {}) as XpByTheme;
    xp[themeId] = (xp[themeId] || 0) + points;
    write(STORAGE_KEYS.xp, xp);
    return xp[themeId];
  },
};
export const GamesRepo = {
  ...repoSimple<StoredGame[]>(STORAGE_KEYS.games, []),
  LIMITE: 500,
  add: (game: StoredGame): void => {
    const list = (read<StoredGame[]>(STORAGE_KEYS.games, []) || []) as StoredGame[];
    list.push(game);
    write(STORAGE_KEYS.games, list.slice(-GamesRepo.LIMITE)); // 500 dernières max
  },
};
export const SubmissionsRepo = repoSimple<Submission[]>(STORAGE_KEYS.submissions, []);
export const ApprovedRepo = repoSimple<ApprovedSubmission[]>(STORAGE_KEYS.approved, []);
export const ReportsRepo = repoSimple<StoredReport[]>(STORAGE_KEYS.reports, []);
export const SuggestionsRepo = {
  ...repoSimple<StoredSuggestion[]>(STORAGE_KEYS.suggestions, []),
  add: (suggestion: StoredSuggestion): void => {
    const list = (read<StoredSuggestion[]>(STORAGE_KEYS.suggestions, []) ||
      []) as StoredSuggestion[];
    list.unshift(suggestion);
    write(STORAGE_KEYS.suggestions, list.slice(0, 200)); // 200 max
  },
};
export const ExcludedRepo = repoSimple<string[]>(STORAGE_KEYS.excluded, []);
export const OverridesRepo = repoSimple<Record<string, OverrideEntry>>(
  STORAGE_KEYS.overrides,
  {}
);
export const SeriesRepo = repoSimple<Record<string, string[]>>(STORAGE_KEYS.series, {});
export const DailyStreakRepo = {
  ...repoSimple<DailyStreak>(STORAGE_KEYS.dailyStreak, {
    account: 0,
    lastDay: null,
  }),
  read: (): DailyStreak =>
    (read<DailyStreak>(STORAGE_KEYS.dailyStreak, null) || {
      account: 0,
      lastDay: null,
    }) as DailyStreak,
};
export const FavoriteBadgeRepo = repoSimple<string | null>(STORAGE_KEYS.favoriteBadge, null);
export const ActiveTitleRepo = repoSimple<string | null>(STORAGE_KEYS.activeTitle, null);
export const ResetSubmissionsRepo = repoSimple<ResetSubmissions | null>(
  STORAGE_KEYS.resetSubmissions,
  null
);

// Reset global (?reset=1 / ?resetcompte=1) : passe par les repos.
function clearAll(): void {
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
