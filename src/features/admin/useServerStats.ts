// useServerStats.ts — hook du tableau de bord admin pour les métriques SERVEUR (V2) :
// /api/health (route ouverte : répond même V2 off) et /api/stats (rooms KV, rapports
// CSP, hits 429 — 503 si V2 off). Appels centralisés dans lib/api.js ; toute erreur
// est dégradée gracieusement (statut 'v2-inactive' ou 'indisponible'), jamais levée.
import { useEffect, useState } from 'react';
import { apiHealth, apiStats } from '@lib/api.js';
import type { HealthResponse, StatsResponse } from '@lib/api.js';

// État du serveur V2, discriminé par `statut` : ServerCard branche dessus, et dans les
// états 'v2-inactive' / 'ok' le health est toujours renseigné (et stats en 'ok').
export type ServerEtat =
  | { statut: 'chargement'; health: null; stats: null }
  | { statut: 'indisponible'; health: null; stats: null }
  | { statut: 'v2-inactive'; health: HealthResponse; stats: StatsResponse | null }
  | { statut: 'ok'; health: HealthResponse; stats: StatsResponse };

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
      // 503 « V2 non active » -> on attrape : la V2 est simplement inactive, pas en panne.
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
      const statsValides = stats && stats.ok === true ? stats : null;
      const v2Active = health.v2 === true && !!statsValides;
      if (v2Active && statsValides) {
        setEtat({ statut: 'ok', health, stats: statsValides });
      } else {
        setEtat({ statut: 'v2-inactive', health, stats: statsValides });
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  return etat;
}
