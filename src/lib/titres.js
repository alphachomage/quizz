// Titres de profil : ~50 titres déblocables.
// - 3 par thème (12 thèmes), débloqués au niveau 3 / 5 / 10 du thème = 36 titres
// - 14 titres généraux (parties, streak du jour, records, survie, duel, etc.)
// Le joueur choisit SON titre affiché sous la barre d'XP du profil (persisté en localStorage).
// Titre verrouillé = affiché « ??? » dans l'onglet (nom caché).

import { chargerXP, niveauTheme } from './xp.js';
import { statsBadges } from './badges.js';

// [niveau 3, niveau 5, niveau 10] pour chaque thème (id du thème -> 3 titres)
export const TITRES_PAR_THEME = {
  'culture-generale': ['Touche-à-tout', 'Érudit', 'Encyclopédie vivante'],
  'cinema-series': ['Fan de ciné', 'Cinéaste', 'Légende du 7e art'],
  'musique': ['Mélomane', 'Oreille absolue', 'Virtuose'],
  'sport': ['Amateur', 'Capitaine', 'Légende du stade'],
  'jeux-videos': ['Joueur', 'Gamer confirmé', 'Boss final'],
  'geographie': ['Touriste', 'Explorateur', 'Cartographe du monde'],
  'cuisine': ['Petit cuistot', 'Chef en herbe', 'Grand chef étoilé'],
  'espace': ['Terrien', 'Astronaute amateur', 'Conquérant de l’espace'],
  'histoire': ['Apprenti historien', 'Chroniqueur', 'Maître du temps'],
  'mythologie': ['Conteur de mythes', 'Prêtre des anciens', 'Oracle'],
  'sciences': ['Apprenti savant', 'Chercheur', 'Prix Nobel'],
  'mangas-animes': ['Otaku', 'Sensei', 'Légende du manga'],
};

export const PALIERS_TITRE = [3, 5, 10];

// 14 titres généraux (conditions sur les stats globales)
export const TITRES_GENERAUX = [
  { id: 'gen-parties-1', nom: 'Bleu', test: (s) => s.parties >= 1 },
  { id: 'gen-parties-25', nom: 'Habitué', test: (s) => s.parties >= 25 },
  { id: 'gen-parties-100', nom: 'Marathonien', test: (s) => s.parties >= 100 },
  { id: 'gen-streak-3', nom: 'En feu', test: (s) => s.streakJour >= 3 },
  { id: 'gen-streak-7', nom: 'Semaine parfaite', test: (s) => s.streakJour >= 7 },
  { id: 'gen-streak-30', nom: 'Un mois d’éclairs', test: (s) => s.streakJour >= 30 },
  { id: 'gen-solo-240', nom: 'Perfectionniste', test: (s) => s.recordSolo >= 240 },
  { id: 'gen-survie-15', nom: 'Légende vivante', test: (s) => s.recordSurvie >= 15 },
  { id: 'gen-duel-3', nom: 'Dominateur', test: (s) => s.duelGagnes >= 3 },
  { id: 'gen-themes-12', nom: 'Tour du monde', test: (s) => s.themesJoues >= 12 },
  { id: 'gen-questions-1000', nom: 'Cerveau XXL', test: (s) => s.repondues >= 1000 },
  { id: 'gen-reussite-80', nom: 'Excellence', test: (s) => s.repondues >= 100 && s.pctReussite >= 80 },
  { id: 'gen-points-5000', nom: 'Plein aux as', test: (s) => s.points >= 5000 },
  { id: 'gen-valide-1', nom: 'Contributeur', test: (s) => s.nbValidees >= 1 },
];

// Liste complète des titres avec état débloqué (36 par thème + 14 généraux = 50).
export function calculerTitres() {
  const xp = chargerXP();
  const s = statsBadges();
  const liste = [];
  for (const [themeId, noms] of Object.entries(TITRES_PAR_THEME)) {
    const niv = niveauTheme(xp[themeId] || 0);
    PALIERS_TITRE.forEach((palier, i) => {
      liste.push({
        id: `titre-${themeId}-${palier}`,
        nom: noms[i],
        themeId,
        palier,
        general: false,
        debloque: niv >= palier,
      });
    });
  }
  for (const g of TITRES_GENERAUX) {
    liste.push({
      id: g.id,
      nom: g.nom,
      themeId: null,
      palier: null,
      general: true,
      debloque: !!g.test(s),
    });
  }
  return liste;
}

// Le titre verrouillé le PLUS PROCHE de son déblocage (niveau de thème le plus avancé).
export function prochainTitre() {
  const xp = chargerXP();
  let best = null;
  for (const [themeId, noms] of Object.entries(TITRES_PAR_THEME)) {
    const niv = niveauTheme(xp[themeId] || 0);
    for (let i = 0; i < PALIERS_TITRE.length; i++) {
      const palier = PALIERS_TITRE[i];
      if (niv >= palier) continue;
      const pct = niv / palier;
      if (!best || pct > best.pct) {
        best = { id: `titre-${themeId}-${palier}`, nom: noms[i], themeId, actuel: niv, cible: palier, pct };
      }
    }
  }
  return best;
}

// --- Titre affiché sous la barre d'XP du profil ---
const CLE_TITRE = 'voltquiz_titre_actif';

export function titreActifId() {
  try {
    return localStorage.getItem(CLE_TITRE);
  } catch {
    return null;
  }
}

// Sélectionne le titre à afficher (uniquement s'il est débloqué).
export function definirTitreActif(id) {
  const t = calculerTitres().find((x) => x.id === id);
  if (t && t.debloque) localStorage.setItem(CLE_TITRE, id);
}

// Titre à afficher : celui choisi s'il est encore débloqué, sinon le plus haut palier débloqué.
export function titreAffiche() {
  const liste = calculerTitres();
  const actif = liste.find((t) => t.id === titreActifId());
  if (actif && actif.debloque) return actif.nom;
  const debloques = liste.filter((t) => t.debloque);
  if (debloques.length === 0) return null;
  const parTheme = debloques.filter((t) => !t.general).sort((a, b) => b.palier - a.palier)[0];
  return (parTheme || debloques[debloques.length - 1]).nom;
}
