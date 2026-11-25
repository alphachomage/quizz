// RelicChoice.tsx — écran de choix de relique du Rogue Quizz (phase 'relique') :
// le timer est en pause, le joueur DOIT choisir une relique parmi les propositions.
// Les cartes sont colorées selon la rareté. Pas de fermeture possible sans choisir.
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import { RARETE_COULEUR } from '@lib/relics.js';
import type { Relic } from '@lib/relics.js';

interface RelicChoiceProps {
  proposals: Relic[];
  /** Numéro du choix dans la run (1 = départ, 2 = après le 1er palier…). */
  numeroChoix: number;
  /** Secondes restantes avant l'auto-choix (timer de 20 s). */
  tempsRestant: number;
  onChoisir: (id: string) => void;
}

export default function RelicChoice({
  proposals,
  numeroChoix,
  tempsRestant,
  onChoisir,
}: RelicChoiceProps): ReactElement {
  return (
    <div className="relique-overlay" role="dialog" aria-modal="true" aria-label="Choisis ta relique">
      <div className="relique-modal">
        <span className="modal-mode-icone">
          <Icon nom="gem" taille={44} />
        </span>
        <h2 className="modal-badge-nom">Choisis ta relique</h2>
        <p className="modal-badge-desc">
          Choix n°{numeroChoix} — les reliques se cumulent pendant toute la run.
        </p>
        <span className="relique-timer" title="Une relique sera choisie automatiquement à 0">
          <Icon nom="timer" taille={16} /> {Math.ceil(tempsRestant)} s
        </span>
        <div className="relique-cartes">
          {proposals.map((r) => (
            <button
              key={r.id}
              type="button"
              className="relique-carte"
              style={{ borderColor: RARETE_COULEUR[r.rarete] }}
              onClick={() => onChoisir(r.id)}
            >
              <span
                className="relique-rarete"
                style={{ background: RARETE_COULEUR[r.rarete] }}
              >
                {r.rarete}
              </span>
              <Icon nom={r.icone} taille={36} />
              <span className="relique-nom">{r.nom}</span>
              <span className="relique-desc">{r.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
