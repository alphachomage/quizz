// useServerStats.ts — hook du tableau de bord admin pour les métriques SERVEUR :
// /api/health (route de santé, toujours ouverte) et /api/stats (rooms KV, rapports
// CSP, hits 429). Appels centralisés dans lib/api.js ; toute erreur est dégradée
// gracieusement (statut 'indisponible'), jamais levée.
import { useEffect, useState } from 'react';
import { apiHealth, apiStats } from '@lib/api.js';
import type { HealthResponse, StatsResponse } from '@lib/api.js';

// État du serveur, discriminé par `statut` : ServerCard branche dessus.
export type ServerEtat =
  | { statut: 'chargement'; health: null; stats: null }
  | { statut: 'indisponible'; health: null; stats: null }
  | { statut: 'ok'; health: HealthResponse; stats: StatsResponse | null };

export function useServerStats(): ServerEtat {
  const [etat, setEtat] = useState<ServerEtat>({
    statut: 'chargement',
    health: null,
    stats: null,
  });
  useEffect(() => {
    let active = true;
    (async () => {
      const health = await apiHealth().catch(() => null);
      const stats = await apiStats().catch(() => null);
      if (!active) return;
      if (!health || health.ok !== true) {
        setEtat({
          statut: 'indisponible',
          health: null,
          stats: null,
        });
        return;
      }
      setEtat({
        statut: 'ok',
        health,
        stats: stats && stats.ok === true ? stats : null,
      });
    })();
    return () => {
      active = false;
    };
  }, []);
  return etat;
}
