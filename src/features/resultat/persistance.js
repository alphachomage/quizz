// features/resultat/persistance.js — persistance d'une partie terminée.
// Appelée UNE FOIS depuis App.terminer (plus depuis un useEffect de montage du
// composant d'affichage) : record, historique (leaderboard/stats), XP par thème
// et globale, position au classement, série de jours du quizz du jour, sons.
// Retourne toutes les valeurs affichées par l'écran de résultats.
// Mode invité : rien n'est enregistré (sauf le record local), aucune XP.
import { chargerParties, ajouterPartie } from '@lib/parties-historique.js';
import { chargerRecords, sauverRecord, cleRecord } from '@lib/records.js';
import { chargerXP, ajouterXP, niveauTheme } from '@lib/xp.js';
import { enregistrerStreakJour } from '@lib/streak.js';
import { jouerSon, vibrer } from '@lib/sons.js';

import { pctNiveau } from './statsPartie.js';

export function persisterResultat(resultat, estInvite, prefs) {
  const { mode, niveau, theme, joueurs, scores, bonnes, total, details } = resultat;
  const cle = cleRecord(mode, niveau, theme.id);

  // --- Record du mode x niveau x thème ---
  const valeur = mode === 'duel' ? Math.max(...scores) : scores[0];
  const avant = chargerRecords()[cle] || 0;
  const estRecord = valeur > avant && valeur > 0;
  const record = sauverRecord(cle, valeur);
  if (estRecord) {
    jouerSon('record', prefs);
    vibrer([60, 60, 120], prefs);
  } else {
    jouerSon('fin', prefs);
  }

  // --- Historique de la partie (alimente le leaderboard ET les statistiques perso) ---
  if (!estInvite) {
    ajouterPartie({
      mode,
      niveau,
      themeId: theme.id,
      themeNom: theme.nom,
      total,
      details: details || [],
      joueurs: joueurs.map((nom, i) => ({ nom, score: scores[i], bonnes: bonnes[i] })),
    });
  }

  // --- XP gagnée : par thème grâce au détail question par question ---
  let xpTheme = [];
  let xpGlobal = { avant: 0, apres: 0, gain: 0 };
  if (!estInvite) {
    const xpAvant = chargerXP();
    const parTheme = {};
    if (details && details.length > 0) {
      for (const d of details) parTheme[d.themeId] = (parTheme[d.themeId] || 0) + (d.gain || 0);
    } else {
      parTheme[theme.id] = scores.reduce((a, b) => a + b, 0);
    }
    const lignes = [];
    for (const [themeId, gain] of Object.entries(parTheme)) {
      if (!gain) continue;
      const av = xpAvant[themeId] || 0;
      ajouterXP(themeId, gain);
      const ap = av + gain;
      lignes.push({ themeId, gain, nivAvant: niveauTheme(av), nivApres: niveauTheme(ap), pct: pctNiveau(ap) });
    }
    xpTheme = lignes;
    const globAvant = Object.values(xpAvant).reduce((a, b) => a + (b || 0), 0);
    const gainTotal = lignes.reduce((a, l) => a + l.gain, 0);
    xpGlobal = { avant: globAvant, apres: globAvant + gainTotal, gain: gainTotal };
  }

  // --- Position au leaderboard du mode (top 10 affiché) ---
  let rang = null;
  if (!estInvite) {
    const lignesLB = [];
    for (const p of chargerParties()) {
      if (p.mode !== mode) continue;
      if (mode === 'solo' && p.niveau !== niveau) continue; // survie : tous niveaux mélangés
      for (const j of p.joueurs || []) lignesLB.push(j.score);
    }
    lignesLB.sort((a, b) => b - a);
    if (valeur > 0) rang = lignesLB.filter((s) => s > valeur).length + 1;
  }

  // --- Série de jours du quizz du jour (logo éclair) ---
  const streakJour = mode === 'quotidien' ? enregistrerStreakJour().compte : 0;

  return {
    record,
    recordAvant: avant,
    nouveauRecord: estRecord,
    xpTheme,
    xpGlobal,
    rang,
    streakJour,
  };
}
