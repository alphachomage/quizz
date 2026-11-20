// useNavigation.js — routing interne par état encapsulé (PAS de react-router d'URL :
// 100 % compatible WPA + Capacitor). Remplace le `useState('ecran')` du god App.
import { useCallback, useState } from 'react';

export function useNavigation() {
  const [ecran, setEcran] = useState('accueil'); // accueil | partie | resultat | formulaire | classement | stats | badges
  const [config, setConfig] = useState(null); // { mode, niveau, theme, joueurs, tousThemes? }
  const [resultat, setResultat] = useState(null); // récapitulatif de la dernière partie

  const allerVers = useCallback((e) => setEcran(e), []);
  const demarrer = useCallback((cfg) => {
    setConfig(cfg);
    setEcran('partie');
  }, []);
  const terminer = useCallback((res) => {
    setResultat(res);
    setEcran('resultat');
  }, []);

  return { ecran, config, resultat, allerVers, demarrer, terminer };
}
