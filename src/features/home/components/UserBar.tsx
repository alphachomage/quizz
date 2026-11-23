// BarreUser.tsx — barre utilisateur en haut de l'accueil : avatar, pseudo, niveau,
// barre d'XP globale, titre, et boutons (badges, tuto, stats, paramètres, déconnexion).
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import type { HomeState } from '../useHome.js';

interface UserBarProps {
  a: HomeState;
  pseudo: string;
  isGuest: boolean;
  onLogout: () => void;
  onBadges: () => void;
  onTutorial: () => void;
  onStats: () => void;
}

export default function UserBar({
  a,
  pseudo,
  isGuest,
  onLogout,
  onBadges,
  onTutorial,
  onStats,
}: UserBarProps): ReactElement {
  return (
    <div className="barre-user">
      <div className="user-bloc">
        {!isGuest && (
          <button
            className="avatar-btn"
            onClick={() => a.setProfilOuvert(true)}
            title="Voir ma carte profil (changer ma photo : Paramètres)"
          >
            {a.avatar ? (
              <img src={a.avatar} alt="" className="avatar-img" />
            ) : (
              <span className="avatar-defaut">
                <Icon nom="user" taille={18} />
              </span>
            )}
          </button>
        )}
        <div className="user-infos">
          <span className="user-nom">
            <span className="user-pseudo">{pseudo}</span>
            {isGuest && <span className="chip-invite">Invité</span>}
          </span>
          {!isGuest && (
            <>
              <span className="user-progression">
                <span className="user-niv">Niv. {a.nivGlobal}</span>
                <span
                  className="user-xpbar"
                  title={`${a.totalXp} XP au total — niveau ${a.nivGlobal + 1} à ${a.xpNext} XP`}
                >
                  <i
                    style={{
                      width: `${a.pctXpGlobal}%`,
                    }}
                  />
                </span>
              </span>
              {a.profileTitle && (
                <span
                  className="user-titre"
                  title="Ton titre (choisi dans l'onglet Badges & titres)"
                >
                  {a.profileTitle}
                </span>
              )}
            </>
          )}
        </div>
      </div>
      {!isGuest && (
        <button className="btn-icone" title="Mes badges" onClick={onBadges}>
          <Icon nom="star" taille={17} />
        </button>
      )}
      <button className="btn-icone" title="Revoir le tutoriel" onClick={onTutorial}>
        <Icon nom="question" taille={17} />
      </button>
      {!isGuest && (
        <button className="btn-icone" title="Mes statistiques" onClick={onStats}>
          <Icon nom="chart" taille={17} />
        </button>
      )}
      <button
        className="btn-icone"
        title="Paramètres (sons, animations, vibrations)"
        onClick={() => a.setShowSettings(true)}
      >
        <Icon nom="sliders" taille={17} />
      </button>
      <button className="btn-suppr" title="Se déconnecter" onClick={onLogout}>
        <Icon nom="logout" taille={16} />
      </button>
    </div>
  );
}
