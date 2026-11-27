// shared/hooks/useCountUp.ts — fait défiler un nombre de 0 jusqu'à `cible` (score final).
// Désactivé (valeur finale immédiate) si `actif` est faux : réglage « animations » coupé
// ou prefers-reduced-motion, décidé par l'appelant.
import { useEffect, useState } from 'react';

/** Durée du défilement, en millisecondes. */
const DUREE_MS = 900;

export function useCountUp(cible: number, actif: boolean): number {
  const [valeur, setValeur] = useState(actif ? 0 : cible);
  useEffect(() => {
    if (!actif || cible <= 0) {
      setValeur(cible);
      return;
    }
    let frame = 0;
    const debut = performance.now();
    const pas = (maintenant: number) => {
      const t = Math.min(1, (maintenant - debut) / DUREE_MS);
      // ease-out cubique : rapide au début, ralentit en arrivant sur le score
      setValeur(Math.round(cible * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(pas);
    };
    frame = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(frame);
  }, [cible, actif]);
  return valeur;
}
