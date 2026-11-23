// features/home/useHome.ts — logique de l'écran d'accueil (état, dérivés, actions).
// action "lancer"), extraite de l'ancien composant monolithique.
// Le stockage est lu via useStockage (réactif) : plus de localStorage dans le render.
import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { currentAvatar } from '@lib/accounts.js';
import { badgeStats, nextBadge as computeNextBadge } from '@lib/badges.js';
import { displayedTitle } from '@lib/titles.js';
import { recordKey } from '@lib/records.js';
import type { RecordsMap } from '@lib/records.js';
import { todayDate } from '@lib/dates.js';
import { themeLevel, xpForLevel } from '@lib/xp.js';
import type { XpMap } from '@lib/xp.js';
import { currentDailyStreak } from '@lib/streak.js';
import { STORAGE_KEYS } from '@lib/storage.js';
import { readUrlParam } from '@app/urlFlags.js';
import { useStorage } from '@shared/hooks/useStorage.js';
import type { GameMode, LevelId, Theme } from '@lib/types.js';
import type { StoredGame } from '@lib/game-history.js';

// Thème fictif utilisé pour les modes « tous thèmes mélangés » (survie, quizz du jour).
// Sans `questions` : le pool vient de `allThemes`, jamais de ce pseudo-thème.
const ALL_THEMES = {
  id: 'tous',
  nom: 'Tous les thèmes',
  icone: 'globe',
  couleur: '#8b5cf6',
} as Theme;

/** Config de lancement d'une partie envoyée par l'accueil (équivalent local de
    NavConfig côté app/ : R4 interdit d'importer app/useNavigation depuis une feature). */
export interface StartConfig {
  mode: GameMode;
  niveau: LevelId | string | null;
  theme: Theme;
  players?: string[];
  /** Survie / quizz du jour : tous les thèmes mélangés. */
  allThemes?: Theme[];
}

/** Paramètres du hook useHome. */
export interface UseHomeParams {
  themes: Theme[] | null;
  pseudo: string;
  onStart: (cfg: StartConfig) => void;
}

/** Contrat du hook consommé par Home et les composants de home/components. */
export interface HomeState {
  mode: GameMode;
  setMode: Dispatch<SetStateAction<GameMode>>;
  niveau: LevelId;
  setLevel: Dispatch<SetStateAction<LevelId>>;
  themeId: string | null;
  setThemeId: Dispatch<SetStateAction<string | null>>;
  showSettings: boolean;
  setShowSettings: Dispatch<SetStateAction<boolean>>;
  showSuggestions: boolean;
  setShowSuggestionsN: Dispatch<SetStateAction<boolean>>;
  levelModal: boolean;
  showRandom: boolean;
  setShowRandom: Dispatch<SetStateAction<boolean>>;
  setLevelModal: Dispatch<SetStateAction<boolean>>;
  nom1: string;
  setNom1: Dispatch<SetStateAction<string>>;
  nom2: string;
  setNom2: Dispatch<SetStateAction<string>>;
  avatar: string | null;
  setAvatar: Dispatch<SetStateAction<string | null>>;
  profilOuvert: boolean;
  setProfilOuvert: Dispatch<SetStateAction<boolean>>;
  records: RecordsMap;
  xp: XpMap;
  knownPlayers: string[];
  theme: Theme | undefined;
  players: string[];
  displayedThemes: Theme[];
  lancer: () => void;
  /** Solo : lance directement une partie sur ce thème (roulette « Aléatoire »). */
  lancerTheme: (t: Theme) => void;
  dailyRecord: number;
  nextBadge: ReturnType<typeof computeNextBadge>;
  dailyStreak: number;
  profileTitle: string | null;
  alreadyPlayedToday: boolean;
  totalXp: number;
  nivGlobal: number;
  xpNext: number;
  pctXpGlobal: number;
}

export function useHome({ themes, pseudo, onStart }: UseHomeParams): HomeState {
  const [mode, setMode] = useState<GameMode>('solo');
  const [niveau, setLevel] = useState<LevelId>('moyen');
  const [themeId, setThemeId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSuggestions, setShowSuggestionsN] = useState(false);
  const [showRandom, setShowRandom] = useState(false); // roulette « Aléatoire » (solo)
  const [levelModal, setLevelModal] = useState(false); // modale difficulté (solo, au clic sur un thème)
  const [nom1, setNom1] = useState(pseudo || '');
  const [nom2, setNom2] = useState('');
  const [avatar, setAvatar] = useState<string | null>(() => currentAvatar());
  const [profilOuvert, setProfilOuvert] = useState(false);

  // Stockage lu de façon réactive (une seule clé = un useStockage).
  // Le `as` reflète le cast implicite de l'ancien JS : une valeur string (vieux
  // format) reste un string à l'exécution, indexé comme un objet (undefined).
  const recordsRaw = useStorage<RecordsMap>(STORAGE_KEYS.records, {});
  const xpRaw = useStorage<XpMap>(STORAGE_KEYS.xp, {});
  const gamesRaw = useStorage<StoredGame[]>(STORAGE_KEYS.games, []);
  const records = useMemo(() => (recordsRaw || {}) as RecordsMap, [recordsRaw]);
  const xp = useMemo(() => (xpRaw || {}) as XpMap, [xpRaw]);
  const games = useMemo(() => (gamesRaw || []) as StoredGame[], [gamesRaw]);

  // Pseudos déjà rencontrés (suggestions dans le duel, façon « amis » en local)
  const knownPlayers = useMemo(
    () => [...new Set(games.flatMap((p) => (p.players || []).map((j) => j.nom)))],
    [games]
  );
  const theme = themes?.find((t) => t.id === themeId);
  const players = [nom1.trim() || 'Joueur 1', nom2.trim() || 'Joueur 2'];
  // Ordre des thèmes fixe (alphabétique par libellé) : jamais mélangé, même après un F5.
  const displayedThemes = useMemo(
    // `nom` est toujours renseigné dans le catalogue ; le cast garde le comportement
    // exact de l'ancien JS (localeCompare sur nom, sans fallback).
    () =>
      [...(themes ?? [])].sort((a, b) => (a.nom as string).localeCompare(b.nom as string, 'fr')),
    [themes]
  );
  function lancer(): void {
    if (mode === 'solo' || mode === 'duel') {
      if (!theme) return;
      onStart({
        mode,
        niveau: mode === 'solo' ? niveau : null,
        theme,
        players: mode === 'solo' ? [pseudo || 'Toi'] : players,
        allThemes: themes ?? undefined,
      });
    } else if (mode === 'survie') {
      // survie : plus de niveau choisi, toutes les questions (tous niveaux) mélangées
      onStart({
        mode: 'survie',
        niveau: 'mix',
        theme: ALL_THEMES,
        players: [pseudo || 'Toi'],
        allThemes: themes ?? undefined,
      });
    } else {
      // quizz du jour : le niveau sert de « date du jour » pour le record et le tirage identique
      onStart({
        mode: 'quotidien',
        niveau: todayDate(),
        theme: ALL_THEMES,
        players: [pseudo || 'Toi'],
        allThemes: themes ?? undefined,
      });
    }
  }

  // Record du quizz du jour (clé = date du jour) pour afficher « déjà joué » sur la carte.
  function lancerTheme(t: Theme): void {
    setThemeId(t.id);
    onStart({
      mode: 'solo',
      niveau,
      theme: t,
      players: [pseudo || 'Toi'],
      allThemes: themes ?? undefined,
    });
  }

  const dailyRecord = records[recordKey('quotidien', todayDate(), 'tous')] || 0;
  // Prochain badge à portée (effet « reviens-y » sur l'accueil), recalculé si les données changent.
  const nextBadge = useMemo(
    () =>
      computeNextBadge(
        badgeStats({
          games,
          records,
          xp,
        })
      ),
    [games, records, xp]
  );
  // Série de jours du quizz du jour (logo éclair).
  const dailyStreak = currentDailyStreak().account;
  // Titre choisi dans l'onglet Badges & titres, affiché sous la barre d'XP.
  const profileTitle = displayedTitle();
  // Une seule tentative par jour pour le quizz du jour.
  // Exception de test (une seule fois) : ?jour=libre pour débloquer le quizz du jour.
  const unlockTest = readUrlParam('jour') === 'libre';
  const alreadyPlayedToday =
    !unlockTest && games.some((p) => p.mode === 'quotidien' && p.niveau === todayDate());

  // XP globale du joueur = somme de l'XP de tous les thèmes.
  const totalXp = Object.values(xp).reduce((a, b) => a + b, 0);
  const nivGlobal = themeLevel(totalXp);
  const xpNext = xpForLevel(nivGlobal + 1);
  const pctXpGlobal = Math.min(
    100,
    Math.round(((totalXp - xpForLevel(nivGlobal)) / (xpNext - xpForLevel(nivGlobal))) * 100)
  );
  return {
    mode,
    setMode,
    niveau,
    setLevel: setLevel,
    themeId,
    setThemeId,
    showSettings: showSettings,
    setShowSettings: setShowSettings,
    showSuggestions,
    setShowSuggestionsN: setShowSuggestionsN,
    levelModal: levelModal,
    setLevelModal: setLevelModal,
    nom1,
    setNom1,
    nom2,
    setNom2,
    avatar,
    setAvatar,
    profilOuvert,
    setProfilOuvert,
    records,
    xp,
    knownPlayers,
    theme,
    players,
    displayedThemes,
    lancer,
    lancerTheme,
    showRandom,
    setShowRandom,
    dailyRecord,
    nextBadge,
    dailyStreak,
    profileTitle,
    alreadyPlayedToday: alreadyPlayedToday,
    totalXp,
    nivGlobal,
    xpNext,
    pctXpGlobal,
  };
}
