// records.js — records locaux : un record par mode x niveau x thème.
// Stockés via lib/storage.js (ils restent sur ce PC).
import { RecordsRepo } from './repositories.js';

// Clé de record : un record par mode, par niveau (solo) et par thème.
// En duel, le niveau est « mix » (toutes difficultés confondues).
export function cleRecord(mode, niveau, themeId) {
  return `${mode}:${niveau || 'mix'}:${themeId}`;
}

export function chargerRecords() {
  return RecordsRepo.tout();
}

// Sauvegarde le record si le score est meilleur. Retourne le record actuel.
export function sauverRecord(cle, valeur) {
  const records = chargerRecords();
  if ((records[cle] || 0) < valeur) {
    records[cle] = valeur;
    RecordsRepo.sauver(records);
  }
  return records[cle] || 0;
}
