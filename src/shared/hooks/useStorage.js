// shared/hooks/useStockage.js — hook réactif sur une clé du stockage.
// Lit via lib/storage.js (lire) et se met à jour à chaque écriture (notify)
// ou à chaque événement 'storage' (autre onglet du même navigateur).
import { useCallback, useSyncExternalStore } from 'react';
import { read, subscribe } from '@lib/storage.js';
export function useStorage(key, defaultValue = null) {
  const readCurrent = useCallback(() => read(key, defaultValue), [key, defaultValue]);
  return useSyncExternalStore(
    useCallback((onChange) => {
      const desabo = subscribe(onChange);
      window.addEventListener('storage', onChange);
      return () => {
        desabo();
        window.removeEventListener('storage', onChange);
      };
    }, []),
    readCurrent
  );
}
