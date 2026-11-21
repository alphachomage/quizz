// PrefsContext.ts — préférences d'affichage + accessibilité, consommées via usePrefs().
// Pose les classes de body (thème clair / daltonien / dys) à chaque changement.
import { createContext, createElement, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { loadPrefs, savePrefs } from '@lib/prefs.js';
import type { Prefs } from '@lib/types.js';

/** Contrat du context consommé via usePrefs(). */
export interface PrefsContextValue {
  prefs: Prefs;
  changerPrefs: (nouvelles: Prefs) => void;
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

interface PrefsProviderProps {
  children: ReactNode;
}

export function PrefsProvider({ children }: PrefsProviderProps) {
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());

  // Accessibilité : les classes de body pilotent le thème clair, le mode daltonien et le mode dys.
  useEffect(() => {
    const b = document.body;
    b.classList.toggle('theme-clair', prefs.themeClair === true);
    b.classList.toggle('daltonien', prefs.daltonien === true);
    b.classList.toggle('dys', prefs.dys === true);
    return () => {
      b.classList.remove('theme-clair', 'daltonien', 'dys');
    };
  }, [prefs]);
  const changerPrefs = (nouvelles: Prefs) => {
    savePrefs(nouvelles);
    setPrefs(nouvelles);
  };
  return createElement(
    PrefsContext.Provider,
    {
      value: {
        prefs,
        changerPrefs,
      },
    },
    children
  );
}
export function usePrefs(): PrefsContextValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs doit être utilisé sous <PrefsProvider>');
  return ctx;
}
