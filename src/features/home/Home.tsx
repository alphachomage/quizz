// Accueil (Home.tsx) — écran d'accueil, coquille render-only :
// toute la logique (état, dérivés, action « lancer ») est dans useHome.ts.
// la mise en page est découpée dans ./components/*.tsx.
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import { setAvatar } from '@lib/accounts.js';
import Settings from '@shared/modals/Settings.jsx';
import Profile from '@shared/modals/Profile.jsx';
import Suggestions from '@shared/modals/Suggestions.jsx';
import type { Prefs, Theme } from '@lib/types.js';
import { prefersReducedMotion } from '@lib/nav.js';
import { useHome } from './useHome.js';
import type { StartConfig } from './useHome.js';
import UserBar from './components/UserBar.jsx';
import ModeTabs from './components/ModeTabs.jsx';
import BadgeBanner from './components/BadgeBanner.jsx';
import ThemePickerModal from './components/ThemePickerModal.jsx';
import ModeConfirmModal from './components/ModeConfirmModal.jsx';
import BadgeDetailModal from './components/BadgeDetailModal.jsx';

// Logo fourni par le client (fond transparent) ; variante lettres bleu nuit pour le mode clair
const LOGO = `${import.meta.env.BASE_URL}logo-vquizz.png`;
const LOGO_CLAIR = `${import.meta.env.BASE_URL}logo-vquizz-clair.png`;

/** Props de l'écran d'accueil, déléguées par app/Screens.tsx. */
export interface HomeProps {
  themes: Theme[] | null;
  pseudo: string;
  prefs: Prefs;
  isAdmin: boolean;
  isGuest: boolean;
  onLogout: () => void;
  onStart: (cfg: StartConfig) => void;
  onPropose: () => void;
  onLeaderboard: () => void;
  onStats: () => void;
  onBadges: () => void;
  onChangePrefs: (prefs: Prefs) => void;
  onTutorial: () => void;
}

export default function Home({
  themes,
  pseudo,
  prefs,
  isAdmin,
  isGuest,
  onLogout,
  onStart,
  onPropose,
  onLeaderboard,
  onStats,
  onBadges,
  onChangePrefs,
  onTutorial,
}: HomeProps): ReactElement {
  const a = useHome({
    themes,
    pseudo,
    onStart,
  });
  return (
    <div className="accueil">
      <UserBar
        a={a}
        pseudo={pseudo}
        isGuest={isGuest}
        onLogout={onLogout}
        onBadges={onBadges}
        onTutorial={onTutorial}
        onStats={onStats}
      />

      <header className="hero">
        <h1 className="logo">
          <img className="logo-img logo-sombre" src={LOGO} alt="VQuizz" width={260} height={198} />
          <img
            className="logo-img logo-clair"
            src={LOGO_CLAIR}
            alt="VQuizz"
            width={260}
            height={198}
          />
        </h1>
      </header>

      <ModeTabs a={a} />
      <BadgeBanner a={a} isGuest={isGuest} />

      <nav className="liens-accueil" aria-label="Autres actions">
        {!isGuest && (
          <button className="btn-secondaire" onClick={onLeaderboard}>
            <Icon nom="podium" taille={16} /> Classement
          </button>
        )}
        <button className="btn-secondaire" onClick={onPropose}>
          <Icon nom="plus" taille={16} /> Proposer une question
        </button>
        <button className="btn-secondaire" onClick={() => a.setShowSuggestionsN(true)}>
          <Icon nom="pencil" taille={16} /> Suggestion
        </button>
      </nav>

      {a.showSettings && (
        <Settings
          prefs={prefs}
          avatar={a.avatar}
          onChangerAvatar={(dataUrl) => {
            setAvatar(pseudo, dataUrl);
            a.setAvatar(dataUrl);
          }}
          onChanger={onChangePrefs}
          onClose={() => a.setShowSettings(false)}
        />
      )}
      {a.showSuggestions && (
        <Suggestions pseudo={pseudo} onClose={() => a.setShowSuggestionsN(false)} />
      )}

      {a.picker === 'solo' && (
        <ThemePickerModal
          a={a}
          isAdmin={isAdmin}
          isGuest={isGuest}
          animated={prefs.animations !== false && !prefersReducedMotion()}
        />
      )}
      {(a.picker === 'survie' || a.picker === 'quotidien') && (
        <ModeConfirmModal a={a} mode={a.picker} />
      )}

      {a.badgeDetail && !isGuest && <BadgeDetailModal a={a} onBadges={onBadges} />}

      {a.profilOuvert && (
        <Profile
          pseudo={pseudo}
          avatar={a.avatar}
          themes={themes ?? undefined}
          onClose={() => a.setProfilOuvert(false)}
          onBadges={() => {
            a.setProfilOuvert(false);
            onBadges();
          }}
        />
      )}
    </div>
  );
}
