// features/stats/statsCalculs.js — calculs de l'écran « Mes statistiques »,
// extraits du composant en fonctions PURES (testables hors React).
// Tout se calcule à partir de l'historique local des parties + de l'XP.
import { LEVELS } from '@lib/scoring.js';
import { localDayKey } from '@lib/dates.js';
import { themeLevel, xpForLevel } from '@lib/xp.js';

// Bilan global + par mode + par thème + par difficulté.
export function computeStats(games) {
  let repondues = 0;
  let bonnes = 0;
  let points = 0;
  const perMode = {};
  const perTheme = {}; // themeId -> { nom, jouées, correctes }
  const perLevel = {}; // 'facile'|'moyen'|'dur' -> { jouées, correctes }

  for (const p of games) {
    const nbJ = (p.players || []).length || 1;
    repondues += (p.total || 0) * nbJ;
    for (const j of p.players || []) {
      bonnes += j.bonnes || 0;
      points += j.score || 0;
    }
    const m =
      perMode[p.mode] ||
      (perMode[p.mode] = {
        games: 0,
        best: 0,
      });
    m.games += 1;
    m.best = Math.max(m.best, ...(p.players || []).map((j) => j.score || 0));
    if (Array.isArray(p.details) && p.details.length > 0) {
      for (const d of p.details) {
        const t =
          perTheme[d.themeId] ||
          (perTheme[d.themeId] = {
            nom: d.themeName || d.themeId,
            jouées: 0,
            correctes: 0,
          });
        t.jouées += 1;
        if (d.correct) t.correctes += 1;
        // % de réussite par difficulté (on ignore le quizz du jour dont le « niveau » est une date)
        if (LEVELS.some((n) => n.id === d.niveau)) {
          const nv =
            perLevel[d.niveau] ||
            (perLevel[d.niveau] = {
              jouées: 0,
              correctes: 0,
            });
          nv.jouées += 1;
          if (d.correct) nv.correctes += 1;
        }
      }
    } else {
      const t =
        perTheme[p.themeId] ||
        (perTheme[p.themeId] = {
          nom: p.themeName || p.themeId,
          jouées: 0,
          correctes: 0,
        });
      t.jouées += (p.total || 0) * nbJ;
      t.correctes += (p.players || []).reduce((a, j) => a + (j.bonnes || 0), 0);
      if (LEVELS.some((n) => n.id === p.niveau)) {
        const nv =
          perLevel[p.niveau] ||
          (perLevel[p.niveau] = {
            jouées: 0,
            correctes: 0,
          });
        nv.jouées += (p.total || 0) * nbJ;
        nv.correctes += (p.players || []).reduce((a, j) => a + (j.bonnes || 0), 0);
      }
    }
  }
  const parThemeListe = Object.entries(perTheme)
    .map(([id, v]) => ({
      id,
      ...v,
      pct: v.jouées ? Math.round((v.correctes / v.jouées) * 100) : 0,
    }))
    .sort((a, b) => b.jouées - a.jouées);

  // Par difficulté, dans l'ordre Facile / Moyen / Difficile
  const parNiveauListe = LEVELS.map((n) => {
    const v = perLevel[n.id] || {
      jouées: 0,
      correctes: 0,
    };
    return {
      id: n.id,
      nom: n.nom,
      couleur: n.couleur,
      ...v,
      pct: v.jouées ? Math.round((v.correctes / v.jouées) * 100) : 0,
    };
  }).filter((v) => v.jouées > 0);
  return {
    games: games.length,
    repondues,
    bonnes,
    pct: repondues ? Math.round((bonnes / repondues) * 100) : 0,
    points,
    perMode: perMode,
    parThemeListe,
    parNiveauListe,
  };
}

// Calendrier d'activité du mois en cours (grille L..D) + points des 30 derniers jours.
// `now` est paramétrable pour les tests.
export function computeCalendar(games, now = new Date()) {
  const parJour = {};
  const parJourPoints = {};
  for (const p of games) {
    if (!p.date) continue;
    const key = localDayKey(new Date(p.date));
    parJour[key] = (parJour[key] || 0) + 1;
    parJourPoints[key] =
      (parJourPoints[key] || 0) + (p.players || []).reduce((a, j) => a + (j.score || 0), 0);
  }
  const year = now.getFullYear();
  const month = now.getMonth();
  const nbJours = new Date(year, month + 1, 0).getDate(); // nb de jours dans le mois en cours
  const premier = new Date(year, month, 1);
  const decalage = (premier.getDay() + 6) % 7; // 0 = lundi en première colonne
  // grille du mois en cours : lignes de semaines, cases vides avant le 1er
  const weeks = [];
  let week = new Array(decalage).fill(null);
  for (let j = 1; j <= nbJours; j++) {
    const d = new Date(year, month, j);
    const key = localDayKey(d);
    const n = parJour[key] || 0;
    week.push({
      key,
      n,
      day: j,
      futur: d > now,
      niveau: n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : 3,
    });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push(week);
  const last30Days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - i);
    const key = localDayKey(d);
    last30Days.push({
      key,
      points: parJourPoints[key] || 0,
      games: parJour[key] || 0,
    });
  }
  const monthName = new Date(year, month, 1).toLocaleString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
  return {
    weeks: weeks,
    last30Days: last30Days,
    maxPoints: Math.max(1, ...last30Days.map((j) => j.points)),
    monthName,
  };
}

// Temps de réaction moyen (champ « secondes » des détails), null si aucune donnée.
export function computeAvgTime(games) {
  let somme = 0;
  let n = 0;
  for (const p of games) {
    for (const d of p.details || []) {
      if (typeof d.secondes === 'number') {
        somme += d.secondes;
        n++;
      }
    }
  }
  return n ? Math.round((somme / n) * 10) / 10 : null;
}

// XP globale (somme des thèmes) + niveau global + pourcentage vers le niveau suivant.
export function computeGlobalXp(xp) {
  const totalXp = Object.values(xp).reduce((a, b) => a + (b || 0), 0);
  const nivGlobal = themeLevel(totalXp);
  const xpLevel = xpForLevel(nivGlobal);
  const xpNext = xpForLevel(nivGlobal + 1);
  const pctXp = Math.min(
    100,
    Math.round(((totalXp - xpLevel) / Math.max(1, xpNext - xpLevel)) * 100)
  );
  return {
    totalXp,
    nivGlobal,
    xpLevel,
    xpNext,
    pctXp,
  };
}

// Thèmes triés par XP décroissante (ceux avec de l'XP uniquement).
export function sortThemesByXp(themes, xp) {
  return themes
    .map((t) => ({
      ...t,
      xp: xp[t.id] || 0,
      niv: themeLevel(xp[t.id] || 0),
    }))
    .filter((t) => t.xp > 0)
    .sort((a, b) => b.xp - a.xp);
}
