// features/resultat/statsPartie.js — calculs purs de l'écran de résultats.
import { niveauTheme, xpPourNiveau } from '@lib/xp.js';

// Pourcentage de progression dans le niveau actuel (courbe racine carrée).
export function pctNiveau(xp) {
  const niv = niveauTheme(xp);
  const base = xpPourNiveau(niv);
  const next = xpPourNiveau(niv + 1);
  return Math.min(100, Math.max(0, Math.round(((xp - base) / (next - base)) * 100)));
}

// Stats de la partie terminée : temps moyen par question + meilleure série (streak).
export function calculerStatsPartie(details) {
  const ds = (details || []).filter((d) => typeof d.secondes === 'number');
  const tempsMoyen = ds.length ? Math.round((ds.reduce((a, d) => a + d.secondes, 0) / ds.length) * 10) / 10 : null;
  const meilleureSerie = (details || []).reduce((m, d) => Math.max(m, d.streak || 0), 0);
  return { tempsMoyen, meilleureSerie };
}
