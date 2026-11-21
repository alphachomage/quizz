// records.js — records locaux : un record par mode x niveau x thème.
// Stockés via lib/storage.js (ils restent sur ce PC).
import { RecordsRepo } from './repositories.js';

// Clé de record : un record par mode, par niveau (solo) et par thème.
// En duel, le niveau est « mix » (toutes difficultés confondues).
export function recordKey(mode, niveau, themeId) {
  return `${mode}:${niveau || 'mix'}:${themeId}`;
}
export function loadRecords() {
  return RecordsRepo.all();
}

// Sauvegarde le record si le score est meilleur. Retourne le record current.
function saveRecord(key, value) {
  const records = loadRecords();
  if ((records[key] || 0) < value) {
    records[key] = value;
    RecordsRepo.save(records);
  }
  return records[key] || 0;
}
export { saveRecord };
