// useAdminMetrics.ts — hook du tableau de bord admin : lit TOUTES les métriques
// via la couche lib/ (useStorage = read(STORAGE_KEYS.*) de lib/storage.js, R5 :
// jamais localStorage en direct) et les transforme en objet de métriques via les
// fonctions pures de dashboardCompute.ts. Réactif : chaque écriture (sabonner)
// déclenche un re-rendu et recalcule tout.
import { useMemo } from 'react';

import { useStorage } from '@shared/hooks/useStorage.js';
import { STORAGE_KEYS, STORAGE_MODE, read } from '@lib/storage.js';
import type { StorageMode } from '@lib/storage.js';
import type { RecordsMap } from '@lib/records.js';
import type { StoredGame, StoredSuggestion } from '@lib/repositories.js';
import type { StoredReport } from '@lib/reports.js';
import type { Account, Submission, Theme } from '@lib/types.js';

import {
  computeCorpus,
  computeGamesMetrics,
  computeModeration,
  computeRecordsTop,
  computeStreak,
} from './dashboardCompute.js';
import type {
  CorpusMetrics,
  GamesMetrics,
  ModerationMetrics,
  RecordEntry,
  StreakInput,
  StreakMetrics,
} from './dashboardCompute.js';

// Métriques de stockage affichées par StorageCard / ActionsCard.
export interface StockageMetrics {
  mode: StorageMode;
  presentes: number;
  total: number;
  comptes: number;
}

// Objet de métriques consommé par AdminDashboard.
export interface AdminMetrics {
  corpus: CorpusMetrics;
  games: GamesMetrics;
  recordsTop: RecordEntry[];
  moderation: ModerationMetrics;
  streak: StreakMetrics;
  stockage: StockageMetrics;
}

export function useAdminMetrics(themes: Theme[] | null): AdminMetrics {
  const games = useStorage<StoredGame[]>(STORAGE_KEYS.games, []);
  const records = useStorage<RecordsMap>(STORAGE_KEYS.records, {});
  const reports = useStorage<StoredReport[]>(STORAGE_KEYS.reports, []);
  const submissions = useStorage<Submission[]>(STORAGE_KEYS.submissions, []);
  const approved = useStorage<Submission[]>(STORAGE_KEYS.approved, []);
  const suggestions = useStorage<StoredSuggestion[]>(STORAGE_KEYS.suggestions, []);
  const excluded = useStorage<string[]>(STORAGE_KEYS.excluded, []);
  const streakRaw = useStorage<StreakInput>(STORAGE_KEYS.dailyStreak, null);
  const accounts = useStorage<Account[]>(STORAGE_KEYS.accounts, []);

  return useMemo(() => {
    // Clés de stockage effectivement présentes (read() = point d'accès unique, R5).
    const presentes = Object.values(STORAGE_KEYS).filter((k) => read(k) !== null).length;
    return {
      corpus: computeCorpus(themes),
      games: computeGamesMetrics(games),
      recordsTop: computeRecordsTop(records, 5),
      moderation: computeModeration({ reports, submissions, approved, suggestions, excluded }),
      streak: computeStreak(streakRaw, games),
      stockage: {
        mode: STORAGE_MODE,
        presentes,
        total: Object.keys(STORAGE_KEYS).length,
        comptes: (Array.isArray(accounts) ? accounts : []).length,
      },
    };
    // `themes` change au chargement des chunks ; chaque useStorage re-déclenche le calcul.
  }, [
    themes,
    games,
    records,
    reports,
    submissions,
    approved,
    suggestions,
    excluded,
    streakRaw,
    accounts,
  ]);
}
