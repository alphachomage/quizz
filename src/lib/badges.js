// Badges déblocables (succès), calculés à partir des données locales :
// historique des parties, records, XP, série du quizz du jour, propositions.
// Chaque badge = { id, nom, desc (condition), icone, test(stats) -> bool }.
// Pas de design par badge : on réutilise les icônes SVG existantes (Icone.jsx).

import {
  chargerParties,
  chargerRecords,
  chargerXP,
  niveauTheme,
  chargerValidees,
  chargerSoumissions,
  streakJourActuelle,
} from './logique.js';

// Statistiques agrégées servant aux conditions des badges.
export function statsBadges() {
  const parties = chargerParties();
  const records = chargerRecords();
  const xp = chargerXP();

  let repondues = 0;
  let bonnes = 0;
  let points = 0;
  let soloParfait = false;
  let duelGagnes = 0;
  let partiesQuotidien = 0;
  const themesJoues = new Set();

  for (const p of parties) {
    const nbJ = (p.joueurs || []).length || 1;
    repondues += (p.total || 0) * nbJ;
    for (const j of p.joueurs || []) {
      bonnes += j.bonnes || 0;
      points += j.score || 0;
    }
    if (p.themeId && p.themeId !== 'tous') themesJoues.add(p.themeId);
    if (p.mode === 'solo' && p.total >= 10 && (p.joueurs || []).some((j) => j.bonnes === p.total)) soloParfait = true;
    if (p.mode === 'duel' && (p.joueurs || []).length === 2 && p.joueurs[0].score > p.joueurs[1].score) duelGagnes += 1;
    if (p.mode === 'quotidien') partiesQuotidien += 1;
  }

  const pctReussite = repondues ? Math.round((bonnes / repondues) * 100) : 0;
  const maxRecord = (prefix) =>
    Math.max(0, ...Object.entries(records).filter(([k]) => k.startsWith(prefix)).map(([, v]) => v));
  const niveaux = Object.values(xp).map((v) => niveauTheme(v));

  return {
    parties: parties.length,
    repondues,
    bonnes,
    pctReussite,
    points,
    soloParfait,
    duelGagnes,
    partiesQuotidien,
    themesJoues: themesJoues.size,
    recordSolo: maxRecord('solo:'),
    recordSurvie: maxRecord('survie:'),
    recordDuel: maxRecord('duel:'),
    maxNiveauTheme: niveaux.length ? Math.max(...niveaux) : 0,
    nbThemesNiv3: niveaux.filter((n) => n >= 3).length,
    streakJour: streakJourActuelle().compte,
    nbProposees: chargerSoumissions().length,
    nbValidees: chargerValidees().length,
  };
}

// Les 30 premiers badges. test(s) reçoit les stats agrégées.
export const BADGES = [
  { id: 'parties-1', nom: 'Premier pas', desc: 'Jouer 1 partie', icone: 'sparkles', test: (s) => s.parties >= 1 },
  { id: 'parties-10', nom: 'Habitué', desc: 'Jouer 10 parties', icone: 'timer', test: (s) => s.parties >= 10 },
  { id: 'parties-50', nom: 'Accro', desc: 'Jouer 50 parties', icone: 'flame', test: (s) => s.parties >= 50 },
  { id: 'parties-100', nom: 'Marathonien', desc: 'Jouer 100 parties', icone: 'podium', test: (s) => s.parties >= 100 },
  { id: 'questions-100', nom: 'Curieux', desc: 'Répondre à 100 questions', icone: 'question', test: (s) => s.repondues >= 100 },
  { id: 'questions-500', nom: 'Encyclopédie', desc: 'Répondre à 500 questions', icone: 'book', test: (s) => s.repondues >= 500 },
  { id: 'questions-1000', nom: 'Cerveau XXL', desc: 'Répondre à 1000 questions', icone: 'sparkles', test: (s) => s.repondues >= 1000 },
  { id: 'reussite-80', nom: 'Excellence', desc: '80 % de réussite (min 100 questions)', icone: 'star', test: (s) => s.repondues >= 100 && s.pctReussite >= 80 },
  { id: 'solo-parfait', nom: 'Sans faute', desc: '10/10 bonnes réponses en solo', icone: 'trophy', test: (s) => s.soloParfait },
  { id: 'solo-100', nom: 'Centurion', desc: 'Record de 100 pts en solo', icone: 'bolt', test: (s) => s.recordSolo >= 100 },
  { id: 'solo-200', nom: 'Double centurion', desc: 'Record de 200 pts en solo', icone: 'swords', test: (s) => s.recordSolo >= 200 },
  { id: 'solo-240', nom: 'Score parfait', desc: 'Record de 240 pts en solo (max possible)', icone: 'sparkles', test: (s) => s.recordSolo >= 240 },
  { id: 'survie-5', nom: 'Survivant', desc: '5 bonnes réponses d’affilée en survie', icone: 'skull', test: (s) => s.recordSurvie >= 5 },
  { id: 'survie-10', nom: 'Increvable', desc: '10 bonnes réponses d’affilée en survie', icone: 'check', test: (s) => s.recordSurvie >= 10 },
  { id: 'survie-15', nom: 'Légende vivante', desc: '15 bonnes réponses d’affilée en survie', icone: 'trophy', test: (s) => s.recordSurvie >= 15 },
  { id: 'duel-1', nom: 'Vainqueur', desc: 'Gagner 1 duel 1v1', icone: 'swords', test: (s) => s.duelGagnes >= 1 },
  { id: 'duel-3', nom: 'Dominateur', desc: 'Gagner 3 duels 1v1', icone: 'podium', test: (s) => s.duelGagnes >= 3 },
  { id: 'points-1000', nom: 'Mille points', desc: 'Cumuler 1000 points', icone: 'bolt', test: (s) => s.points >= 1000 },
  { id: 'points-5000', nom: 'Cinq mille', desc: 'Cumuler 5000 points', icone: 'flame', test: (s) => s.points >= 5000 },
  { id: 'quotidien-1', nom: 'Rituel', desc: 'Jouer le quizz du jour', icone: 'calendar', test: (s) => s.streakJour >= 1 || s.partiesQuotidien >= 1 },
  { id: 'streak-3', nom: 'En feu', desc: 'Série de 3 jours sur le quizz du jour', icone: 'flame', test: (s) => s.streakJour >= 3 },
  { id: 'streak-7', nom: 'Semaine parfaite', desc: 'Série de 7 jours sur le quizz du jour', icone: 'bolt', test: (s) => s.streakJour >= 7 },
  { id: 'streak-30', nom: 'Un mois d’éclairs', desc: 'Série de 30 jours sur le quizz du jour', icone: 'sparkles', test: (s) => s.streakJour >= 30 },
  { id: 'niveau-3', nom: 'Apprenti', desc: 'Niveau 3 sur un thème', icone: 'star', test: (s) => s.maxNiveauTheme >= 3 },
  { id: 'niveau-5', nom: 'Confirmé', desc: 'Niveau 5 sur un thème', icone: 'podium', test: (s) => s.maxNiveauTheme >= 5 },
  { id: 'niveau-10', nom: 'Maître', desc: 'Niveau 10 sur un thème', icone: 'trophy', test: (s) => s.maxNiveauTheme >= 10 },
  { id: 'themes-5', nom: 'Explorateur', desc: 'Jouer dans 5 thèmes différents', icone: 'globe', test: (s) => s.themesJoues >= 5 },
  { id: 'themes-12', nom: 'Tour du monde', desc: 'Jouer dans les 12 thèmes', icone: 'planet', test: (s) => s.themesJoues >= 12 },
  { id: 'propose-1', nom: 'Contributeur', desc: 'Proposer 1 question', icone: 'pencil', test: (s) => s.nbProposees + s.nbValidees >= 1 },
  { id: 'validees-3', nom: 'Auteur publié', desc: '3 questions validées par l’admin', icone: 'check', test: (s) => s.nbValidees >= 3 },
];

// Retourne la liste des badges avec leur état débloqué ou non.
export function calculerBadges() {
  const s = statsBadges();
  return BADGES.map((b) => ({ ...b, debloque: !!b.test(s) }));
}

// --- Badge favori affiché sur la carte profil (1 badge choisi parmi les débloqués) ---
const CLE_BADGE_FAVORI = 'voltquiz_badge_favori';

export function badgeFavoriId() {
  try {
    return localStorage.getItem(CLE_BADGE_FAVORI);
  } catch {
    return null;
  }
}

export function definirBadgeFavori(id) {
  const b = calculerBadges().find((x) => x.id === id);
  if (b && b.debloque) localStorage.setItem(CLE_BADGE_FAVORI, id);
}

// Badge favori si toujours débloqué, sinon null.
export function badgeFavori() {
  const id = badgeFavoriId();
  if (!id) return null;
  const b = calculerBadges().find((x) => x.id === id);
  return b && b.debloque ? b : null;
}
