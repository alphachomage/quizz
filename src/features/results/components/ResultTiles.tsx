// ResultTiles.tsx — fin de partie : 3 tuiles lisibles (gros picto + valeur + libellé court)
// à la place des lignes de texte : bonnes réponses, temps moyen, meilleure série.
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import type { GameMode } from '@lib/types.js';

interface ResultTilesProps {
  mode: GameMode;
  bonnes: number;
  total: number;
  avgTime: number | null;
  meilleureSerie: number;
}

export default function ResultTiles({
  mode,
  bonnes,
  total,
  avgTime,
  meilleureSerie,
}: ResultTilesProps): ReactElement {
  const tiles = [
    {
      icone: 'check',
      valeur: mode === 'rogue' ? String(bonnes) : `${bonnes}/${total}`,
      label: 'bonnes réponses',
    },
    {
      icone: 'timer',
      valeur: avgTime === null ? '–' : `${String(avgTime).replace('.', ',')} s`,
      label: 'par question',
    },
    { icone: 'flame', valeur: String(meilleureSerie), label: 'meilleure série' },
  ];
  return (
    <div className="resultat-tuiles">
      {tiles.map((t) => (
        <div key={t.label} className="resultat-tuile">
          <Icon nom={t.icone} taille={28} />
          <strong>{t.valeur}</strong>
          <span>{t.label}</span>
        </div>
      ))}
    </div>
  );
}
