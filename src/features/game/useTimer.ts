// features/game/useTimer.ts — minuteur de la question courante.
// Perf : 1 setState par SECONDE (et non 10/s) ; la barre est lissée en CSS
// (transition linéaire sur la largeur). Appelle `onExpire` à 0.
// Le parent remet le temps à zéro (setTime) à chaque nouvelle question.
import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { SECONDS_PER_QUESTION } from '@lib/scoring.js';

/** Contrat du minuteur : temps restant (entier, secondes) + remise à zéro manuelle. */
export interface Timer {
  time: number;
  setTime: Dispatch<SetStateAction<number>>;
}

export function useTimer(active: boolean, duration: number = SECONDS_PER_QUESTION, onExpire?: () => void): Timer {
  const [time, setTime] = useState(duration); // entier : secondes restantes
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  // Le minuteur tourne uniquement pendant la phase 'question'.
  useEffect(() => {
    if (!active) return undefined;
    const intervalle = setInterval(() => setTime((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(intervalle);
  }, [active, duration]);

  // Temps écoulé = réponse ratée.
  useEffect(() => {
    if (active && time <= 0) onExpireRef.current?.();
  }, [time, active]);
  return {
    time,
    setTime: setTime,
  };
}
