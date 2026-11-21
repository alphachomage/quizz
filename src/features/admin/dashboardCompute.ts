// dashboardCompute.ts — calculs du tableau de bord admin (?admin=1), en fonctions
// PURES (testables hors React, comme features/stats/statsCompute.js).
// Toutes les entrées viennent de la couche lib/ (loaders storage) : ce module ne
// touche ni localStorage ni le DOM (R5). Les entrées tolèrent `string | null` car
// lib/storage.js renvoie la chaîne brute de l'ancien format en compatibilité.
import { localDayKey } from '@lib/dates.js';
import { levelName } from '@lib/scoring.js';
import type { RecordsMap } from '@lib/records.js';
import type { StoredGame, StoredSuggestion } from '@lib/repositories.js';
import type { StoredReport } from '@lib/reports.js';
import type { Submission, Theme } from '@lib/types.js';

// Libellés + icônes des modes de jeu (clés de l'historique = ids internes).
interface ModeInfo {
  nom: string;
  icone: string;
}
const MODE_LABELS: Record<string, ModeInfo> = {
  solo: {
    nom: 'Solo',
    icone: 'timer',
  },
  duel: {
    nom: 'Duel 1v1',
    icone: 'swords',
  },
  survie: {
    nom: 'Survie',
    icone: 'skull',
  },
  quotidien: {
    nom: 'Quizz du jour',
    icone: 'calendar',
  },
};
export function modeLabel(mode: string): string {
  return (
    MODE_LABELS[mode] || {
      nom: mode,
      icone: 'question',
    }
  ).nom;
}
function modeIcon(mode: string): string {
  return (
    MODE_LABELS[mode] || {
      icone: 'question',
    }
  ).icone;
}

// Décompose une clé de record `mode:niveau:themeId` (voir lib/records.js recordKey).
export { modeIcon };
export interface RecordKeyParts {
  mode: string;
  niveau: string;
  themeId: string;
}
export function parseRecordKey(key: string): RecordKeyParts {
  const [mode, niveau, ...remainingN] = String(key).split(':');
  return {
    mode,
    niveau,
    themeId: remainingN.join(':'),
  };
}

// Corpus jouable : thèmes + questions (la prop `themes` a déjà les exclusions
// retirées et les questions validées ajoutées — voir ThemesContext).
export interface CorpusMetrics {
  themeCount: number;
  nbQuestions: number;
}
export function computeCorpus(themes: Theme[] | null): CorpusMetrics {
  const list = Array.isArray(themes) ? themes : [];
  return {
    themeCount: list.length,
    nbQuestions: list.reduce((a, t) => a + ((t.questions && t.questions.length) || 0), 0),
  };
}

// Bilan des parties jouées : total, par mode, % de réussite global.
// Même convention que l'historique : repondues = total x nb joueurs, bonnes = somme
// des « bonnes » des joueurs (voir features/stats/statsCompute.js computeStats).
export interface ModeGamesMetrics {
  mode: string;
  games: number;
  repondues: number;
  bonnes: number;
  pct: number;
}
export interface GamesMetrics {
  total: number;
  repondues: number;
  bonnes: number;
  pct: number;
  perMode: ModeGamesMetrics[];
}
export function computeGamesMetrics(games: StoredGame[] | string | null): GamesMetrics {
  const list = Array.isArray(games) ? games : [];
  let repondues = 0;
  let bonnes = 0;
  const perMode: Record<string, { games: number; repondues: number; bonnes: number }> = {};
  for (const p of list) {
    const nbJ = (p.players || []).length || 1;
    const rep = (p.total || 0) * nbJ;
    const bon = (p.players || []).reduce((a, j) => a + (j.bonnes || 0), 0);
    repondues += rep;
    bonnes += bon;
    const m =
      perMode[p.mode] ||
      (perMode[p.mode] = {
        games: 0,
        repondues: 0,
        bonnes: 0,
      });
    m.games += 1;
    m.repondues += rep;
    m.bonnes += bon;
  }
  const parModeListe = Object.entries(perMode)
    .map(([mode, v]) => ({
      mode,
      ...v,
      pct: v.repondues ? Math.round((v.bonnes / v.repondues) * 100) : 0,
    }))
    .sort((a, b) => b.games - a.games || b.bonnes - a.bonnes);
  return {
    total: list.length,
    repondues,
    bonnes,
    pct: repondues ? Math.round((bonnes / repondues) * 100) : 0,
    perMode: parModeListe,
  };
}

// Top N des records locaux (objet clé -> valeur), triés par valeur décroissante.
export interface RecordEntry extends RecordKeyParts {
  key: string;
  value: number;
}
export function computeRecordsTop(records: RecordsMap | string | null, n = 5): RecordEntry[] {
  return Object.entries(records || {})
    .map(([key, value]) => ({
      key,
      value,
      ...parseRecordKey(key),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

// Compteurs de modération : signalements (total + en attente de vérification),
// soumissions en attente, validées, suggestions joueurs, exclusions du pool.
export interface ModerationInput {
  reports?: StoredReport[] | string | null;
  submissions?: Submission[] | string | null;
  approved?: Submission[] | string | null;
  suggestions?: StoredSuggestion[] | string | null;
  excluded?: string[] | string | null;
}
export interface ModerationMetrics {
  signalementsTotal: number;
  signalementsEnAttente: number;
  submissions: number;
  validees: number;
  suggestions: number;
  exclusions: number;
}
export function computeModeration({
  reports = [],
  submissions = [],
  approved = [],
  suggestions = [],
  excluded = [],
}: ModerationInput = {}): ModerationMetrics {
  const list = Array.isArray(reports) ? reports : [];
  return {
    signalementsTotal: list.length,
    signalementsEnAttente: list.filter((r) => !r.statut).length,
    submissions: (Array.isArray(submissions) ? submissions : []).length,
    validees: (Array.isArray(approved) ? approved : []).length,
    suggestions: (Array.isArray(suggestions) ? suggestions : []).length,
    exclusions: (Array.isArray(excluded) ? excluded : []).length,
  };
}

// Entrée de computeStreak : la série telle que lue dans le stockage ({ compte, lastDay }).
export interface StreakInput {
  compte?: number;
  lastDay?: string | null;
}
export interface StreakMetrics {
  compte: number;
  lastDay: string | null;
  gamesToday: number;
}
// Série du quizz du jour + activité d'aujourd'hui. `now` paramétrable pour les tests
// (hier est dérivé de `now`, pas de l'horloge réelle). Une série dont le dernier jour
// joué est antérieur à hier est rompue (compte = 0), même règle que currentDailyStreak.
export function computeStreak(
  streak: StreakInput | string | null,
  games: StoredGame[] | string | null,
  now: Date = new Date()
): StreakMetrics {
  // Un ancien format brut (chaîne) n'a pas de lastDay : même résultat que l'objet vide.
  const s: StreakInput =
    streak && typeof streak === 'object' ? streak : { compte: 0, lastDay: null };
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayKey = localDayKey(yesterday);
  const compte = s.lastDay && s.lastDay >= yesterdayKey ? s.compte || 0 : 0;
  const todayKey = localDayKey(now);
  const list = Array.isArray(games) ? games : [];
  const gamesToday = list.filter(
    (g) => g.date && localDayKey(new Date(g.date)) === todayKey
  ).length;
  return {
    compte,
    lastDay: s.lastDay || null,
    gamesToday,
  };
}

// Libellé d'une ligne de record pour l'affichage : « Solo · Moyen · Histoire ».
export function recordLabel(r: RecordKeyParts): string {
  const niveau = r.niveau && r.niveau !== 'mix' ? ` · ${levelName(r.niveau)}` : '';
  return `${modeLabel(r.mode)}${niveau} · ${r.themeId}`;
}
