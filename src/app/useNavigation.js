// useNavigation.js — routing interne par état encapsulé (PAS de react-router d'URL :
// 100 % compatible WPA + Capacitor). Remplace le `useState('ecran')` du god App.
// Les changements d'écran passent dans startTransition : avec les écrans en
// React.lazy (routes.js), l'écran PRÉCÉDENT reste visible pendant le chargement
// du chunk suivant, puis le nouvel écran remplace d'un coup (pas de flash).
import { useCallback, useState, startTransition } from 'react';

export function useNavigation() {
  const [screen, setEcran] = useState('accueil'); // accueil | partie | resultat | formulaire | classement | stats | badges
  const [config, setConfig] = useState(null); // { mode, niveau, theme, joueurs, tousThemes? }
  const [result, setResultat] = useState(null); // récapitulatif de la dernière partie

  const allerVers = useCallback((e) => startTransition(() => setEcran(e)), []);

  const start = useCallback((cfg) => {
    startTransition(() => {
      setConfig(cfg);
      setEcran('partie');
    });
  }, []);

  const terminer = useCallback((res) => {
    startTransition(() => {
      setResultat(res);
      setEcran('resultat');
    });
  }, []);

  return { screen, config, result, allerVers, start, terminer };
}
