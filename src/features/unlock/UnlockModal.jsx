import Icon from '@shared/ui/Icon.jsx';

// Animation de déblocage : affichée sur l'ACCUEIL juste après avoir terminé un quizz,
// quand un badge ou un titre vient d'être débloqué. Liste ce qui est nouveau,
// avec une animation d'apparition (respecte le réglage "animations OFF").

export default function UnlockModal({ celebration, onClose: onClose, onSeeBadges: onSeeBadges }) {
  const { badges = [], titles = [] } = celebration || {};
  if (!badges.length && !titles.length) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="deblocage-carte" onClick={(e) => e.stopPropagation()}>
        <span className="deblocage-icone">
          <Icon nom={badges.length ? badges[0].icone : 'star'} taille={40} />
        </span>
        <h2 className="deblocage-titre">
          {badges.length > 0 &&
            (titles.length > 0 ? 'Nouveaux déblocages !' : 'Nouveau badge débloqué !')}
          {badges.length === 0 && titles.length > 0 && 'Nouveau titre débloqué !'}
        </h2>

        <ul className="deblocage-liste">
          {badges.map((b, i) => (
            <li
              key={b.id}
              className="deblocage-item"
              style={{
                animationDelay: `${0.12 * i}s`,
              }}
            >
              <span className="deblocage-item-icone badge-debloque">
                <Icon nom={b.icone} taille={20} />
              </span>
              <div>
                <strong>Badge : {b.nom}</strong>
                <small>{b.desc}</small>
              </div>
            </li>
          ))}
          {titles.map((t, i) => (
            <li
              key={t.id}
              className="deblocage-item"
              style={{
                animationDelay: `${0.12 * (badges.length + i)}s`,
              }}
            >
              <span className="deblocage-item-icone titre-debloque">
                <Icon nom="star" taille={20} />
              </span>
              <div>
                <strong>Titre : {t.nom}</strong>
                <small>
                  à afficher sous ta barre d'XP (choisis-le dans l'onglet Badges & titres)
                </small>
              </div>
            </li>
          ))}
        </ul>

        <div className="deblocage-actions">
          <button className="btn-principal" onClick={onClose}>
            Continuer
          </button>
          <button className="btn-secondaire" onClick={onSeeBadges}>
            <Icon nom="star" taille={17} /> Voir mes badges & titres
          </button>
        </div>
      </div>
    </div>
  );
}
