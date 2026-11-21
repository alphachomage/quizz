import { useMemo, useState } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import { computeBadges } from '@lib/badges.js';
import { computeTitles, activeTitleId, setActiveTitle } from '@lib/titles.js';
import type { ComputedTitle } from '@lib/titles.js';
import type { Theme } from '@lib/types.js';

// Écran « Mes badges & titres » : 2 onglets.
// - Badges : 30 badges, verrouillé = grisé + condition exacte, débloqué = jaune PEPS.
// - Titres : ~50 titres (3 par thème selon le niveau 3/5/10 + 14 généraux).
//   Verrouillé = « ??? » ; débloqué = on peut le choisir comme titre affiché sous la barre d'XP.

interface BadgesProps {
  themes: Theme[] | null;
  onHome: () => void;
}

export default function Badges({ themes, onHome: onHome }: BadgesProps) {
  const [tab, setTab] = useState('badges');
  const badges = useMemo(() => computeBadges(), []);
  const titles = useMemo(() => computeTitles(), []);
  const [titleId, setTitleId] = useState<string | null>(() => activeTitleId());
  const n = badges.filter((b) => b.debloque).length;
  const pct = Math.round((n / badges.length) * 100);
  const nt = titles.filter((t) => t.debloque).length;
  const pctT = Math.round((nt / titles.length) * 100);
  function pickTitle(t: ComputedTitle): void {
    if (!t.debloque) return;
    setActiveTitle(t.id);
    setTitleId(t.id);
  }
  // `themes` vaut null pendant le chargement, mais l'écran n'est rendu qu'une fois les thèmes prêts.
  function themeName(id: string | null): string | null | undefined {
    const t = (themes || []).find((x) => x.id === id);
    return t ? t.nom : id;
  }
  return (
    <div className="ecran-centre stats-ecran">
      <div className="stats">
        <div className="stats-titre">
          <h2>
            <Icon nom="trophy" taille={24} /> Badges & titres
          </h2>
          <button className="btn-secondaire" onClick={onHome}>
            <Icon nom="home" taille={18} /> Accueil
          </button>
        </div>

        <div className="onglets">
          <button
            className={tab === 'badges' ? 'onglet actif' : 'onglet'}
            onClick={() => setTab('badges')}
          >
            <Icon nom="trophy" taille={15} /> Badges ({n}/{badges.length})
          </button>
          <button
            className={tab === 'titres' ? 'onglet actif' : 'onglet'}
            onClick={() => setTab('titres')}
          >
            <Icon nom="star" taille={15} /> Titres ({nt}/{titles.length})
          </button>
        </div>

        {tab === 'badges' && (
          <>
            <div className="xp-globale">
              <div className="xp-globale-titre">
                <span>Progression</span>
                <span className="xp-globale-val">
                  {n} / {badges.length} débloqués ({pct} %)
                </span>
              </div>
              <div className="xp-barre">
                <i
                  style={{
                    width: `${pct}%`,
                  }}
                />
              </div>
            </div>

            <ul className="badges-grille">
              {badges.map((b) => (
                <li key={b.id} className={b.debloque ? 'badge debloque' : 'badge verrouille'}>
                  <span className="badge-icone">
                    <Icon nom={b.icone} taille={26} />
                  </span>
                  <span className="badge-nom">{b.nom}</span>
                  <span className="badge-desc">{b.desc}</span>
                  <span className="badge-statut">
                    {b.debloque ? (
                      <>
                        <Icon nom="check" taille={13} /> Débloqué
                      </>
                    ) : (
                      <>
                        <Icon nom="alert" taille={13} /> Verrouillé
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === 'titres' && (
          <>
            <p
              className="vide"
              style={{
                marginTop: 12,
              }}
            >
              Choisis un titre débloqué : il s'affichera sous ta barre d'XP sur l'accueil. Les
              titres se débloquent au niveau 3 / 5 / 10 de chaque thème, plus des titres généraux.
            </p>
            <div className="xp-globale">
              <div className="xp-globale-titre">
                <span>Progression</span>
                <span className="xp-globale-val">
                  {nt} / {titles.length} débloqués ({pctT} %)
                </span>
              </div>
              <div className="xp-barre">
                <i
                  style={{
                    width: `${pctT}%`,
                  }}
                />
              </div>
            </div>

            <ul className="badges-grille">
              {titles.map((t) => (
                <li key={t.id} className={t.debloque ? 'badge debloque' : 'badge verrouille'}>
                  <span className="badge-icone">
                    <Icon
                      nom={
                        t.general
                          ? 'star'
                          : (themes || []).find((x) => x.id === t.themeId)?.icone || 'sparkles'
                      }
                      taille={24}
                    />
                  </span>
                  <span className="badge-nom">{t.debloque ? t.nom : '???'}</span>
                  <span className="badge-desc">
                    {t.debloque
                      ? t.general
                        ? 'Titre général'
                        : `${themeName(t.themeId)} — niveau ${t.palier}`
                      : 'Titre verrouillé'}
                  </span>
                  {t.debloque ? (
                    <button
                      className="badge-statut badge-choisir"
                      style={
                        t.id === titleId
                          ? {
                              background: 'var(--accent1)',
                              color: '#141414',
                            }
                          : {}
                      }
                      onClick={() => pickTitle(t)}
                    >
                      {t.id === titleId ? (
                        <>
                          <Icon nom="check" taille={13} /> Affiché sur mon profil
                        </>
                      ) : (
                        'Afficher sur mon profil'
                      )}
                    </button>
                  ) : (
                    <span className="badge-statut">
                      <Icon nom="alert" taille={13} /> Verrouillé
                    </span>
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
