// useAdminMetrics.js — hook du tableau de bord admin : lit TOUTES les métriques
// via la couche lib/ (useStorage = read(STORAGE_KEYS.*) de lib/storage.js, R5 :
// jamais localStorage en direct) et les transforme en objet de métriques via les
// fonctions pures de dashboardCompute.js. Réactif : chaque écriture (sabonner)
// déclenche un re-rendu et recalcule tout.
import { useMemo } from 'react';

import { useStorage } from '@shared/hooks/useStorage.js';
import { STORAGE_KEYS, STORAGE_MODE, read } from '@lib/storage.js';

import {
  computeCorpus,
  computeGamesMetrics,
  computeModeration,
  computeRecordsTop,
  computeStreak,
} from './dashboardCompute.js';

export function useAdminMetrics(themes) {
  const games = useStorage(STORAGE_KEYS.games, []);
  const records = useStorage(STORAGE_KEYS.records, {});
  const reports = useStorage(STORAGE_KEYS.reports, []);
  const submissions = useStorage(STORAGE_KEYS.submissions, []);
  const approved = useStorage(STORAGE_KEYS.approved, []);
  const suggestions = useStorage(STORAGE_KEYS.suggestions, []);
  const excluded = useStorage(STORAGE_KEYS.excluded, []);
  const streakRaw = useStorage(STORAGE_KEYS.dailyStreak, null);
  const accounts = useStorage(STORAGE_KEYS.accounts, []);

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
  }, [themes, games, records, reports, submissions, approved, suggestions, excluded, streakRaw, accounts]);
}
