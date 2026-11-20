// useCelebration.js — animation de déblocage (badge/titre nouveau) affichée sur
// l'accueil au retour d'une partie : snapshot des déblocages au LANCEMENT de la
// partie, diff au moment où elle se termine.
import { useCallback, useRef, useState } from 'react';

import { calculerBadges } from '@lib/badges.js';
import { calculerTitres } from '@lib/titres.js';
import { jouerSon, vibrer } from '@lib/sons.js';

export function useCelebration({ estInvite, prefs }) {
  const snapshotRef = useRef(null);
  const [celebration, setCelebration] = useState(null); // { badges: [...], titres: [...] }

  // Appelé au démarrage d'une partie : on photographie les déblocages actuels.
  const prendreSnapshot = useCallback(() => {
    snapshotRef.current = {
      badges: new Set(calculerBadges().filter((b) => b.debloque).map((b) => b.id)),
      titres: new Set(calculerTitres().filter((t) => t.debloque).map((t) => t.id)),
    };
  }, []);

  // Appelé à la fin d'une partie : calcule les nouveautés et déclenche la célébration.
  const revelerNouveautes = useCallback(() => {
    const snap = snapshotRef.current || { badges: new Set(), titres: new Set() };
    const nouveauxBadges = calculerBadges().filter((b) => b.debloque && !snap.badges.has(b.id));
    const nouveauxTitres = calculerTitres().filter((t) => t.debloque && !snap.titres.has(t.id));
    if (!estInvite && (nouveauxBadges.length || nouveauxTitres.length)) {
      setCelebration({ badges: nouveauxBadges, titres: nouveauxTitres });
      jouerSon('tonnerre', prefs); // grondement d'éclair doux au déblocage
      vibrer([70, 50, 130], prefs);
      return true;
    }
    return false;
  }, [estInvite, prefs]);

  const fermerCelebration = useCallback(() => setCelebration(null), []);

  return { celebration, prendreSnapshot, revelerNouveautes, fermerCelebration };
}
