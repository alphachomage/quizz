// useServerStats.js — hook du tableau de bord admin pour les métriques SERVEUR (V2) :
// /api/health (route ouverte : répond même V2 off) et /api/stats (rooms KV, rapports
// CSP, hits 429 — 503 si V2 off). Appels centralisés dans lib/api.js ; toute erreur
// est dégradée gracieusement (statut 'v2-inactive' ou 'indisponible'), jamais levée.
import { useEffect, useState } from 'react';

import { apiHealth, apiStats } from '@lib/api.js';

export function useServerStats() {
  const [etat, setEtat] = useState({ statut: 'chargement', health: null, stats: null });

  useEffect(() => {
    let actif = true;
    (async () => {
      const health = await apiHealth().catch(() => null);
      // 503 « V2 non active » -> on attrape : la V2 est simplement inactive, pas en panne.
      const stats = await apiStats().catch(() => null);
      if (!actif) return;
      if (!health || health.ok !== true) {
        setEtat({ statut: 'indisponible', health: null, stats: null });
        return;
      }
      const v2Active = health.v2 === true && !!(stats && stats.ok === true);
      setEtat({
        statut: v2Active ? 'ok' : 'v2-inactive',
        health,
        stats: stats && stats.ok === true ? stats : null,
      });
    })();
    return () => {
      actif = false;
    };
  }, []);

  return etat;
}
