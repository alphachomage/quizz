// features/game/useTimer.ts — minuteur de la question courante.
// Calé sur l'horloge réelle (Date.now + deadline), PAS sur un compteur de ticks :
// un setInterval(1000) dérive à chaque tick et n'est pas remis en phase quand on
// reset la question -> décalage croissant entre le temps affiché et le temps réel.
// Ici `time` = secondes restantes en DÉCIMAL, rafraîchi ~10 fois/s (100 ms) :
// la barre de temps est fluide et toujours synchronisée, même après un reset
// ou quand l'onglet était en arrière-plan (les intervalles y sont throttlés).
import { useCallback, useEffect, useRef, useState } from 'react';

import { SECONDS_PER_QUESTION } from '@lib/scoring.js';

/** Contrat du minuteur : secondes restantes (décimal) + redémarrage manuel. */
export interface Timer {
  time: number;
  reset: () => void;
}

export function useTimer(
  active: boolean,
  duration: number = SECONDS_PER_QUESTION,
  onExpire?: () => void
): Timer {
  const [time, setTime] = useState(duration); // secondes restantes, décimal
  const deadlineRef = useRef(0); // timestamp (ms) de fin de la question courante
  const expireFaitRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const reset = useCallback(() => {
    deadlineRef.current = Date.now() + duration * 1000;
    expireFaitRef.current = false;
    setTime(duration);
  }, [duration]);

  // Le minuteur tourne uniquement pendant la phase 'question'.
  useEffect(() => {
    if (!active) return undefined;
    deadlineRef.current = Date.now() + duration * 1000; // (re)démarre au mur
    expireFaitRef.current = false;
    const tick = () => {
      const restant = Math.max(0, (deadlineRef.current - Date.now()) / 1000);
      setTime(restant);
      if (restant <= 0 && !expireFaitRef.current) {
        expireFaitRef.current = true;
        onExpireRef.current?.();
      }
    };
    tick();
    const intervalle = setInterval(tick, 100); // 10 Hz : assez fluide, aligné sur Date.now()
    return () => clearInterval(intervalle);
  }, [active, duration]);

  return { time, reset };
}
