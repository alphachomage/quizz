// useNavigation.ts — routing interne par état encapsulé (PAS de react-router d'URL :
// 100 % compatible WPA + Capacitor). Remplace le `useState('ecran')` du god App.
// Les changements d'écran passent dans startTransition : avec les écrans en
// React.lazy (routes.ts), l'écran PRÉCÉDENT reste visible pendant le chargement
// du chunk suivant, puis le nouvel écran remplace d'un coup (pas de flash).
import { useCallback, useState, startTransition } from 'react';
import type { GameMode, GameResult, LevelId, Theme } from '@lib/types.js';
import type { persistResult } from '@features/results/persist.js';

/** Écrans gérés par le routing interne. */
export type ScreenId =
  'accueil' | 'partie' | 'resultat' | 'formulaire' | 'classement' | 'stats' | 'badges';

/** Config de lancement d'une partie envoyée par l'accueil (useHome) : proche de
    GameConfig (lib/types.ts), mais `niveau` vaut aussi 'mix' ou une date pour la
    rogue / le quizz du jour, et l'accueil ajoute la liste des `players`. */
export interface NavConfig {
  mode: GameMode;
  niveau: LevelId | string | null;
  theme: Theme;
  players?: string[];
  /** Rogue / quizz du jour : tous les thèmes mélangés. */
  allThemes?: Theme[];
}

/** Valeurs persistées par persistResult (features/results) à la fin d'une partie. */
export type NavPersistance = ReturnType<typeof persistResult>;

/** Résultat de partie stocké par le routing : GameResult + sa persistance. */
export type NavResult = GameResult & { persistance: NavPersistance };

/** Contrat du hook de routing consommé par App et Screens. */
export interface Navigation {
  screen: ScreenId;
  config: NavConfig | null;
  result: NavResult | null;
  navigateTo: (ecran: ScreenId) => void;
  start: (cfg: NavConfig) => void;
  finish: (res: NavResult) => void;
}

export function useNavigation(): Navigation {
  const [screen, setView] = useState<ScreenId>('accueil');
  const [config, setConfig] = useState<NavConfig | null>(null); // config de la partie en cours
  const [result, setResult] = useState<NavResult | null>(null); // récapitulatif de la dernière partie

  const navigateTo = useCallback((e: ScreenId) => startTransition(() => setView(e)), []);
  const start = useCallback((cfg: NavConfig) => {
    startTransition(() => {
      setConfig(cfg);
      setView('partie');
    });
  }, []);
  const finish = useCallback((res: NavResult) => {
    startTransition(() => {
      setResult(res);
      setView('resultat');
    });
  }, []);
  return {
    screen,
    config,
    result,
    navigateTo,
    start,
    finish,
  };
}
