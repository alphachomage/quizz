// features/accueil/useAccueil.js — logique de l'écran d'accueil (état, dérivés,
// action "lancer"), extraite de l'ancien composant monolithique.
// Le stockage est lu via useStockage (réactif) : plus de localStorage dans le render.
import { useMemo, useState } from 'react';

import { currentAvatar } from '@lib/accounts.js';
import { prochainBadge } from '@lib/badges.js';
import { displayedTitle } from '@lib/titles.js';
import {
  recordKey,
  todayDate,
  themeLevel,
  currentDailyStreak,
  xpForLevel,
} from '@lib/index.js';
import { STORAGE_KEYS } from '@lib/storage.js';
import { readUrlParam } from '@app/urlFlags.js';
import { useStorage } from '@shared/hooks/useStorage.js';

// Thème fictif utilisé pour les modes « tous thèmes mélangés » (survie, quizz du jour).
export const ALL_THEMES = { id: 'tous', nom: 'Tous les thèmes', icone: 'globe', couleur: '#8b5cf6' };

export function useHome({ themes, pseudo, onDemarrer }) {
  const [mode, setMode] = useState('solo');
  const [niveau, setNiveau] = useState('moyen');
  const [themeId, setThemeId] = useState(null);
  const [showParametres, setShowParametres] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [modalNiveau, setModalNiveau] = useState(false); // modale difficulté (solo, au clic sur un thème)
  const [nom1, setNom1] = useState(pseudo || '');
  const [nom2, setNom2] = useState('');
  const [avatar, setAvatar] = useState(() => currentAvatar());
  const [profilOuvert, setProfilOuvert] = useState(false);

  // Stockage lu de façon réactive (une seule clé = un useStockage).
  const records = useStorage(STORAGE_KEYS.records, {}) || {};
  const xp = useStorage(STORAGE_KEYS.xp, {}) || {};
  const games = useStorage(STORAGE_KEYS.games, []) || [];

  // Pseudos déjà rencontrés (suggestions dans le duel, façon « amis » en local)
  const knownPlayers = useMemo(
    () => [...new Set(games.flatMap((p) => (p.players || []).map((j) => j.nom)))],
    [games]
  );
  const theme = themes.find((t) => t.id === themeId);
  const players = [nom1.trim() || 'Joueur 1', nom2.trim() || 'Joueur 2'];
  // Ordre des thèmes fixe (alphabétique par libellé) : jamais mélangé, même après un F5.
  const displayedThemes = useMemo(
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
        players: mode === 'solo' ? [pseudo || 'Toi'] : players,
        tousThemes: themes,
      });
    } else if (mode === 'survie') {
      // survie : plus de niveau choisi, toutes les questions (tous niveaux) mélangées
      onDemarrer({ mode: 'survie', niveau: 'mix', theme: ALL_THEMES, players: [pseudo || 'Toi'], tousThemes: themes });
    } else {
      // quizz du jour : le niveau sert de « date du jour » pour le record et le tirage identique
      onDemarrer({ mode: 'quotidien', niveau: todayDate(), theme: ALL_THEMES, players: [pseudo || 'Toi'], tousThemes: themes });
    }
  }

  // Record du quizz du jour (clé = date du jour) pour afficher « déjà joué » sur la carte.
  const dailyRecord = records[recordKey('quotidien', todayDate(), 'tous')] || 0;
  // Prochain badge à portée (effet « reviens-y » sur l'accueil), recalculé si les données changent.
  const nextBadge = useMemo(() => prochainBadge(), [games, records, xp]);
  // Série de jours du quizz du jour (logo éclair).
  const dailyStreak = currentDailyStreak().account;
  // Titre choisi dans l'onglet Badges & titres, affiché sous la barre d'XP.
  const profileTitle = displayedTitle();
  // Une seule tentative par jour pour le quizz du jour.
  // Exception de test (une seule fois) : ?jour=libre pour débloquer le quizz du jour.
  const debloqueTest = readUrlParam('jour') === 'libre';
  const dejaJoueAujourdhui = !debloqueTest && games.some((p) => p.mode === 'quotidien' && p.niveau === todayDate());

  // XP globale du joueur = somme de l'XP de tous les thèmes.
  const totalXp = Object.values(xp).reduce((a, b) => a + b, 0);
  const nivGlobal = themeLevel(totalXp);
  const xpNext = xpForLevel(nivGlobal + 1);
  const pctXpGlobal = Math.min(100, Math.round(((totalXp - xpForLevel(nivGlobal)) / (xpNext - xpForLevel(nivGlobal))) * 100));

  return {
    mode, setMode, niveau, setNiveau, themeId, setThemeId,
    showParametres, setShowParametres, showSuggestions, setShowSuggestions,
    modalNiveau, setModalNiveau, nom1, setNom1, nom2, setNom2,
    avatar, setAvatar, profilOuvert, setProfilOuvert,
    records, xp, knownPlayers, theme, players, displayedThemes, lancer,
    dailyRecord, nextBadge, dailyStreak, profileTitle, dejaJoueAujourdhui,
    totalXp, nivGlobal, xpNext, pctXpGlobal,
  };
}
