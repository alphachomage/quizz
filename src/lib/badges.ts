// Badges déblocables (succès), calculés à partir des données locales :
// historique des parties, records, XP, série du quizz du jour, propositions.
// Chaque badge = { id, nom, desc (condition), icone, test(stats) -> bool }.
// Pas de design par badge : on réutilise les icônes SVG existantes (Icone.jsx).

import { read, write, STORAGE_KEYS } from './storage.js';
import { loadGames } from './game-history.js';
import { loadRecords } from './records.js';
import { loadXp, themeLevel } from './xp.js';
import { loadApproved, loadSubmissions } from './submissions.js';
import { currentDailyStreak } from './streak.js';

// Joueur d'une partie persistée dans l'historique (lib/game-history.js).
interface StoredGamePlayer {
  nom?: string;
  score?: number;
  bonnes?: number;
}

// Partie telle que persistée dans l'historique local.
interface StoredGame {
  id?: string;
  date?: string;
  mode?: string;
  niveau?: string | null;
  themeId?: string;
  themeName?: string;
  total?: number;
  players?: StoredGamePlayer[];
  scores?: number[];
  bonnes?: number[];
  details?: unknown[];
}

// Données injectables dans badgeStats (tests / recalcul ciblé depuis l'accueil).
interface BadgeStatsInput {
  games?: StoredGame[];
  records?: Record<string, number>;
  xp?: Record<string, number>;
}

// Statistiques agrégées servant aux conditions des badges.
export interface BadgeStats {
  games: number;
  repondues: number;
  bonnes: number;
  successPct: number;
  points: number;
  perfectSolo: boolean;
  duelsWon: number;
  dailyGames: number;
  playedThemes: number;
  recordSolo: number;
  recordRogue: number;
  /** Meilleure longueur de run Rogue Quizz (questions réussies d'affilée). */
  rogueBest: number;
  recordDuel: number;
  maxNiveauTheme: number;
  nbThemesNiv3: number;
  /** Niveau par thème (id du thème -> niveau), pour les badges liés à un thème précis. */
  themeLevels: Record<string, number>;
  dailyStreak: number;
  nbProposees: number;
  approvedCount: number;
}

// Définition d'un badge : test(s) reçoit les stats agrégées.
interface BadgeDef {
  id: string;
  nom: string;
  desc: string;
  icone: string;
  test: (s: BadgeStats) => boolean;
}

// Badge calculé (définition + état débloqué).
export type ComputedBadge = BadgeDef & { debloque: boolean };

// Statistiques agrégées servant aux conditions des badges.
export function badgeStats(data?: BadgeStatsInput): BadgeStats {
  const games = data?.games ?? (loadGames() as StoredGame[]);
  const records = data?.records ?? (loadRecords() as Record<string, number>);
  const xp = data?.xp ?? (loadXp() as Record<string, number>);
  let repondues = 0;
  let bonnes = 0;
  let points = 0;
  let perfectSolo = false;
  let duelsWon = 0;
  let rogueBest = 0;
  let dailyGames = 0;
  const playedThemes = new Set<string>();
  for (const p of games) {
    const players = p.players || [];
    const nbJ = players.length || 1;
    repondues += (p.total || 0) * nbJ;
    for (const j of players) {
      bonnes += j.bonnes || 0;
      points += j.score || 0;
    }
    if (p.themeId && p.themeId !== 'tous') playedThemes.add(p.themeId);
    if (p.mode === 'solo' && (p.total || 0) >= 10 && players.some((j) => j.bonnes === p.total))
      perfectSolo = true;
    if (
      p.mode === 'duel' &&
      players.length === 2 &&
      (players[0].score || 0) > (players[1].score || 0)
    )
      duelsWon += 1;
    if (p.mode === 'quotidien') dailyGames += 1;
    if (p.mode === 'rogue')
      rogueBest = Math.max(rogueBest, ...players.map((j) => j.bonnes || 0), 0);
  }
  const successPct = repondues ? Math.round((bonnes / repondues) * 100) : 0;
  const maxRecord = (prefix: string): number =>
    Math.max(
      0,
      ...Object.entries(records)
        .filter(([k]) => k.startsWith(prefix))
        .map(([, v]) => v)
    );
  const levels = Object.values(xp).map((v) => themeLevel(v));
  const themeLevels: Record<string, number> = {};
  for (const [id, v] of Object.entries(xp)) themeLevels[id] = themeLevel(v || 0);
  return {
    themeLevels,
    games: games.length,
    repondues,
    bonnes,
    successPct,
    points,
    perfectSolo: perfectSolo,
    duelsWon,
    dailyGames,
    playedThemes: playedThemes.size,
    recordSolo: maxRecord('solo:'),
    recordRogue: maxRecord('rogue:'),
    rogueBest,
    recordDuel: maxRecord('duel:'),
    maxNiveauTheme: levels.length ? Math.max(...levels) : 0,
    nbThemesNiv3: levels.filter((n) => n >= 3).length,
    dailyStreak: currentDailyStreak().account,
    // Offset posé par ?resetcompte=1 : les questions personal restent dans le pool,
    // mais les badges de soumission repartent de zéro.
    nbProposees: Math.max(0, loadSubmissions().length - resetSubmissionsFlag().proposees),
    approvedCount: Math.max(0, loadApproved().length - resetSubmissionsFlag().validees),
  };
}

// Offset des compteurs de soumissions enregistré lors d'un reset de progression
// (clé posée dans storage.js — literal ici pour éviter l'import circulaire).
function resetSubmissionsFlag(): { proposees: number; validees: number } {
  try {
    const o = (read(STORAGE_KEYS.resetSubmissions, null) || {}) as {
      proposees?: number;
      validees?: number;
    };
    return {
      proposees: o.proposees || 0,
      validees: o.validees || 0,
    };
  } catch {
    return {
      proposees: 0,
      validees: 0,
    };
  }
}

// Les 30 premiers badges. test(s) reçoit les stats agrégées.
export const BADGES: BadgeDef[] = [
  {
    id: 'parties-1',
    nom: 'Premier pas',
    desc: 'Jouer 1 partie',
    icone: 'sparkles',
    test: (s) => s.games >= 1,
  },
  {
    id: 'parties-10',
    nom: 'Habitué',
    desc: 'Jouer 10 parties',
    icone: 'timer',
    test: (s) => s.games >= 10,
  },
  {
    id: 'parties-50',
    nom: 'Accro',
    desc: 'Jouer 50 parties',
    icone: 'flame',
    test: (s) => s.games >= 50,
  },
  {
    id: 'parties-100',
    nom: 'Marathonien',
    desc: 'Jouer 100 parties',
    icone: 'podium',
    test: (s) => s.games >= 100,
  },
  {
    id: 'questions-100',
    nom: 'Curieux',
    desc: 'Répondre à 100 questions',
    icone: 'question',
    test: (s) => s.repondues >= 100,
  },
  {
    id: 'questions-500',
    nom: 'Encyclopédie',
    desc: 'Répondre à 500 questions',
    icone: 'book',
    test: (s) => s.repondues >= 500,
  },
  {
    id: 'questions-1000',
    nom: 'Cerveau XXL',
    desc: 'Répondre à 1000 questions',
    icone: 'sparkles',
    test: (s) => s.repondues >= 1000,
  },
  {
    id: 'reussite-80',
    nom: 'Excellence',
    desc: '80 % de réussite (min 100 questions)',
    icone: 'star',
    test: (s) => s.repondues >= 100 && s.successPct >= 80,
  },
  {
    id: 'solo-parfait',
    nom: 'Sans faute',
    desc: '10/10 bonnes réponses en solo',
    icone: 'trophy',
    test: (s) => s.perfectSolo,
  },
  {
    id: 'solo-100',
    nom: 'Centurion',
    desc: 'Record de 100 pts en solo',
    icone: 'bolt',
    test: (s) => s.recordSolo >= 100,
  },
  {
    id: 'solo-200',
    nom: 'Double centurion',
    desc: 'Record de 200 pts en solo',
    icone: 'swords',
    test: (s) => s.recordSolo >= 200,
  },
  {
    id: 'solo-240',
    nom: 'Score parfait',
    desc: 'Record de 240 pts en solo (max possible)',
    icone: 'sparkles',
    test: (s) => s.recordSolo >= 240,
  },
  {
    id: 'rogue-10',
    nom: 'Rogue naissant',
    desc: '10 questions d’affilée en Rogue Quizz',
    icone: 'gem',
    test: (s) => s.rogueBest >= 10,
  },
  {
    id: 'rogue-25',
    nom: 'Aventurier',
    desc: '25 questions d’affilée en Rogue Quizz',
    icone: 'compass',
    test: (s) => s.rogueBest >= 25,
  },
  {
    id: 'rogue-50',
    nom: 'Tueur de donjon',
    desc: '50 questions d’affilée en Rogue Quizz',
    icone: 'swords',
    test: (s) => s.rogueBest >= 50,
  },
  {
    id: 'rogue-75',
    nom: 'Chasseur de reliques',
    desc: '75 questions d’affilée en Rogue Quizz',
    icone: 'trophy',
    test: (s) => s.rogueBest >= 75,
  },
  {
    id: 'rogue-100',
    nom: 'Rogue accompli',
    desc: '100 questions d’affilée en Rogue Quizz (run parfaite)',
    icone: 'crown',
    test: (s) => s.rogueBest >= 100,
  },
  {
    id: 'duel-1',
    nom: 'Vainqueur',
    desc: 'Gagner 1 duel 1v1',
    icone: 'swords',
    test: (s) => s.duelsWon >= 1,
  },
  {
    id: 'duel-3',
    nom: 'Dominateur',
    desc: 'Gagner 3 duels 1v1',
    icone: 'podium',
    test: (s) => s.duelsWon >= 3,
  },
  {
    id: 'points-1000',
    nom: 'Mille points',
    desc: 'Cumuler 1000 points',
    icone: 'bolt',
    test: (s) => s.points >= 1000,
  },
  {
    id: 'points-5000',
    nom: 'Cinq mille',
    desc: 'Cumuler 5000 points',
    icone: 'flame',
    test: (s) => s.points >= 5000,
  },
  {
    id: 'quotidien-1',
    nom: 'Rituel',
    desc: 'Jouer le quizz du jour',
    icone: 'calendar',
    test: (s) => s.dailyStreak >= 1 || s.dailyGames >= 1,
  },
  {
    id: 'streak-3',
    nom: 'En feu',
    desc: 'Série de 3 jours sur le quizz du jour',
    icone: 'flame',
    test: (s) => s.dailyStreak >= 3,
  },
  {
    id: 'streak-7',
    nom: 'Semaine parfaite',
    desc: 'Série de 7 jours sur le quizz du jour',
    icone: 'bolt',
    test: (s) => s.dailyStreak >= 7,
  },
  {
    id: 'streak-30',
    nom: 'Un mois d’éclairs',
    desc: 'Série de 30 jours sur le quizz du jour',
    icone: 'sparkles',
    test: (s) => s.dailyStreak >= 30,
  },
  {
    id: 'niveau-3',
    nom: 'Apprenti',
    desc: 'Niveau 3 sur un thème',
    icone: 'star',
    test: (s) => s.maxNiveauTheme >= 3,
  },
  {
    id: 'niveau-5',
    nom: 'Confirmé',
    desc: 'Niveau 5 sur un thème',
    icone: 'podium',
    test: (s) => s.maxNiveauTheme >= 5,
  },
  {
    id: 'niveau-10',
    nom: 'Maître',
    desc: 'Niveau 10 sur un thème',
    icone: 'trophy',
    test: (s) => s.maxNiveauTheme >= 10,
  },
  {
    id: 'themes-5',
    nom: 'Explorateur',
    desc: 'Jouer dans 5 thèmes différents',
    icone: 'globe',
    test: (s) => s.playedThemes >= 5,
  },
  {
    id: 'themes-12',
    nom: 'Tour du monde',
    desc: 'Jouer dans 12 thèmes différents',
    icone: 'planet',
    test: (s) => s.playedThemes >= 12,
  },
  {
    id: 'themes-16',
    nom: 'Omniprésent',
    desc: 'Jouer dans les 16 thèmes',
    icone: 'globe',
    test: (s) => s.playedThemes >= 16,
  },
  // --- Badges des 4 nouveaux thèmes (niveau 3 puis 5 sur le thème) ---
  {
    id: 'theme-technologie-3',
    nom: 'Geek confirmé',
    desc: 'Niveau 3 sur le thème Technologie & Internet',
    icone: 'chip',
    test: (s) => (s.themeLevels['technologie'] || 0) >= 3,
  },
  {
    id: 'theme-technologie-5',
    nom: 'Expert du web',
    desc: 'Niveau 5 sur le thème Technologie & Internet',
    icone: 'chip',
    test: (s) => (s.themeLevels['technologie'] || 0) >= 5,
  },
  {
    id: 'theme-nature-3',
    nom: 'Ranger confirmé',
    desc: 'Niveau 3 sur le thème Nature & Animaux',
    icone: 'paw',
    test: (s) => (s.themeLevels['nature'] || 0) >= 3,
  },
  {
    id: 'theme-nature-5',
    nom: 'Naturaliste confirmé',
    desc: 'Niveau 5 sur le thème Nature & Animaux',
    icone: 'paw',
    test: (s) => (s.themeLevels['nature'] || 0) >= 5,
  },
  {
    id: 'theme-economie-3',
    nom: 'Businessman',
    desc: 'Niveau 3 sur le thème Économie & Marques',
    icone: 'coins',
    test: (s) => (s.themeLevels['economie'] || 0) >= 3,
  },
  {
    id: 'theme-economie-5',
    nom: 'Requin de la finance',
    desc: 'Niveau 5 sur le thème Économie & Marques',
    icone: 'coins',
    test: (s) => (s.themeLevels['economie'] || 0) >= 5,
  },
  {
    id: 'theme-auto-3',
    nom: 'Pilote confirmé',
    desc: 'Niveau 3 sur le thème Voitures & Auto-moto',
    icone: 'car',
    test: (s) => (s.themeLevels['auto'] || 0) >= 3,
  },
  {
    id: 'theme-auto-5',
    nom: 'As du volant',
    desc: 'Niveau 5 sur le thème Voitures & Auto-moto',
    icone: 'car',
    test: (s) => (s.themeLevels['auto'] || 0) >= 5,
  },
  {
    id: 'propose-1',
    nom: 'Contributeur',
    desc: 'Proposer 1 question',
    icone: 'pencil',
    test: (s) => s.nbProposees + s.approvedCount >= 1,
  },
  {
    id: 'validees-3',
    nom: 'Auteur publié',
    desc: '3 questions validées par l’admin',
    icone: 'check',
    test: (s) => s.approvedCount >= 3,
  },
];

// Retourne la liste des badges avec leur état débloqué ou non.
export function computeBadges(): ComputedBadge[] {
  const s = badgeStats();
  return BADGES.map((b) => ({
    ...b,
    debloque: !!b.test(s),
  }));
}

// Progression vers chaque badge à seuil numérique (pour l'affichage « prochain badge »).
const PROGRES_BADGES: Record<string, (s: BadgeStats) => [number, number]> = {
  'parties-1': (s) => [s.games, 1],
  'parties-10': (s) => [s.games, 10],
  'parties-50': (s) => [s.games, 50],
  'parties-100': (s) => [s.games, 100],
  'questions-100': (s) => [s.repondues, 100],
  'questions-500': (s) => [s.repondues, 500],
  'questions-1000': (s) => [s.repondues, 1000],
  'solo-100': (s) => [s.recordSolo, 100],
  'solo-200': (s) => [s.recordSolo, 200],
  'solo-240': (s) => [s.recordSolo, 240],
  'rogue-10': (s) => [s.rogueBest, 10],
  'rogue-25': (s) => [s.rogueBest, 25],
  'rogue-50': (s) => [s.rogueBest, 50],
  'rogue-75': (s) => [s.rogueBest, 75],
  'rogue-100': (s) => [s.rogueBest, 100],
  'duel-1': (s) => [s.duelsWon, 1],
  'duel-3': (s) => [s.duelsWon, 3],
  'points-1000': (s) => [s.points, 1000],
  'points-5000': (s) => [s.points, 5000],
  'streak-3': (s) => [s.dailyStreak, 3],
  'streak-7': (s) => [s.dailyStreak, 7],
  'streak-30': (s) => [s.dailyStreak, 30],
  'niveau-3': (s) => [s.maxNiveauTheme, 3],
  'niveau-5': (s) => [s.maxNiveauTheme, 5],
  'niveau-10': (s) => [s.maxNiveauTheme, 10],
  'themes-5': (s) => [s.playedThemes, 5],
  'themes-12': (s) => [s.playedThemes, 12],
  'themes-16': (s) => [s.playedThemes, 16],
  'theme-technologie-3': (s) => [s.themeLevels['technologie'] || 0, 3],
  'theme-technologie-5': (s) => [s.themeLevels['technologie'] || 0, 5],
  'theme-nature-3': (s) => [s.themeLevels['nature'] || 0, 3],
  'theme-nature-5': (s) => [s.themeLevels['nature'] || 0, 5],
  'theme-economie-3': (s) => [s.themeLevels['economie'] || 0, 3],
  'theme-economie-5': (s) => [s.themeLevels['economie'] || 0, 5],
  'theme-auto-3': (s) => [s.themeLevels['auto'] || 0, 3],
  'theme-auto-5': (s) => [s.themeLevels['auto'] || 0, 5],
  'propose-1': (s) => [s.nbProposees + s.approvedCount, 1],
  'validees-3': (s) => [s.approvedCount, 3],
};

// Badge verrouillé le plus proche de son déblocage, avec sa progression.
interface NextBadge {
  id: string;
  nom: string;
  desc: string;
  icone: string;
  current: number;
  target: number;
  pct: number;
}

// Le badge verrouillé le PLUS PROCHE de son déblocage (effet « reviens-y » sur l'accueil).
function nextBadge(s: BadgeStats = badgeStats()): NextBadge | null {
  let best: NextBadge | null = null;
  for (const b of computeBadges()) {
    if (b.debloque) continue;
    const p = PROGRES_BADGES[b.id];
    const [current, target] = p ? p(s) : [0, 1];
    const pct = target > 0 ? Math.min(1, current / target) : 0;
    if (!best || pct > best.pct) {
      best = {
        id: b.id,
        nom: b.nom,
        desc: b.desc,
        icone: b.icone,
        current,
        target,
        pct,
      };
    }
  }
  return best;
}

// --- Badge favori affiché sur la carte profil (1 badge choisi parmi les débloqués) ---
export { nextBadge };
function favoriteBadgeId(): string | null {
  try {
    return read(STORAGE_KEYS.favoriteBadge, null) as string | null;
  } catch {
    return null;
  }
}
export function setFavoriteBadge(id: string): void {
  const b = computeBadges().find((x) => x.id === id);
  if (b && b.debloque) write(STORAGE_KEYS.favoriteBadge, id);
}

// Badge favori si toujours débloqué, sinon null.
export function favoriteBadge(): ComputedBadge | null {
  const id = favoriteBadgeId();
  if (!id) return null;
  const b = computeBadges().find((x) => x.id === id);
  return b && b.debloque ? b : null;
}
