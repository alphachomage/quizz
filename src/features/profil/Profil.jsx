import { useMemo, useState } from 'react';

import Icone from '@shared/ui/Icone.jsx';

import { chargerXP, niveauTheme, xpPourNiveau } from '@lib/index.js';
import { calculerBadges, badgeFavori, definirBadgeFavori } from '@lib/badges.js';
import { titreAffiche } from '@lib/titres.js';

// Carte profil (au clic sur l'avatar) : photo, pseudo, niveau global + barre d'XP,
// TITRE dans un emplacement dédié, top 3 des thèmes par XP, progression badges
// et badge favori choisi parmi les débloqués.

export default function Profil({ pseudo, avatar, themes, onFermer, onBadges }) {
  const xp = useMemo(() => chargerXP(), []);
  const badges = useMemo(() => calculerBadges(), []);
  const [favori, setFavori] = useState(() => badgeFavori());
  const [choisir, setChoisir] = useState(false);

  const titre = titreAffiche();
  const xpTotal = Object.values(xp).reduce((a, b) => a + (b || 0), 0);
  const nivGlobal = niveauTheme(xpTotal);
  const xpNiv = xpPourNiveau(nivGlobal);
  const xpNext = xpPourNiveau(nivGlobal + 1);
  const pctXp = Math.min(100, Math.round(((xpTotal - xpNiv) / Math.max(1, xpNext - xpNiv)) * 100));

  // Top 3 des thèmes par XP
  const top3 = Object.entries(xp)
    .map(([id, v]) => ({ id, xp: v, niv: niveauTheme(v), t: (themes || []).find((x) => x.id === id) }))
    .filter((e) => e.xp > 0)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 3);

  const nbBadges = badges.filter((b) => b.debloque).length;
  const badgesDebloques = badges.filter((b) => b.debloque);

  function choisirBadge(b) {
    definirBadgeFavori(b.id);
    setFavori(badgeFavori());
    setChoisir(false);
  }

  return (
    <div className="modal-overlay" onClick={onFermer}>
      <div className="modal profil" onClick={(e) => e.stopPropagation()}>
        <div className="modal-titre">
          <h2><Icone nom="user" taille={22} /> Mon profil</h2>
          <button className="btn-suppr" onClick={onFermer} title="Fermer">
            <Icone nom="x" taille={18} />
          </button>
        </div>

        <div className="profil-header">
          <span className="profil-avatar">
            {avatar ? <img src={avatar} alt="" /> : <Icone nom="user" taille={30} />}
          </span>
          <div className="profil-id">
            <span className="profil-pseudo">{pseudo} <span className="user-niv">Niv. {nivGlobal}</span></span>
            <span className="user-xpbar" title={`${xpTotal} XP au total`}>
              <i style={{ width: `${pctXp}%` }} />
            </span>
            {titre && (
              <span className="profil-titre" title="Ton titre — change-le dans l'onglet ⭐ Badges & titres">
                <Icone nom="star" taille={13} /> {titre}
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
                  <Icone nom={e.t ? e.t.icone : 'sparkles'} taille={16} /> {e.t ? e.t.nom : e.id}
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
              <span className="badge-icone favori"><Icone nom={favori.icone} taille={30} /></span>
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
            {badgesDebloques.map((b) => (
              <li key={b.id}>
                <button className="badge-choisir-li" onClick={() => choisirBadge(b)} title={b.nom}>
                  <Icone nom={b.icone} taille={22} />
                  <span>{b.nom}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <button className="btn-secondaire" onClick={() => setChoisir(true)}>
            <Icone nom="star" taille={16} /> {favori ? 'Changer de badge favori' : 'Choisir un badge favori'}
          </button>
        )}

        <button className="btn-secondaire" onClick={onBadges}>
          <Icone nom="trophy" taille={16} /> Badges & titres
        </button>
      </div>
    </div>
  );
}
