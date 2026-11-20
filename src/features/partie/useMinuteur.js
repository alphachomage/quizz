// features/partie/useMinuteur.js — minuteur de la question courante.
// Perf : 1 setState par SECONDE (et non 10/s) ; la barre est lissée en CSS
// (transition linéaire sur la largeur). Appelle `onExpire` à 0.
// Le parent remet le temps à zéro (setTemps) à chaque nouvelle question.
import { useEffect, useRef, useState } from 'react';

import { TEMPS_PAR_QUESTION } from '@lib/scoring.js';

export function useMinuteur(actif, duree = TEMPS_PAR_QUESTION, onExpire) {
  const [temps, setTemps] = useState(duree); // entier : secondes restantes
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  // Le minuteur tourne uniquement pendant la phase 'question'.
  useEffect(() => {
    if (!actif) return undefined;
    const intervalle = setInterval(() => setTemps((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(intervalle);
  }, [actif, duree]);

  // Temps écoulé = réponse ratée.
  useEffect(() => {
    if (actif && temps <= 0) onExpireRef.current?.();
  }, [temps, actif]);

  return { temps, setTemps };
}
