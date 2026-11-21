// useCelebration.js — animation de déblocage (badge/titre nouveau) affichée sur
// l'accueil au retour d'une partie : snapshot des déblocages au LANCEMENT de la
// partie, diff au moment où elle se termine.
import { useCallback, useRef, useState } from 'react';

import { computeBadges } from '@lib/badges.js';
import { computeTitles } from '@lib/titles.js';
import { jouerSon, vibrate } from '@lib/sounds.js';

export function useUnlock({ estInvite, prefs }) {
  const snapshotRef = useRef(null);
  const [celebration, setCelebration] = useState(null); // { badges: [...], titres: [...] }

  // Appelé au démarrage d'une partie : on photographie les déblocages actuels.
  const prendreSnapshot = useCallback(() => {
    snapshotRef.current = {
      badges: new Set(computeBadges().filter((b) => b.debloque).map((b) => b.id)),
      titles: new Set(computeTitles().filter((t) => t.debloque).map((t) => t.id)),
    };
  }, []);

  // Appelé à la fin d'une partie : calcule les nouveautés et déclenche la célébration.
  const revelerNouveautes = useCallback(() => {
    const snap = snapshotRef.current || { badges: new Set(), titles: new Set() };
    const nouveauxBadges = computeBadges().filter((b) => b.debloque && !snap.badges.has(b.id));
    const nouveauxTitres = computeTitles().filter((t) => t.debloque && !snap.titles.has(t.id));
    if (!estInvite && (nouveauxBadges.length || nouveauxTitres.length)) {
      setCelebration({ badges: nouveauxBadges, titles: nouveauxTitres });
      jouerSon('tonnerre', prefs); // grondement d'éclair doux au déblocage
      vibrate([70, 50, 130], prefs);
      return true;
    }
    return false;
  }, [estInvite, prefs]);

  const fermerCelebration = useCallback(() => setCelebration(null), []);

  return { celebration, prendreSnapshot, revelerNouveautes, fermerCelebration };
}
