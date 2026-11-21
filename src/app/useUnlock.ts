// useUnlock.ts — animation de déblocage (badge/titre nouveau) affichée sur
// l'accueil au retour d'une partie : snapshot des déblocages au LANCEMENT de la
// partie, diff au moment où elle se termine.
import { useCallback, useRef, useState } from 'react';
import { computeBadges } from '@lib/badges.js';
import type { ComputedBadge } from '@lib/badges.js';
import { computeTitles } from '@lib/titles.js';
import type { ComputedTitle } from '@lib/titles.js';
import { playSound, vibrate } from '@lib/sounds.js';
import type { Prefs } from '@lib/types.js';

/** Déblocages photographiés au lancement d'une partie. */
interface UnlockSnapshot {
  badges: Set<string>;
  titles: Set<string>;
}

/** Nouveautés à célébrer (transmises à UnlockModal). */
export interface Celebration {
  badges: ComputedBadge[];
  titles: ComputedTitle[];
}

/** Paramètres du hook : mode invité (pas de célébration) + préférences (sons/vibrations). */
export interface UnlockParams {
  isGuest: boolean;
  prefs: Prefs;
}

/** Contrat du hook consommé par App et Screens. */
export interface UnlockState {
  celebration: Celebration | null;
  prendreSnapshot: () => void;
  revelerNouveautes: () => boolean;
  closeCelebration: () => void;
}

export function useUnlock({ isGuest, prefs }: UnlockParams): UnlockState {
  const snapshotRef = useRef<UnlockSnapshot | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);

  // Appelé au démarrage d'une partie : on photographie les déblocages actuels.
  const prendreSnapshot = useCallback(() => {
    snapshotRef.current = {
      badges: new Set(
        computeBadges()
          .filter((b) => b.debloque)
          .map((b) => b.id)
      ),
      titles: new Set(
        computeTitles()
          .filter((t) => t.debloque)
          .map((t) => t.id)
      ),
    };
  }, []);

  // Appelé à la fin d'une partie : calcule les nouveautés et déclenche la célébration.
  const revelerNouveautes = useCallback(() => {
    const snap = snapshotRef.current || {
      badges: new Set<string>(),
      titles: new Set<string>(),
    };
    const nouveauxBadges = computeBadges().filter((b) => b.debloque && !snap.badges.has(b.id));
    const nouveauxTitres = computeTitles().filter((t) => t.debloque && !snap.titles.has(t.id));
    if (!isGuest && (nouveauxBadges.length || nouveauxTitres.length)) {
      setCelebration({
        badges: nouveauxBadges,
        titles: nouveauxTitres,
      });
      playSound('tonnerre', prefs); // grondement d'éclair doux au déblocage
      vibrate([70, 50, 130], prefs);
      return true;
    }
    return false;
  }, [isGuest, prefs]);
  const closeCelebration = useCallback(() => setCelebration(null), []);
  return {
    celebration,
    prendreSnapshot,
    revelerNouveautes,
    closeCelebration,
  };
}
