// shared/hooks/useStorage.ts — hook réactif sur une clé du stockage.
// Lit via lib/storage.js (lire) et se met à jour à chaque écriture (notify)
// ou à chaque événement 'storage' (autre onglet du même navigateur).
import { useCallback, useRef, useSyncExternalStore } from 'react';
import { read, subscribe } from '@lib/storage.js';

// Hook réactif générique sur une clé du stockage : la valeur lue est `T`
// (ou la chaîne brute de l'ancien format, ou `defaultValue`).
export function useStorage<T = unknown>(key: string, defaultValue: T | null = null): T | string | null {
  // defaultValue est gelé dans une ref : un littéral inline ({} ou []) passé à chaque
  // rendu créerait une référence neuve à chaque appel de getSnapshot, ce qui ferait
  // boucler useSyncExternalStore (erreur React #185 « Maximum update depth exceeded »).
  const defaultRef = useRef<T | null>(defaultValue);
  const getSnapshot = useCallback(() => read<T>(key, defaultRef.current), [key]);
  return useSyncExternalStore(
    useCallback((onChange: () => void) => {
      const desabo = subscribe(onChange);
      window.addEventListener('storage', onChange);
      return () => {
        desabo();
        window.removeEventListener('storage', onChange);
      };
    }, []),
    getSnapshot
  );
}
