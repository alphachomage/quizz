// BarreUser.jsx — barre utilisateur en haut de l'accueil : avatar, pseudo, niveau,
// barre d'XP globale, titre, et boutons (badges, tuto, stats, paramètres, déconnexion).
import Icone from '@shared/ui/Icone.jsx';

export default function BarreUser({ a, pseudo, estInvite, onDeconnexion, onBadges, onTuto, onStats }) {
  return (
    <div className="barre-user">
      <div className="user-bloc">
        {!estInvite && (
          <button
            className="avatar-btn"
            onClick={() => a.setProfilOuvert(true)}
            title="Voir ma carte profil (changer ma photo : Paramètres)"
          >
            {a.avatar ? (
              <img src={a.avatar} alt="" className="avatar-img" />
            ) : (
              <span className="avatar-defaut"><Icone nom="user" taille={18} /></span>
            )}
          </button>
        )}
        <div className="user-infos">
          <span className="user-nom">
            {pseudo} {estInvite ? <span className="chip-invite">Invité</span> : <span className="user-niv">Niv. {a.nivGlobal}</span>}
          </span>
          {!estInvite && (
            <>
              <span className="user-xpbar" title={`${a.xpTotal} XP au total — niveau ${a.nivGlobal + 1} à ${a.xpNext} XP`}>
                <i style={{ width: `${a.pctXpGlobal}%` }} />
              </span>
              {a.titreProfil && <span className="user-titre" title="Ton titre (choisi dans l'onglet Badges & titres)">{a.titreProfil}</span>}
            </>
          )}
        </div>
      </div>
      {!estInvite && (
        <button className="btn-icone" title="Mes badges" onClick={onBadges}>
          <Icone nom="star" taille={17} />
        </button>
      )}
      <button className="btn-icone" title="Revoir le tutoriel" onClick={onTuto}>
        <Icone nom="question" taille={17} />
      </button>
      {!estInvite && (
        <button className="btn-icone" title="Mes statistiques" onClick={onStats}>
          <Icone nom="chart" taille={17} />
        </button>
      )}
      <button className="btn-icone" title="Paramètres (sons, animations, vibrations)" onClick={() => a.setShowParametres(true)}>
        <Icone nom="sliders" taille={17} />
      </button>
      <button className="btn-suppr" title="Se déconnecter" onClick={onDeconnexion}>
        <Icone nom="logout" taille={16} />
      </button>
    </div>
  );
}
