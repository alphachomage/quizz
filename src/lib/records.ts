// records.ts — records : un record par mode x niveau x thème.
// Stockés en local (sync_client) et, en mode 'd1', aussi dans la table D1 « records ».
import { RecordsRepo } from './repositories.js';
import { STORAGE_MODE } from './storage.js';
import { apiSaveRecord } from './api.js';
import { currentSession } from './accounts.js';

/** Records : recordKey(mode, niveau, themeId) -> meilleur score. */
export type RecordsMap = Record<string, number>;

// Clé de record : un record par mode, par niveau (solo) et par thème.
// En duel, le niveau est « mix » (toutes difficultés confondues).
export function recordKey(mode: string, niveau: string | null | undefined, themeId: string): string {
  return `${mode}:${niveau || 'mix'}:${themeId}`;
}
export function loadRecords(): RecordsMap {
  return RecordsRepo.all();
}

// Sauvegarde le record si le score est meilleur. Retourne le record current.
function saveRecord(key: string, value: number): number {
  const records = loadRecords();
  if ((records[key] || 0) < value) {
    records[key] = value;
    RecordsRepo.save(records);
    // Mode 'd1' : le record part aussi dans la table D1 « records » (best-effort).
    if (STORAGE_MODE === 'd1') {
      const pseudo = currentSession()?.pseudo;
      void apiSaveRecord(key, value, pseudo ?? undefined).catch(() => {});
    }
  }
  return records[key] || 0;
}
export { saveRecord };
