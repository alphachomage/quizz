// RelicChoice.tsx — écran de choix de relique du Rogue Quizz (phase 'relique') :
// le timer est en pause, le joueur choisit parmi les propositions (cartes colorées
// selon la rareté, avec la contrepartie). Trois flux :
//  - normal : choisir une relique parmi les propositions (ou refuser si Ascète) ;
//  - Recyclage étape « sacrifice » : choisir une de ses reliques à retirer ;
//  - Spécialiste : choisir le thème qui rapportera ×2.
// Pas de fermeture possible sans choisir (auto-choix à 0 via le timer de 20 s).
import type { ReactElement } from 'react';
import Icon from '@shared/ui/Icon.jsx';
import { RARETE_COULEUR } from '@lib/relics.js';
import type { Relic } from '@lib/relics.js';
import type { Theme } from '@lib/types.js';

interface RelicChoiceProps {
  proposals: Relic[];
  /** Reliques déjà possédées (étape sacrifice du Recyclage). */
  relics: Relic[];
  /** Étape Recyclage en cours ('sacrifice' = choisir une relique à retirer). */
  recyclageEtape: 'sacrifice' | 'nouveau' | null;
  numeroChoix: number;
  tempsRestant: number;
  /** Ascète possédée : le bouton « Refuser » rapporte des points. */
  peutRefuser: boolean;
  /** Spécialiste choisi : choisir le thème spécial. */
  themeAPicker: boolean;
  themes: Theme[];
  onChoisir: (id: string) => void;
  onRefuser: () => void;
  onSacrifier: (id: string) => void;
  onChoisirTheme: (themeId: string) => void;
}

export default function RelicChoice({
  proposals,
  relics,
  recyclageEtape,
  numeroChoix,
  tempsRestant,
  peutRefuser,
  themeAPicker,
  themes,
  onChoisir,
  onRefuser,
  onSacrifier,
  onChoisirTheme,
}: RelicChoiceProps): ReactElement {
  // --- Flux Spécialiste : choisir le thème ---
  if (themeAPicker) {
    return (
      <div className="relique-overlay" role="dialog" aria-modal="true" aria-label="Choisis ton thème de spécialiste">
        <div className="relique-modal">
          <span className="modal-mode-icone">
            <Icon nom="target" taille={44} />
          </span>
          <h2 className="modal-badge-nom">Spécialiste</h2>
          <p className="modal-badge-desc">
            Choisis un thème : ses questions vaudront <strong>×2</strong> (les autres −20 %).
          </p>
          <div className="relique-cartes">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                className="relique-carte theme-carte"
                style={{ borderColor: t.couleur || '#a78bfa' }}
                onClick={() => onChoisirTheme(t.id)}
              >
                <Icon nom={t.icone || 'globe'} taille={30} />
                <span className="relique-nom">{t.nom || t.id}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
  // --- Flux Recyclage : choisir une relique à sacrifier ---
  if (recyclageEtape === 'sacrifice') {
    return (
      <div className="relique-overlay" role="dialog" aria-modal="true" aria-label="Recyclage : relique à retirer">
        <div className="relique-modal">
          <span className="modal-mode-icone">
            <Icon nom="refresh" taille={44} />
          </span>
          <h2 className="modal-badge-nom">Recyclage</h2>
          <p className="modal-badge-desc">
            Choisis une de tes reliques à <strong>retirer</strong> : un nouveau choix de 3 reliques
            (rares ou mieux) sera proposé juste après.
          </p>
          <div className="relique-cartes">
            {relics.map((r) => (
              <button
                key={r.id}
                type="button"
                className="relique-carte"
                style={{ borderColor: RARETE_COULEUR[r.rarete] }}
                onClick={() => onSacrifier(r.id)}
              >
                <span className="relique-rarete" style={{ background: RARETE_COULEUR[r.rarete] }}>
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
  // --- Flux normal ---
  return (
    <div className="relique-overlay" role="dialog" aria-modal="true" aria-label="Choisis ta relique">
      <div className="relique-modal">
        <span className="modal-mode-icone">
          <Icon nom="gem" taille={44} />
        </span>
        <h2 className="modal-badge-nom">
          {recyclageEtape === 'nouveau' ? 'Recyclage : choisis ta nouvelle relique' : 'Choisis ta relique'}
        </h2>
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
              <span className="relique-rarete" style={{ background: RARETE_COULEUR[r.rarete] }}>
                {r.rarete}
              </span>
              <span className="relique-categorie">{r.categorie}</span>
              <Icon nom={r.icone} taille={36} />
              <span className="relique-nom">{r.nom}</span>
              <span className="relique-desc">{r.desc}</span>
              {r.malus && <span className="relique-malus"><Icon nom="alert" taille={12} /> {r.malus}</span>}
            </button>
          ))}
        </div>
        {peutRefuser && (
          <button type="button" className="rogue-action relique-refuser" onClick={onRefuser}>
            <Icon nom="x" taille={15} /> Refuser ce choix (+150 pts — Ascète)
          </button>
        )}
      </div>
    </div>
  );
}
