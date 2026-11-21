// dashboardCompute.js — calculs du tableau de bord admin (?admin=1), en fonctions
// PURES (testables hors React, comme features/stats/statsCompute.js).
// Toutes les entrées viennent de la couche lib/ (loaders storage) : ce module ne
// touche ni localStorage ni le DOM (R5).
import { localDayKey } from '@lib/dates.js';
import { levelName } from '@lib/scoring.js';

// Libellés + icônes des modes de jeu (clés de l'historique = ids internes).
export const MODE_LABELS = {
  solo: { nom: 'Solo', icone: 'timer' },
  duel: { nom: 'Duel 1v1', icone: 'swords' },
  survie: { nom: 'Survie', icone: 'skull' },
  quotidien: { nom: 'Quizz du jour', icone: 'calendar' },
};

export function modeLabel(mode) {
  return (MODE_LABELS[mode] || { nom: mode, icone: 'question' }).nom;
}

export function modeIcone(mode) {
  return (MODE_LABELS[mode] || { icone: 'question' }).icone;
}

// Décompose une clé de record `mode:niveau:themeId` (voir lib/records.js recordKey).
export function parseRecordKey(key) {
  const [mode, niveau, ...reste] = String(key).split(':');
  return { mode, niveau, themeId: reste.join(':') };
}

// Corpus jouable : thèmes + questions (la prop `themes` a déjà les exclusions
// retirées et les questions validées ajoutées — voir ThemesContext).
export function computeCorpus(themes) {
  const liste = Array.isArray(themes) ? themes : [];
  return {
    nbThemes: liste.length,
    nbQuestions: liste.reduce((a, t) => a + ((t.questions && t.questions.length) || 0), 0),
  };
}

// Bilan des parties jouées : total, par mode, % de réussite global.
// Même convention que l'historique : repondues = total x nb joueurs, bonnes = somme
// des « bonnes » des joueurs (voir features/stats/statsCompute.js computeStats).
export function computeGamesMetrics(games) {
  const liste = Array.isArray(games) ? games : [];
  let repondues = 0;
  let bonnes = 0;
  const parMode = {};
  for (const p of liste) {
    const nbJ = (p.players || []).length || 1;
    const rep = (p.total || 0) * nbJ;
    const bon = (p.players || []).reduce((a, j) => a + (j.bonnes || 0), 0);
    repondues += rep;
    bonnes += bon;
    const m = parMode[p.mode] || (parMode[p.mode] = { games: 0, repondues: 0, bonnes: 0 });
    m.games += 1;
    m.repondues += rep;
    m.bonnes += bon;
  }
  const parModeListe = Object.entries(parMode)
    .map(([mode, v]) => ({ mode, ...v, pct: v.repondues ? Math.round((v.bonnes / v.repondues) * 100) : 0 }))
    .sort((a, b) => b.games - a.games || b.bonnes - a.bonnes);
  return {
    total: liste.length,
    repondues,
    bonnes,
    pct: repondues ? Math.round((bonnes / repondues) * 100) : 0,
    parMode: parModeListe,
  };
}

// Top N des records locaux (objet clé -> valeur), triés par valeur décroissante.
export function computeRecordsTop(records, n = 5) {
  return Object.entries(records || {})
    .map(([key, valeur]) => ({ key, valeur, ...parseRecordKey(key) }))
    .sort((a, b) => b.valeur - a.valeur)
    .slice(0, n);
}

// Compteurs de modération : signalements (total + en attente de vérification),
// soumissions en attente, validées, suggestions joueurs, exclusions du pool.
export function computeModeration({ reports = [], submissions = [], approved = [], suggestions = [], excluded = [] } = {}) {
  const liste = Array.isArray(reports) ? reports : [];
  return {
    signalementsTotal: liste.length,
    signalementsEnAttente: liste.filter((r) => !r.statut).length,
    soumissions: (Array.isArray(submissions) ? submissions : []).length,
    validees: (Array.isArray(approved) ? approved : []).length,
    suggestions: (Array.isArray(suggestions) ? suggestions : []).length,
    exclusions: (Array.isArray(excluded) ? excluded : []).length,
  };
}

// Série du quizz du jour + activité d'aujourd'hui. `now` paramétrable pour les tests
// (hier est dérivé de `now`, pas de l'horloge réelle). Une série dont le dernier jour
// joué est antérieur à hier est rompue (compte = 0), même règle que currentDailyStreak.
export function computeStreak(streak, games, now = new Date()) {
  const s = streak || { compte: 0, dernierJour: null };
  const hier = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const cleHier = localDayKey(hier);
  const compte = s.dernierJour && s.dernierJour >= cleHier ? s.compte || 0 : 0;
  const cleAujourdhui = localDayKey(now);
  const liste = Array.isArray(games) ? games : [];
  const partiesAujourdhui = liste.filter((g) => g.date && localDayKey(new Date(g.date)) === cleAujourdhui).length;
  return { compte, dernierJour: s.dernierJour || null, partiesAujourdhui };
}

// Libellé d'une ligne de record pour l'affichage : « Solo · Moyen · Histoire ».
export function recordLabel(r) {
  const niveau = r.niveau && r.niveau !== 'mix' ? ` · ${levelName(r.niveau)}` : '';
  return `${modeLabel(r.mode)}${niveau} · ${r.themeId}`;
}
