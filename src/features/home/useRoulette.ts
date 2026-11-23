// useRoulette.ts — tirage d'un thème au hasard façon roulette : une bande d'icônes défile
// puis ralentit jusqu'au thème tiré. Sans animation (réglage ou « mouvement réduit »),
// le résultat s'affiche tout de suite.
import { useCallback, useEffect, useRef, useState } from 'react';

/** Nombre de répétitions de la liste dans la bande (assez pour 4 tours complets). */
export const ROULETTE_LAPS = 7;
/** Durée du lancer en millisecondes. */
export const ROULETTE_MS = 2600;

export interface RouletteState {
  /** Index (dans la bande) de la case centrée sous le repère. */
  pos: number;
  /** true pendant le lancer : la bande glisse avec une transition CSS. */
  spinning: boolean;
  /** Index (0..n-1) du thème tiré, null avant le premier résultat. */
  result: number | null;
  spin: () => void;
}

export function useRoulette(itemCount: number, animated: boolean): RouletteState {
  const [pos, setPos] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const posRef = useRef(0);

  const clear = (): void => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const spin = useCallback(() => {
    if (itemCount === 0) return;
    clear();
    // Jamais deux fois le même thème d'affilée (sauf s'il n'y en a qu'un)
    const prev = posRef.current % itemCount;
    let pick = Math.floor(Math.random() * itemCount);
    if (itemCount > 1 && pick === prev)
      pick = (pick + 1 + Math.floor(Math.random() * (itemCount - 1))) % itemCount;
    const target = itemCount * (ROULETTE_LAPS - 2) + pick;
    setResult(null);
    if (!animated) {
      posRef.current = target;
      setPos(target);
      setResult(pick);
      return;
    }
    // 1) retour instantané au début de la bande sur la même case, 2) lancer animé
    const start = prev;
    posRef.current = start;
    setSpinning(false);
    setPos(start);
    timers.current.push(
      setTimeout(() => {
        posRef.current = target;
        setSpinning(true);
        setPos(target);
      }, 40),
      setTimeout(() => {
        setSpinning(false);
        setResult(pick);
      }, 40 + ROULETTE_MS)
    );
  }, [itemCount, animated]);

  // Premier lancer à l'ouverture
  useEffect(() => {
    spin();
    return clear;
  }, [spin]);

  return { pos, spinning, result, spin };
}
