import { useMemo, useState } from 'react';

import Icone from './Icone.jsx';

import { calculerBadges } from '../lib/badges.js';
import { calculerTitres, titreActifId, definirTitreActif } from '../lib/titres.js';

// Écran « Mes badges & titres » : 2 onglets.
// - Badges : 30 badges, verrouillé = grisé + condition exacte, débloqué = jaune PEPS.
// - Titres : ~50 titres (3 par thème selon le niveau 3/5/10 + 14 généraux).
//   Verrouillé = « ??? » ; débloqué = on peut le choisir comme titre affiché sous la barre d'XP.

export default function Badges({ themes, onAccueil }) {
  const [onglet, setOnglet] = useState('badges');
  const badges = useMemo(() => calculerBadges(), []);
  const titres = useMemo(() => calculerTitres(), []);
  const [titreId, setTitreId] = useState(() => titreActifId());

  const n = badges.filter((b) => b.debloque).length;
  const pct = Math.round((n / badges.length) * 100);
  const nt = titres.filter((t) => t.debloque).length;
  const pctT = Math.round((nt / titres.length) * 100);

  function choisirTitre(t) {
    if (!t.debloque) return;
    definirTitreActif(t.id);
    setTitreId(t.id);
  }

  function nomTheme(id) {
    const t = (themes || []).find((x) => x.id === id);
    return t ? t.nom : id;
  }

  return (
    <div className="ecran-centre stats-ecran">
      <div className="stats">
        <div className="stats-titre">
          <h2><Icone nom="trophy" taille={24} /> Badges & titres</h2>
          <button className="btn-secondaire" onClick={onAccueil}>
            <Icone nom="home" taille={18} /> Accueil
          </button>
        </div>

        <div className="onglets">
          <button className={onglet === 'badges' ? 'onglet actif' : 'onglet'} onClick={() => setOnglet('badges')}>
            <Icone nom="trophy" taille={15} /> Badges ({n}/{badges.length})
          </button>
          <button className={onglet === 'titres' ? 'onglet actif' : 'onglet'} onClick={() => setOnglet('titres')}>
            <Icone nom="star" taille={15} /> Titres ({nt}/{titres.length})
          </button>
        </div>

        {onglet === 'badges' && (
          <>
            <div className="xp-globale">
              <div className="xp-globale-titre">
                <span>Progression</span>
                <span className="xp-globale-val">{n} / {badges.length} débloqués ({pct} %)</span>
              </div>
              <div className="xp-barre">
                <i style={{ width: `${pct}%` }} />
              </div>
            </div>

            <ul className="badges-grille">
              {badges.map((b) => (
                <li key={b.id} className={b.debloque ? 'badge debloque' : 'badge verrouille'}>
                  <span className="badge-icone">
                    <Icone nom={b.icone} taille={26} />
                  </span>
                  <span className="badge-nom">{b.nom}</span>
                  <span className="badge-desc">{b.desc}</span>
                  <span className="badge-statut">
                    {b.debloque ? (
                      <><Icone nom="check" taille={13} /> Débloqué</>
                    ) : (
                      <><Icone nom="alert" taille={13} /> Verrouillé</>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {onglet === 'titres' && (
          <>
            <p className="vide" style={{ marginTop: 12 }}>
              Choisis un titre débloqué : il s'affichera sous ta barre d'XP sur l'accueil. Les titres se
              débloquent au niveau 3 / 5 / 10 de chaque thème, plus des titres généraux.
            </p>
            <div className="xp-globale">
              <div className="xp-globale-titre">
                <span>Progression</span>
                <span className="xp-globale-val">{nt} / {titres.length} débloqués ({pctT} %)</span>
              </div>
              <div className="xp-barre">
                <i style={{ width: `${pctT}%` }} />
              </div>
            </div>

            <ul className="badges-grille">
              {titres.map((t) => (
                <li key={t.id} className={t.debloque ? 'badge debloque' : 'badge verrouille'}>
                  <span className="badge-icone">
                    <Icone nom={t.general ? 'star' : (themes.find((x) => x.id === t.themeId)?.icone || 'sparkles')} taille={24} />
                  </span>
                  <span className="badge-nom">{t.debloque ? t.nom : '???'}</span>
                  <span className="badge-desc">
                    {t.debloque
                      ? (t.general ? 'Titre général' : `${nomTheme(t.themeId)} — niveau ${t.palier}`)
                      : 'Titre verrouillé'}
                  </span>
                  {t.debloque ? (
                    <button
                      className="badge-statut badge-choisir"
                      style={t.id === titreId ? { background: 'var(--accent1)', color: '#141414' } : {}}
                      onClick={() => choisirTitre(t)}
                    >
                      {t.id === titreId ? (
                        <><Icone nom="check" taille={13} /> Affiché sur mon profil</>
                      ) : (
                        'Afficher sur mon profil'
                      )}
                    </button>
                  ) : (
                    <span className="badge-statut"><Icone nom="alert" taille={13} /> Verrouillé</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
