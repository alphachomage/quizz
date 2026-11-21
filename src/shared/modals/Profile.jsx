import { useMemo, useState } from 'react';

import Icon from '@shared/ui/Icon.jsx';
import Modal from '@shared/ui/Modal.jsx';

import { loadXp, themeLevel, xpForLevel } from '@lib/xp.js';
import { computeBadges, favoriteBadge, setFavoriteBadge } from '@lib/badges.js';
import { displayedTitle } from '@lib/titles.js';

// Carte profil (au clic sur l'avatar) : photo, pseudo, niveau global + barre d'XP,
// TITRE dans un emplacement dédié, top 3 des thèmes par XP, progression badges
// et badge favori choisi parmi les débloqués.

export default function Profile({ pseudo, avatar, themes, onFermer, onBadges }) {
  const xp = useMemo(() => loadXp(), []);
  const badges = useMemo(() => computeBadges(), []);
  const [favori, setFavori] = useState(() => favoriteBadge());
  const [choisir, setChoisir] = useState(false);

  const title = displayedTitle();
  const totalXp = Object.values(xp).reduce((a, b) => a + (b || 0), 0);
  const nivGlobal = themeLevel(totalXp);
  const xpLevel = xpForLevel(nivGlobal);
  const xpNext = xpForLevel(nivGlobal + 1);
  const pctXp = Math.min(100, Math.round(((totalXp - xpLevel) / Math.max(1, xpNext - xpLevel)) * 100));

  // Top 3 des thèmes par XP
  const top3 = Object.entries(xp)
    .map(([id, v]) => ({ id, xp: v, niv: themeLevel(v), t: (themes || []).find((x) => x.id === id) }))
    .filter((e) => e.xp > 0)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 3);

  const nbBadges = badges.filter((b) => b.debloque).length;
  const unlockedBadges = badges.filter((b) => b.debloque);

  function choisirBadge(b) {
    setFavoriteBadge(b.id);
    setFavori(favoriteBadge());
    setChoisir(false);
  }

  return (
    <Modal title="Mon profil" onFermer={onFermer} classe="profil">
      <div className="modal-titre">
        <h2><Icon nom="user" taille={22} /> Mon profil</h2>
        <button className="btn-suppr" onClick={onFermer} title="Fermer">
          <Icon nom="x" taille={18} />
        </button>
      </div>

      <div className="profil-header">
        <span className="profil-avatar">
          {avatar ? <img src={avatar} alt="" /> : <Icon nom="user" taille={30} />}
        </span>
        <div className="profil-id">
          <span className="profil-pseudo">{pseudo} <span className="user-niv">Niv. {nivGlobal}</span></span>
          <span className="user-xpbar" title={`${totalXp} XP au total`}>
            <i style={{ width: `${pctXp}%` }} />
          </span>
          {title && (
            <span className="profil-titre" title="Ton titre — change-le dans l'onglet Badges & titres">
              <Icon nom="star" taille={13} /> {title}
            </span>
          )}
        </div>
      </div>

      <h3 className="titre-section">Top 3 thèmes (XP)</h3>
      {top3.length === 0 ? (
        <p className="vide">Joue une partie pour voir tes thèmes favoris apparaître ici.</p>
      ) : (
        <ul className="stats-liste">
          {top3.map((e, i) => (
            <li key={e.id} className="stats-ligne profil-theme">
              <span className="rang" style={{ color: ['#fde047', '#cbd5e1', '#fbbf24'][i] }}>{i + 1}</span>
              <span className="stats-ligne-nom" style={{ color: e.t ? e.t.couleur : '#fff' }}>
                <Icon nom={e.t ? e.t.icone : 'sparkles'} taille={16} /> {e.t ? e.t.nom : e.id}
              </span>
              <span className="stats-ligne-val">Niv. {e.niv} · {e.xp} XP</span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="titre-section">Badges — {nbBadges} / {badges.length} débloqués</h3>
      <div className="profil-badge-favori">
        {favori ? (
          <>
            <span className="badge-icone favori"><Icon nom={favori.icone} taille={30} /></span>
            <div>
              <strong>{favori.nom}</strong>
              <small className="badge-desc">{favori.desc}</small>
            </div>
          </>
        ) : (
          <p className="vide">Aucun badge favori choisi pour l'instant.</p>
        )}
      </div>
      {choisir ? (
        <ul className="badges-grille petite">
          {unlockedBadges.map((b) => (
            <li key={b.id}>
              <button className="badge-choisir-li" onClick={() => choisirBadge(b)} title={b.nom}>
                <Icon nom={b.icone} taille={22} />
                <span>{b.nom}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <button className="btn-secondaire" onClick={() => setChoisir(true)}>
          <Icon nom="star" taille={16} /> {favori ? 'Changer de badge favori' : 'Choisir un badge favori'}
        </button>
      )}

      <button className="btn-secondaire" onClick={onBadges}>
        <Icon nom="trophy" taille={16} /> Badges & titres
      </button>
    </Modal>
  );
}
