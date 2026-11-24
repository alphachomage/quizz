// Crest.tsx — blason (écusson) en SVG : forme de bouclier pleine, contenu centré par-dessus.
// Couleur = var(--accent1) par défaut (surchargée via la prop `couleur`).
import type { CSSProperties, ReactElement, ReactNode } from 'react';

interface CrestProps {
  taille: number;
  couleur?: string;
  children: ReactNode;
}

export default function Crest({ taille, couleur, children }: CrestProps): ReactElement {
  return (
    <span
      className="ecusson"
      style={
        {
          width: taille,
          height: taille * 1.15,
          '--ecusson': couleur,
        } as CSSProperties
      }
    >
      <svg viewBox="0 0 40 46" aria-hidden="true">
        {/* contour extérieur puis liseré intérieur (aplats, pas de dégradé) */}
        <path
          className="ecusson-fond"
          d="M20 1.5 37 7v14.5c0 10.6-7 18.6-17 23-10-4.4-17-12.4-17-23V7z"
        />
        <path
          className="ecusson-lisere"
          d="M20 5.2 33.6 9.6v11.9c0 8.6-5.6 15.2-13.6 19-8-3.8-13.6-10.4-13.6-19V9.6z"
        />
      </svg>
      <span className="ecusson-contenu">{children}</span>
    </span>
  );
}
