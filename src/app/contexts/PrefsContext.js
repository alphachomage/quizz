// PrefsContext.js — préférences d'affichage + accessibilité, consommées via usePrefs().
// Pose les classes de body (thème clair / daltonien / dys) à chaque changement.
import { createContext, createElement, useContext, useEffect, useState } from 'react';
import { loadPrefs, savePrefs } from '@lib/prefs.js';
const PrefsContext = createContext(null);
export function PrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(() => loadPrefs());

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
  const changerPrefs = (nouvelles) => {
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
export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs doit être utilisé sous <PrefsProvider>');
  return ctx;
}
