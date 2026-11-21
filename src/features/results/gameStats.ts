// features/resultat/statsPartie.ts — calculs purs de l'écran de résultats.
import { themeLevel, xpForLevel } from '@lib/xp.js';
import type { GameDetail } from '@lib/types.js';

// Détail d'une partie tel qu'enregistré : le schéma de base (GameDetail) est enrichi
// du temps de réponse et de la série en cours, posés pendant la partie.
export interface ResultDetail extends GameDetail {
  secondes?: number;
  streak?: number;
}

/** Stats affichées de la partie terminée. */
export interface GameStats {
  avgTime: number | null;
  meilleureSerie: number;
}

// Pourcentage de progression dans le niveau current (courbe racine carrée).
function levelPercent(xp: number): number {
  const niv = themeLevel(xp);
  const base = xpForLevel(niv);
  const next = xpForLevel(niv + 1);
  return Math.min(100, Math.max(0, Math.round(((xp - base) / (next - base)) * 100)));
}

// Stats de la partie terminée : temps moyen par question + meilleure série (streak).
export { levelPercent };
export function computeGameStats(details?: ResultDetail[]): GameStats {
  const ds = (details || []).filter(
    (d): d is ResultDetail & { secondes: number } => typeof d.secondes === 'number'
  );
  const avgTime = ds.length
    ? Math.round((ds.reduce((a, d) => a + d.secondes, 0) / ds.length) * 10) / 10
    : null;
  const meilleureSerie = (details || []).reduce((m, d) => Math.max(m, d.streak || 0), 0);
  return {
    avgTime,
    meilleureSerie,
  };
}
