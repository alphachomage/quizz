// migrate.ts — migrations de données one-shot (localStorage + D1 via les repos).
// Appelées UNE FOIS au démarrage depuis main.tsx (flag posé dans le stockage).
import { read, write } from './storage.js';
import {
  RecordsRepo,
  GamesRepo,
  SeriesRepo,
  FavoriteBadgeRepo,
  ActiveTitleRepo,
} from './repositories.js';
import { loadGames } from './game-history.js';

const FLAG_MIGRATE_ROGUE = 'voltquiz_migrate_rogue_v1';

/**
 * Migration « Rogue Quizz » : l'ancien mode Survie est supprimé (remplacé par le
 * mode rogue). On purge complètement les anciennes données survie :
 * - records dont la clé commence par « survie: »
 * - parties de l'historique en mode 'survie'
 * - séries mémorisées « survie:... »
 * - badge favori / titre actif s'ils étaient des badges/titres survie
 * Idempotente (flag), best-effort (aucune erreur bloquante).
 */
export function migrateRogue(): void {
  try {
    if (read(FLAG_MIGRATE_ROGUE)) return;
    // Records : supprimer les clés survie:*
    const records = RecordsRepo.all();
    const cleSurvie = Object.keys(records).filter((k) => k.startsWith('survie:'));
    if (cleSurvie.length > 0) {
      for (const k of cleSurvie) delete records[k];
      RecordsRepo.save(records);
    }
    // Historique : supprimer les parties mode 'survie'
    const games = loadGames();
    // NB : 'survie' n'est plus un GameMode valide ; on compare en string pour purger
    // les anciennes données encore présentes dans le stockage.
    const filtrées = games.filter((g) => (g.mode as string) !== 'survie');
    if (filtrées.length !== games.length) GamesRepo.save(filtrées);
    // Séries mémorisées : supprimer les clés survie:*
    const series = SeriesRepo.all();
    const seriesSurvie = Object.keys(series).filter((k) => k.startsWith('survie:'));
    if (seriesSurvie.length > 0) {
      for (const k of seriesSurvie) delete series[k];
      SeriesRepo.save(series);
    }
    // Badge favori / titre actif si c'était un badge/titre survie
    const fav = FavoriteBadgeRepo.all();
    if (typeof fav === 'string' && fav.startsWith('survie-')) FavoriteBadgeRepo.save(null);
    const titre = ActiveTitleRepo.all();
    if (titre === 'gen-survie-15') ActiveTitleRepo.save(null);
    write(FLAG_MIGRATE_ROGUE, true);
  } catch {
    // migration best-effort : on ne bloque jamais le démarrage de l'app
  }
}
