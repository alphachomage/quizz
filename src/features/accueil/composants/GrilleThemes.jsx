// GrilleThemes.jsx — grille des thèmes (ordre alphabétique fixe) avec carte mémoïsée
// (React.memo : la grille ne re-rend que la carte whose props changent).
import { memo } from 'react';

import Icone from '@shared/ui/Icone.jsx';
import { cleRecord, niveauTheme, xpPourNiveau } from '@lib/index.js';

const CarteTheme = memo(function CarteTheme({ t, mode, niveau, themeId, records, xp, estAdmin, estInvite, onSelect }) {
  const record = records[cleRecord(mode, mode === 'solo' ? niveau : null, t.id)] || 0;
  const niv = niveauTheme(xp[t.id] || 0);
  const xpNiv = xpPourNiveau(niv);
  const xpNext = xpPourNiveau(niv + 1);
  const pctXp = Math.min(100, Math.round(((xp[t.id] || 0) - xpNiv) / (xpNext - xpNiv) * 100));
  return (
    <button
      className={themeId === t.id ? 'theme actif' : 'theme'}
      style={{ '--couleur': t.couleur }}
      onClick={() => onSelect(t.id)}
    >
      <span className="theme-haut">
        <span className="theme-icone">
          <Icone nom={t.icone} taille={22} />
        </span>
        <span className="theme-nom">{t.nom}</span>
      </span>
      <span className="theme-meta">
        {!estInvite && <span className="theme-niv">Niv. {niv}</span>}
        {record > 0 && <span className="theme-record">Record {record} pts</span>}
        {estAdmin && <span className="theme-nb">{t.questions.length} q.</span>}
      </span>
      {!estInvite && (
        <span className="theme-xpbar" title={`XP ${xp[t.id] || 0} — niveau ${niv + 1} à ${xpNext} XP`}>
          <i style={{ width: `${pctXp}%`, background: t.couleur }} />
        </span>
      )}
    </button>
  );
});

export default function GrilleThemes({ a, estAdmin, estInvite }) {
  return (
    <>
      <h2 className="titre-section">Choisis ton thème</h2>
      <section className="themes">
        {a.themesAffiches.map((t) => (
          <CarteTheme
            key={t.id}
            t={t}
            mode={a.mode}
            niveau={a.niveau}
            themeId={a.themeId}
            records={a.records}
            xp={a.xp}
            estAdmin={estAdmin}
            estInvite={estInvite}
            onSelect={(id) => {
              a.setThemeId(id);
              // En solo, le choix du niveau se fait dans une modale, sans scroll
              if (a.mode === 'solo') a.setModalNiveau(true);
            }}
          />
        ))}
      </section>
    </>
  );
}
