// features/stats/statsCalculs.js — calculs de l'écran « Mes statistiques »,
// extraits du composant en fonctions PURES (testables hors React).
// Tout se calcule à partir de l'historique local des parties + de l'XP.
import { NIVEAUX, cleJourLocal, niveauTheme, xpPourNiveau } from '@lib/index.js';

// Bilan global + par mode + par thème + par difficulté.
export function calculerStats(parties) {
  let repondues = 0;
  let bonnes = 0;
  let points = 0;
  const parMode = {};
  const parTheme = {}; // themeId -> { nom, jouées, correctes }
  const parNiveau = {}; // 'facile'|'moyen'|'dur' -> { jouées, correctes }

  for (const p of parties) {
    const nbJ = (p.joueurs || []).length || 1;
    repondues += (p.total || 0) * nbJ;
    for (const j of p.joueurs || []) {
      bonnes += j.bonnes || 0;
      points += j.score || 0;
    }
    const m = parMode[p.mode] || (parMode[p.mode] = { parties: 0, meilleur: 0 });
    m.parties += 1;
    m.meilleur = Math.max(m.meilleur, ...(p.joueurs || []).map((j) => j.score || 0));

    if (Array.isArray(p.details) && p.details.length > 0) {
      for (const d of p.details) {
        const t = parTheme[d.themeId] || (parTheme[d.themeId] = { nom: d.themeNom || d.themeId, jouées: 0, correctes: 0 });
        t.jouées += 1;
        if (d.correct) t.correctes += 1;
        // % de réussite par difficulté (on ignore le quizz du jour dont le « niveau » est une date)
        if (NIVEAUX.some((n) => n.id === d.niveau)) {
          const nv = parNiveau[d.niveau] || (parNiveau[d.niveau] = { jouées: 0, correctes: 0 });
          nv.jouées += 1;
          if (d.correct) nv.correctes += 1;
        }
      }
    } else {
      const t = parTheme[p.themeId] || (parTheme[p.themeId] = { nom: p.themeNom || p.themeId, jouées: 0, correctes: 0 });
      t.jouées += (p.total || 0) * nbJ;
      t.correctes += (p.joueurs || []).reduce((a, j) => a + (j.bonnes || 0), 0);
      if (NIVEAUX.some((n) => n.id === p.niveau)) {
        const nv = parNiveau[p.niveau] || (parNiveau[p.niveau] = { jouées: 0, correctes: 0 });
        nv.jouées += (p.total || 0) * nbJ;
        nv.correctes += (p.joueurs || []).reduce((a, j) => a + (j.bonnes || 0), 0);
      }
    }
  }

  const parThemeListe = Object.entries(parTheme)
    .map(([id, v]) => ({ id, ...v, pct: v.jouées ? Math.round((v.correctes / v.jouées) * 100) : 0 }))
    .sort((a, b) => b.jouées - a.jouées);

  // Par difficulté, dans l'ordre Facile / Moyen / Difficile
  const parNiveauListe = NIVEAUX.map((n) => {
    const v = parNiveau[n.id] || { jouées: 0, correctes: 0 };
    return { id: n.id, nom: n.nom, couleur: n.couleur, ...v, pct: v.jouées ? Math.round((v.correctes / v.jouées) * 100) : 0 };
  }).filter((v) => v.jouées > 0);

  return {
    parties: parties.length,
    repondues,
    bonnes,
    pct: repondues ? Math.round((bonnes / repondues) * 100) : 0,
    points,
    parMode,
    parThemeListe,
    parNiveauListe,
  };
}

// Calendrier d'activité du mois en cours (grille L..D) + points des 30 derniers jours.
// `now` est paramétrable pour les tests.
export function calculerCalendrier(parties, now = new Date()) {
  const parJour = {};
  const parJourPoints = {};
  for (const p of parties) {
    if (!p.date) continue;
    const cle = cleJourLocal(new Date(p.date));
    parJour[cle] = (parJour[cle] || 0) + 1;
    parJourPoints[cle] = (parJourPoints[cle] || 0) + (p.joueurs || []).reduce((a, j) => a + (j.score || 0), 0);
  }
  const annee = now.getFullYear();
  const mois = now.getMonth();
  const nbJours = new Date(annee, mois + 1, 0).getDate(); // nb de jours dans le mois en cours
  const premier = new Date(annee, mois, 1);
  const decalage = (premier.getDay() + 6) % 7; // 0 = lundi en première colonne
  // grille du mois en cours : lignes de semaines, cases vides avant le 1er
  const semaines = [];
  let semaine = new Array(decalage).fill(null);
  for (let j = 1; j <= nbJours; j++) {
    const d = new Date(annee, mois, j);
    const cle = cleJourLocal(d);
    const n = parJour[cle] || 0;
    semaine.push({ cle, n, jour: j, futur: d > now, niveau: n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : 3 });
    if (semaine.length === 7) {
      semaines.push(semaine);
      semaine = [];
    }
  }
  if (semaine.length > 0) semaines.push(semaine);
  const jours30 = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - i);
    const cle = cleJourLocal(d);
    jours30.push({ cle, points: parJourPoints[cle] || 0, parties: parJour[cle] || 0 });
  }
  const nomMois = new Date(annee, mois, 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
  return { semaines, jours30, maxPoints: Math.max(1, ...jours30.map((j) => j.points)), nomMois };
}

// Temps de réaction moyen (champ « secondes » des détails), null si aucune donnée.
export function calculerTempsMoyen(parties) {
  let somme = 0;
  let n = 0;
  for (const p of parties) {
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
export function calculerXpGlobale(xp) {
  const xpTotal = Object.values(xp).reduce((a, b) => a + (b || 0), 0);
  const nivGlobal = niveauTheme(xpTotal);
  const xpNiv = xpPourNiveau(nivGlobal);
  const xpNext = xpPourNiveau(nivGlobal + 1);
  const pctXp = Math.min(100, Math.round(((xpTotal - xpNiv) / Math.max(1, xpNext - xpNiv)) * 100));
  return { xpTotal, nivGlobal, xpNiv, xpNext, pctXp };
}

// Thèmes triés par XP décroissante (ceux avec de l'XP uniquement).
export function classerThemesParXp(themes, xp) {
  return themes
    .map((t) => ({ ...t, xp: xp[t.id] || 0, niv: niveauTheme(xp[t.id] || 0) }))
    .filter((t) => t.xp > 0)
    .sort((a, b) => b.xp - a.xp);
}
