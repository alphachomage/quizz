// useAdminAccess.ts — gate de la vue admin. Le flag ?admin=1 SEUL ne suffit plus
// (n'importe qui avec le lien y avait accès) : il faut une session compte (pas invité)
// dont le compte a admin = 1 en table D1 `comptes`, vérifié côté serveur via
// GET /api/admin/check (le flag vit en base, aucun secret dans wrangler.toml ni le bundle).
// En mode stockage 'local' (?stockage=local, hors-ligne), aucune vérification serveur
// n'est possible -> la vue admin est indisponible.
import { useEffect, useState } from 'react';
import { STORAGE_MODE } from '@lib/storage.js';
import { apiAdminCheck } from '@lib/api.js';
import type { SessionStockee } from './contexts/SessionContext.js';

/** État d'accès à la vue admin. */
export interface AdminAccess {
  isAdmin: boolean;
  /** true tant que la vérification serveur est en cours (écran de chargement). */
  enCours: boolean;
}

export function useAdminAccess(flagAdmin: boolean, session: SessionStockee | null): AdminAccess {
  const [autorise, setAutorise] = useState(false);
  const [enCours, setEnCours] = useState(flagAdmin);
  useEffect(() => {
    if (!flagAdmin) {
      setAutorise(false);
      setEnCours(false);
      return;
    }
    // Invité ou mode hors-ligne : pas d'admin (vérification serveur impossible).
    if (!session || session.guest || STORAGE_MODE !== 'd1') {
      setAutorise(false);
      setEnCours(false);
      return;
    }
    let actif = true;
    setEnCours(true);
    apiAdminCheck() // le pseudo vient du token Bearer, pas d'un paramètre
      .then((r) => {
        if (actif) setAutorise(r.admin === true);
      })
      .catch(() => {
        if (actif) setAutorise(false);
      })
      .finally(() => {
        if (actif) setEnCours(false);
      });
    return () => {
      actif = false;
    };
  }, [flagAdmin, session]);
  return {
    isAdmin: flagAdmin && autorise,
    enCours: flagAdmin && enCours,
  };
}
