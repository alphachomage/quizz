// features/accueil/useAccueil.js — logique de l'écran d'accueil (état, dérivés,
// action "lancer"), extraite de l'ancien composant monolithique.
// Le stockage est lu via useStockage (réactif) : plus de localStorage dans le render.
import { useMemo, useState } from 'react';

import { avatarActuel } from '@lib/comptes.js';
import { prochainBadge } from '@lib/badges.js';
import { titreAffiche } from '@lib/titres.js';
import {
  cleRecord,
  dateAujourdhui,
  niveauTheme,
  streakJourActuelle,
  xpPourNiveau,
} from '@lib/index.js';
import { CLES } from '@lib/storage.js';
import { lireParamUrl } from '@app/urlFlags.js';
import { useStockage } from '@shared/hooks/useStockage.js';

// Thème fictif utilisé pour les modes « tous thèmes mélangés » (survie, quizz du jour).
export const THEME_TOUS = { id: 'tous', nom: 'Tous les thèmes', icone: 'globe', couleur: '#8b5cf6' };

export function useAccueil({ themes, pseudo, onDemarrer }) {
  const [mode, setMode] = useState('solo');
  const [niveau, setNiveau] = useState('moyen');
  const [themeId, setThemeId] = useState(null);
  const [showParametres, setShowParametres] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [modalNiveau, setModalNiveau] = useState(false); // modale difficulté (solo, au clic sur un thème)
  const [nom1, setNom1] = useState(pseudo || '');
  const [nom2, setNom2] = useState('');
  const [avatar, setAvatar] = useState(() => avatarActuel());
  const [profilOuvert, setProfilOuvert] = useState(false);

  // Stockage lu de façon réactive (une seule clé = un useStockage).
  const records = useStockage(CLES.records, {}) || {};
  const xp = useStockage(CLES.xp, {}) || {};
  const parties = useStockage(CLES.parties, []) || [];

  // Pseudos déjà rencontrés (suggestions dans le duel, façon « amis » en local)
  const joueursConnus = useMemo(
    () => [...new Set(parties.flatMap((p) => (p.joueurs || []).map((j) => j.nom)))],
    [parties]
  );
  const theme = themes.find((t) => t.id === themeId);
  const joueurs = [nom1.trim() || 'Joueur 1', nom2.trim() || 'Joueur 2'];
  // Ordre des thèmes fixe (alphabétique par libellé) : jamais mélangé, même après un F5.
  const themesAffiches = useMemo(
    () => [...themes].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    [themes]
  );

  function lancer() {
    if (mode === 'solo' || mode === 'duel') {
      if (!theme) return;
      onDemarrer({
        mode,
        niveau: mode === 'solo' ? niveau : null,
        theme,
        joueurs: mode === 'solo' ? [pseudo || 'Toi'] : joueurs,
        tousThemes: themes,
      });
    } else if (mode === 'survie') {
      // survie : plus de niveau choisi, toutes les questions (tous niveaux) mélangées
      onDemarrer({ mode: 'survie', niveau: 'mix', theme: THEME_TOUS, joueurs: [pseudo || 'Toi'], tousThemes: themes });
    } else {
      // quizz du jour : le niveau sert de « date du jour » pour le record et le tirage identique
      onDemarrer({ mode: 'quotidien', niveau: dateAujourdhui(), theme: THEME_TOUS, joueurs: [pseudo || 'Toi'], tousThemes: themes });
    }
  }

  // Record du quizz du jour (clé = date du jour) pour afficher « déjà joué » sur la carte.
  const recordJour = records[cleRecord('quotidien', dateAujourdhui(), 'tous')] || 0;
  // Prochain badge à portée (effet « reviens-y » sur l'accueil), recalculé si les données changent.
  const badgeSuivant = useMemo(() => prochainBadge(), [parties, records, xp]);
  // Série de jours du quizz du jour (logo éclair).
  const streakJour = streakJourActuelle().compte;
  // Titre choisi dans l'onglet Badges & titres, affiché sous la barre d'XP.
  const titreProfil = titreAffiche();
  // Une seule tentative par jour pour le quizz du jour.
  // Exception de test (une seule fois) : ?jour=libre pour débloquer le quizz du jour.
  const debloqueTest = lireParamUrl('jour') === 'libre';
  const dejaJoueAujourdhui = !debloqueTest && parties.some((p) => p.mode === 'quotidien' && p.niveau === dateAujourdhui());

  // XP globale du joueur = somme de l'XP de tous les thèmes.
  const xpTotal = Object.values(xp).reduce((a, b) => a + b, 0);
  const nivGlobal = niveauTheme(xpTotal);
  const xpNext = xpPourNiveau(nivGlobal + 1);
  const pctXpGlobal = Math.min(100, Math.round(((xpTotal - xpPourNiveau(nivGlobal)) / (xpNext - xpPourNiveau(nivGlobal))) * 100));

  return {
    mode, setMode, niveau, setNiveau, themeId, setThemeId,
    showParametres, setShowParametres, showSuggestions, setShowSuggestions,
    modalNiveau, setModalNiveau, nom1, setNom1, nom2, setNom2,
    avatar, setAvatar, profilOuvert, setProfilOuvert,
    records, xp, joueursConnus, theme, joueurs, themesAffiches, lancer,
    recordJour, badgeSuivant, streakJour, titreProfil, dejaJoueAujourdhui,
    xpTotal, nivGlobal, xpNext, pctXpGlobal,
  };
}
