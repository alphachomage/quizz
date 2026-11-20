import Icone from './Icone.jsx';

// Animation de déblocage : affichée sur l'ACCUEIL juste après avoir terminé un quizz,
// quand un badge ou un titre vient d'être débloqué. Liste ce qui est nouveau,
// avec une animation d'apparition (respecte le réglage "animations OFF").

export default function Deblocage({ celebration, onFermer, onVoirBadges }) {
  const { badges = [], titres = [] } = celebration || {};
  if (!badges.length && !titres.length) return null;

  return (
    <div className="modal-overlay" onClick={onFermer}>
      <div className="deblocage-carte" onClick={(e) => e.stopPropagation()}>
        <span className="deblocage-icone">
          <Icone nom={badges.length ? badges[0].icone : 'star'} taille={40} />
        </span>
        <h2 className="deblocage-titre">
          {badges.length > 0 && (titres.length > 0 ? 'Nouveaux déblocages !' : 'Nouveau badge débloqué !')}
          {badges.length === 0 && titres.length > 0 && 'Nouveau titre débloqué !'}
        </h2>

        <ul className="deblocage-liste">
          {badges.map((b, i) => (
            <li key={b.id} className="deblocage-item" style={{ animationDelay: `${0.12 * i}s` }}>
              <span className="deblocage-item-icone badge-debloque">
                <Icone nom={b.icone} taille={20} />
              </span>
              <div>
                <strong>Badge : {b.nom}</strong>
                <small>{b.desc}</small>
              </div>
            </li>
          ))}
          {titres.map((t, i) => (
            <li key={t.id} className="deblocage-item" style={{ animationDelay: `${0.12 * (badges.length + i)}s` }}>
              <span className="deblocage-item-icone titre-debloque">
                <Icone nom="star" taille={20} />
              </span>
              <div>
                <strong>Titre : {t.nom}</strong>
                <small>à afficher sous ta barre d'XP (choisis-le dans l'onglet Badges & titres)</small>
              </div>
            </li>
          ))}
        </ul>

        <div className="deblocage-actions">
          <button className="btn-principal" onClick={onFermer}>Continuer</button>
          <button className="btn-secondaire" onClick={onVoirBadges}>
            <Icone nom="star" taille={17} /> Voir mes badges & titres
          </button>
        </div>
      </div>
    </div>
  );
}
