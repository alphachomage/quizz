// Titres de profil : ~50 titres déblocables.
// - 3 par thème (12 thèmes), débloqués au niveau 3 / 5 / 10 du thème = 36 titres
// - 14 titres généraux (parties, streak du jour, records, survie, duel, etc.)
// Le joueur choisit SON titre affiché sous la barre d'XP du profil (persisté en localStorage).
// Titre verrouillé = affiché « ??? » dans l'onglet (nom caché).

import { read, write, STORAGE_KEYS } from './storage.js';
import { loadXp, themeLevel } from './xp.js';
import { badgeStats } from './badges.js';

// [niveau 3, niveau 5, niveau 10] pour chaque thème (id du thème -> 3 titres)
const TITLES_PER_THEME = {
  'culture-generale': ['Touche-à-tout', 'Érudit', 'Encyclopédie vivante'],
  'cinema-series': ['Fan de ciné', 'Cinéaste', 'Légende du 7e art'],
  musique: ['Mélomane', 'Oreille absolue', 'Virtuose'],
  sport: ['Amateur', 'Capitaine', 'Légende du stade'],
  'jeux-videos': ['Joueur', 'Gamer confirmé', 'Boss final'],
  geographie: ['Touriste', 'Explorateur', 'Cartographe du monde'],
  cuisine: ['Petit cuistot', 'Chef en herbe', 'Grand chef étoilé'],
  espace: ['Terrien', 'Astronaute amateur', 'Conquérant de l’espace'],
  histoire: ['Apprenti historien', 'Chroniqueur', 'Maître du temps'],
  mythologie: ['Conteur de mythes', 'Prêtre des anciens', 'Oracle'],
  sciences: ['Apprenti savant', 'Chercheur', 'Prix Nobel'],
  'mangas-animes': ['Otaku', 'Sensei', 'Légende du manga'],
};
const TITLE_TIERS = [3, 5, 10];

// 14 titres généraux (conditions sur les stats globales)
const GENERAL_TITLES = [
  {
    id: 'gen-parties-1',
    nom: 'Bleu',
    test: (s) => s.games >= 1,
  },
  {
    id: 'gen-parties-25',
    nom: 'Habitué',
    test: (s) => s.games >= 25,
  },
  {
    id: 'gen-parties-100',
    nom: 'Marathonien',
    test: (s) => s.games >= 100,
  },
  {
    id: 'gen-streak-3',
    nom: 'En feu',
    test: (s) => s.dailyStreak >= 3,
  },
  {
    id: 'gen-streak-7',
    nom: 'Semaine parfaite',
    test: (s) => s.dailyStreak >= 7,
  },
  {
    id: 'gen-streak-30',
    nom: 'Un mois d’éclairs',
    test: (s) => s.dailyStreak >= 30,
  },
  {
    id: 'gen-solo-240',
    nom: 'Perfectionniste',
    test: (s) => s.recordSolo >= 240,
  },
  {
    id: 'gen-survie-15',
    nom: 'Légende vivante',
    test: (s) => s.recordSurvie >= 15,
  },
  {
    id: 'gen-duel-3',
    nom: 'Dominateur',
    test: (s) => s.duelsWon >= 3,
  },
  {
    id: 'gen-themes-12',
    nom: 'Tour du monde',
    test: (s) => s.playedThemes >= 12,
  },
  {
    id: 'gen-questions-1000',
    nom: 'Cerveau XXL',
    test: (s) => s.repondues >= 1000,
  },
  {
    id: 'gen-reussite-80',
    nom: 'Excellence',
    test: (s) => s.repondues >= 100 && s.successPct >= 80,
  },
  {
    id: 'gen-points-5000',
    nom: 'Plein aux as',
    test: (s) => s.points >= 5000,
  },
  {
    id: 'gen-valide-1',
    nom: 'Contributeur',
    test: (s) => s.approvedCount >= 1,
  },
];

// Liste complète des titres avec état débloqué (36 par thème + 14 généraux = 50).
export function computeTitles() {
  const xp = loadXp();
  const s = badgeStats();
  const list = [];
  for (const [themeId, noms] of Object.entries(TITLES_PER_THEME)) {
    const niv = themeLevel(xp[themeId] || 0);
    TITLE_TIERS.forEach((palier, i) => {
      list.push({
        id: `titre-${themeId}-${palier}`,
        nom: noms[i],
        themeId,
        palier,
        general: false,
        debloque: niv >= palier,
      });
    });
  }
  for (const g of GENERAL_TITLES) {
    list.push({
      id: g.id,
      nom: g.nom,
      themeId: null,
      palier: null,
      general: true,
      debloque: !!g.test(s),
    });
  }
  return list;
}

// Le titre verrouillé le PLUS PROCHE de son déblocage (niveau de thème le plus avancé).
function nextTitle() {
  const xp = loadXp();
  let best = null;
  for (const [themeId, noms] of Object.entries(TITLES_PER_THEME)) {
    const niv = themeLevel(xp[themeId] || 0);
    for (let i = 0; i < TITLE_TIERS.length; i++) {
      const palier = TITLE_TIERS[i];
      if (niv >= palier) continue;
      const pct = niv / palier;
      if (!best || pct > best.pct) {
        best = {
          id: `titre-${themeId}-${palier}`,
          nom: noms[i],
          themeId,
          current: niv,
          target: palier,
          pct,
        };
      }
    }
  }
  return best;
}

// --- Titre affiché sous la barre d'XP du profil ---
export { nextTitle };
export function activeTitleId() {
  try {
    return read(STORAGE_KEYS.activeTitle, null);
  } catch {
    return null;
  }
}

// Sélectionne le titre à afficher (uniquement s'il est débloqué).
export function setActiveTitle(id) {
  const t = computeTitles().find((x) => x.id === id);
  if (t && t.debloque) write(STORAGE_KEYS.activeTitle, id);
}

// Titre à afficher : celui choisi s'il est encore débloqué, sinon le plus haut palier débloqué.
export function displayedTitle() {
  const list = computeTitles();
  const active = list.find((t) => t.id === activeTitleId());
  if (active && active.debloque) return active.nom;
  const debloques = list.filter((t) => t.debloque);
  if (debloques.length === 0) return null;
  const perTheme = debloques.filter((t) => !t.general).sort((a, b) => b.palier - a.palier)[0];
  return (perTheme || debloques[debloques.length - 1]).nom;
}
