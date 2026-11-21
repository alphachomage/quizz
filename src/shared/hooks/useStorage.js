// shared/hooks/useStockage.js — hook réactif sur une clé du stockage.
// Lit via lib/storage.js (lire) et se met à jour à chaque écriture (notifier)
// ou à chaque événement 'storage' (autre onglet du même navigateur).
import { useCallback, useSyncExternalStore } from 'react';

import { read, sabonner } from '@lib/storage.js';

export function useStorage(key, defaut = null) {
  const readCurrent = useCallback(() => read(key, defaut), [key, defaut]);
  return useSyncExternalStore(
    useCallback(
      (onChange) => {
        const desabo = sabonner(onChange);
        window.addEventListener('storage', onChange);
        return () => {
          desabo();
          window.removeEventListener('storage', onChange);
        };
      },
      []
    ),
    readCurrent
  );
}
