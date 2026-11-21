// features/resultat/persistance.ts — persistance d'une partie terminée.
// Appelée UNE FOIS depuis App.terminer (plus depuis un useEffect de montage du
// composant d'affichage) : record, historique (leaderboard/stats), XP par thème
// et globale, position au classement, série de jours du quizz du jour, sons.
// Retourne toutes les valeurs affichées par l'écran de résultats.
// Mode invité : rien n'est enregistré (sauf le record local), aucune XP.
import { loadGames, addGame } from '@lib/game-history.js';
import { loadRecords, saveRecord, recordKey } from '@lib/records.js';
import { loadXp, addXp, themeLevel } from '@lib/xp.js';
import type { XpMap } from '@lib/xp.js';
import { recordDailyStreak } from '@lib/streak.js';
import { playSound, vibrate } from '@lib/sounds.js';
import type { GameResult, Prefs } from '@lib/types.js';
import { levelPercent } from './gameStats.js';

/** XP gagnée sur un thème pendant la partie (ligne affichée sur l'écran de résultats). */
export interface ThemeXpRow {
  themeId: string;
  gain: number;
  nivAvant: number;
  nivApres: number;
  pct: number;
}

/** XP globale du compte avant/après la partie. */
export interface GlobalXp {
  avant: number;
  apres: number;
  gain: number;
}

/** Valeurs persistées à la fin d'une partie et affichées par l'écran de résultats. */
export interface Persistance {
  record: number;
  recordAvant: number;
  nouveauRecord: boolean;
  themeXp: ThemeXpRow[];
  globalXp: GlobalXp;
  rang: number | null;
  dailyStreak: number;
}

export function persistResult(result: GameResult, isGuest: boolean, prefs?: Prefs | null): Persistance {
  const { mode, niveau, theme, players, scores, bonnes, total, details } = result;
  const key = recordKey(mode, niveau, theme.id);

  // --- Record du mode x niveau x thème ---
  const value = mode === 'duel' ? Math.max(...scores) : scores[0];
  const avant = loadRecords()[key] || 0;
  const isRecord = value > avant && value > 0;
  const record = saveRecord(key, value);
  if (isRecord) {
    playSound('record', prefs);
    vibrate([60, 60, 120], prefs);
  } else {
    playSound('fin', prefs);
  }

  // --- Historique de la partie (alimente le leaderboard ET les statistiques personal) ---
  if (!isGuest) {
    addGame({
      mode,
      niveau,
      themeId: theme.id,
      themeName: theme.nom,
      total,
      details: details || [],
      players: players.map((nom, i) => ({
        nom,
        score: scores[i],
        bonnes: bonnes[i],
      })),
    });
  }

  // --- XP gagnée : par thème grâce au détail question par question ---
  let themeXp: ThemeXpRow[] = [];
  let globalXp: GlobalXp = {
    avant: 0,
    apres: 0,
    gain: 0,
  };
  if (!isGuest) {
    const xpBefore: XpMap = loadXp();
    const perTheme: Record<string, number> = {};
    if (details && details.length > 0) {
      for (const d of details) perTheme[d.themeId] = (perTheme[d.themeId] || 0) + (d.gain || 0);
    } else {
      perTheme[theme.id] = scores.reduce((a, b) => a + b, 0);
    }
    const rows: ThemeXpRow[] = [];
    for (const [themeId, gain] of Object.entries(perTheme)) {
      if (!gain) continue;
      const av = xpBefore[themeId] || 0;
      addXp(themeId, gain);
      const ap = av + gain;
      rows.push({
        themeId,
        gain,
        nivAvant: themeLevel(av),
        nivApres: themeLevel(ap),
        pct: levelPercent(ap),
      });
    }
    themeXp = rows;
    const globAvant = Object.values(xpBefore).reduce((a, b) => a + (b || 0), 0);
    const gainTotal = rows.reduce((a, l) => a + l.gain, 0);
    globalXp = {
      avant: globAvant,
      apres: globAvant + gainTotal,
      gain: gainTotal,
    };
  }

  // --- Position au leaderboard du mode (top 10 affiché) ---
  let rang: number | null = null;
  if (!isGuest) {
    const leaderboardRows: number[] = [];
    for (const p of loadGames()) {
      if (p.mode !== mode) continue;
      if (mode === 'solo' && p.niveau !== niveau) continue; // survie : tous niveaux mélangés
      for (const j of p.players || []) leaderboardRows.push(j.score);
    }
    leaderboardRows.sort((a, b) => b - a);
    if (value > 0) rang = leaderboardRows.filter((s) => s > value).length + 1;
  }

  // --- Série de jours du quizz du jour (logo éclair) ---
  const dailyStreak = mode === 'quotidien' ? recordDailyStreak().account : 0;
  return {
    record,
    recordAvant: avant,
    nouveauRecord: isRecord,
    themeXp,
    globalXp,
    rang,
    dailyStreak,
  };
}
