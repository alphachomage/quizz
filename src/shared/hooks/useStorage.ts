// shared/hooks/useStorage.ts — hook réactif sur une clé du stockage.
// Lit via lib/storage.js (lire) et se met à jour à chaque écriture (notify)
// ou à chaque événement 'storage' (autre onglet du même navigateur).
import { useCallback, useSyncExternalStore } from 'react';
import { read, subscribe } from '@lib/storage.js';

// Hook réactif générique sur une clé du stockage : la valeur lue est `T`
// (ou la chaîne brute de l'ancien format, ou `defaultValue`).
export function useStorage<T = unknown>(key: string, defaultValue: T | null = null): T | string | null {
  const readCurrent = useCallback(() => read<T>(key, defaultValue), [key, defaultValue]);
  return useSyncExternalStore(
    useCallback((onChange: () => void) => {
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
