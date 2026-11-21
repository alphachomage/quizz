// features/resultat/persistance.js — persistance d'une partie terminée.
// Appelée UNE FOIS depuis App.terminer (plus depuis un useEffect de montage du
// composant d'affichage) : record, historique (leaderboard/stats), XP par thème
// et globale, position au classement, série de jours du quizz du jour, sons.
// Retourne toutes les valeurs affichées par l'écran de résultats.
// Mode invité : rien n'est enregistré (sauf le record local), aucune XP.
import { loadGames, addGame } from '@lib/game-history.js';
import { loadRecords, saveRecord, recordKey } from '@lib/records.js';
import { loadXp, addXp, themeLevel } from '@lib/xp.js';
import { recordDailyStreak } from '@lib/streak.js';
import { playSound, vibrate } from '@lib/sounds.js';
import { levelPercent } from './gameStats.js';
export function persistResult(result, isGuest, prefs) {
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
  let themeXp = [];
  let globalXp = {
    avant: 0,
    apres: 0,
    gain: 0,
  };
  if (!isGuest) {
    const xpBefore = loadXp();
    const perTheme = {};
    if (details && details.length > 0) {
      for (const d of details) perTheme[d.themeId] = (perTheme[d.themeId] || 0) + (d.gain || 0);
    } else {
      perTheme[theme.id] = scores.reduce((a, b) => a + b, 0);
    }
    const rows = [];
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
  let rang = null;
  if (!isGuest) {
    const leaderboardRows = [];
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
