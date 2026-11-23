// Iconothèque de l'appli : des SVG "app-icon" modernes (traits épais, formes pleines
// avec découpes), sans aucun emoji.
// Pour ajouter une icône : dessiner un chemin 24×24 (inspiré de lucide.dev) et l'ajouter à CHEMINS.
import type { ReactElement, ReactNode } from 'react';

// nom d'icône -> fragment SVG (24×24). Une icône inconnue retombe sur « question ».
const CHEMINS: Record<string, ReactNode> = {
  // logo
  bolt: (
    <path
      fill="currentColor"
      stroke="none"
      d="M13.6 1.5 4.2 13.6h5.6L8.6 22.5l9.4-12.1h-5.6l1.2-8.9z"
    />
  ),
  // accessibilité
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <line x1="12" y1="1.8" x2="12" y2="4.2" />
      <line x1="12" y1="19.8" x2="12" y2="22.2" />
      <line x1="1.8" y1="12" x2="4.2" y2="12" />
      <line x1="19.8" y1="12" x2="22.2" y2="12" />
      <line x1="4.9" y1="4.9" x2="6.6" y2="6.6" />
      <line x1="17.4" y1="17.4" x2="19.1" y2="19.1" />
      <line x1="4.9" y1="19.1" x2="6.6" y2="17.4" />
      <line x1="17.4" y1="6.6" x2="19.1" y2="4.9" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="10.6" x2="15.4" y2="6.4" />
      <line x1="8.6" y1="13.4" x2="15.4" y2="17.6" />
    </>
  ),
  // modes
  timer: (
    <>
      <line x1="10" y1="2" x2="14" y2="2" />
      <line x1="12" y1="14" x2="15.2" y2="10.8" />
      <circle cx="12" cy="14" r="8" />
    </>
  ),
  swords: (
    <>
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
      <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
      <line x1="5" y1="14" x2="9" y2="18" />
      <line x1="7" y1="21" x2="3" y2="17" />
      <line x1="3" y1="9" x2="7" y2="5" />
    </>
  ),
  // thèmes — icônes DUOTONE style "app icon" : forme pleine blanche (currentColor),
  // détails découpés dans la couleur du badge via la variable CSS --couleur du parent.
  globe: (
    <>
      <circle cx="12" cy="12" r="9.5" fill="currentColor" stroke="none" />
      <g fill="none" stroke="var(--couleur, #8b5cf6)" strokeWidth="1.8">
        <line x1="3.4" y1="12" x2="20.6" y2="12" />
        <ellipse cx="12" cy="12" rx="4.4" ry="9.5" />
      </g>
    </>
  ),
  film: (
    // écran avec bouton play découpé
    <>
      <rect x="2.5" y="4.5" width="19" height="15" rx="3.5" fill="currentColor" stroke="none" />
      <path d="M10.2 9.1v5.8l5-2.9z" fill="var(--couleur, #8b5cf6)" stroke="none" />
    </>
  ),
  music: (
    // note pleine (Material "music_note")
    <path fill="currentColor" stroke="none" d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
  ),
  ball: (
    // ballon plein, pentagone et coutures découpés dans la couleur du badge
    <>
      <circle cx="12" cy="12" r="9.5" fill="currentColor" stroke="none" />
      <path
        fill="var(--couleur, #8b5cf6)"
        stroke="none"
        d="M12 7.6 16.1 10.6 14.6 15.1H9.4L7.9 10.6z"
      />
      <g stroke="var(--couleur, #8b5cf6)" strokeWidth="1.6" fill="none">
        <line x1="12" y1="2.5" x2="12" y2="7.6" />
        <line x1="16.1" y1="10.6" x2="20.8" y2="9.2" />
        <line x1="14.6" y1="15.1" x2="17.6" y2="19.3" />
        <line x1="9.4" y1="15.1" x2="6.4" y2="19.3" />
        <line x1="7.9" y1="10.6" x2="3.2" y2="9.2" />
      </g>
    </>
  ),
  gamepad: (
    <>
      <path
        fill="currentColor"
        stroke="none"
        d="M17.3 5H6.7a4 4 0 0 0-4 3.6C2.6 9.4 2 14.5 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.4-1.4a2 2 0 0 1 1.4-.6h4.4a2 2 0 0 1 1.4.6L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.5-.6-6.6-.7-7.4A4 4 0 0 0 17.3 5z"
      />
      <g stroke="var(--couleur, #8b5cf6)" strokeWidth="1.8" fill="none" strokeLinecap="round">
        <line x1="6" y1="11" x2="10" y2="11" />
        <line x1="8" y1="9" x2="8" y2="13" />
      </g>
      <circle cx="15" cy="12" r="1.2" fill="var(--couleur, #8b5cf6)" stroke="none" />
      <circle cx="18" cy="10" r="1.2" fill="var(--couleur, #8b5cf6)" stroke="none" />
    </>
  ),
  sparkles: (
    // étoiles 4 branches pleines
    <>
      <path
        fill="currentColor"
        stroke="none"
        d="M11 3c.7 4 2.9 6.2 7 7-4.1.8-6.3 3-7 7-.7-4-2.9-6.2-7-7 4.1-.8 6.3-3 7-7z"
      />
      <path
        fill="currentColor"
        stroke="none"
        d="M18.5 14c.35 2 1.5 3.15 3.5 3.5-2 .35-3.15 1.5-3.5 3.5-.35-2-1.5-3.15-3.5-3.5 2-.35 3.15-1.5 3.5-3.5z"
      />
    </>
  ),
  question: (
    // disque plein, point d'interrogation découpé dans la couleur du badge
    <>
      <circle cx="12" cy="12" r="9.5" fill="currentColor" stroke="none" />
      <path
        d="M9.2 9.3a2.9 2.9 0 0 1 5.6.9c0 1.9-2.8 2.3-2.8 4.2"
        fill="none"
        stroke="var(--couleur, #8b5cf6)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17.4" r="1.2" fill="var(--couleur, #8b5cf6)" stroke="none" />
    </>
  ),
  pin: (
    // pin plein avec trou
    <path
      fill="currentColor"
      fillRule="evenodd"
      stroke="none"
      d="M12 2a8 8 0 0 0-8 8c0 5.4 7 11.6 7.3 11.9a1 1 0 0 0 1.4 0C13 21.6 20 15.4 20 10a8 8 0 0 0-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"
    />
  ),
  // UI
  podium: (
    <>
      <rect x="9" y="5" width="6" height="15" rx="1.5" />
      <rect x="2.5" y="12" width="5.5" height="8" rx="1.5" />
      <rect x="16" y="15" width="5.5" height="5" rx="1.5" />
      <line x1="12" y1="2" x2="12" y2="4" />
    </>
  ),
  trophy: (
    <>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.7V17c0 .6-.5 1-1 1.2C7.9 18.8 7 20.2 7 22" />
      <path d="M14 14.7V17c0 .6.5 1 1 1.2 1.1.6 2 2 2 3.8" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </>
  ),
  home: (
    <>
      <path d="m3 9.5 9-7 9 7V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5z" />
      <polyline points="9 22 9 13 15 13 15 22" />
    </>
  ),
  replay: (
    <>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  device: <rect x="7" y="2" width="10" height="20" rx="2.5" />,
  star: (
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  x: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  dice: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  'chevron-left': <polyline points="15 18 9 12 15 6" />,
  'chevron-right': <polyline points="9 18 15 12 9 6" />,
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>
  ),
  trash: (
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <line x1="12" y1="9" x2="12" y2="13.5" />
      <circle cx="12" cy="17.3" r="0.4" fill="currentColor" />
    </>
  ),
  pencil: <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
  user: (
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>
  ),
  // interface / réglages
  sliders: (
    // trois lignes horizontales avec curseurs = réglages
    <>
      <line x1="3" y1="5" x2="21" y2="5" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="19" x2="21" y2="19" />
      <circle cx="15" cy="5" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="8" cy="12" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="17" cy="19" r="2.4" fill="currentColor" stroke="none" />
    </>
  ),
  chart: (
    <>
      <line x1="3" y1="20.5" x2="21" y2="20.5" />
      <line x1="6" y1="20.5" x2="6" y2="12" />
      <line x1="12" y1="20.5" x2="12" y2="5" />
      <line x1="18" y1="20.5" x2="18" y2="15" />
    </>
  ),
  skull: (
    <>
      <path d="M12 2.5a8 8 0 0 0-8 8c0 2.9 1.5 4.9 3.4 6v2.6A1.9 1.9 0 0 0 9.3 21.5h5.4a1.9 1.9 0 0 0 1.9-1.9v-2.6c1.9-1.1 3.4-3.1 3.4-6a8 8 0 0 0-8-8z" />
      <circle cx="9" cy="10.5" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10.5" r="1.7" fill="currentColor" stroke="none" />
      <line x1="9.5" y1="17.5" x2="9.5" y2="19.5" />
      <line x1="12" y1="18" x2="12" y2="20" />
      <line x1="14.5" y1="17.5" x2="14.5" y2="19.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  volumeLevel: (
    <>
      <polygon points="11 5 6 9 2.5 9 2.5 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.6 5.6a9.2 9.2 0 0 1 0 12.8" />
    </>
  ),
  vibrate: (
    // téléphone avec ondes latérales
    <>
      <rect x="8" y="3" width="8" height="18" rx="2.2" />
      <line x1="10.8" y1="17.8" x2="13.2" y2="17.8" />
      <path d="M4.5 9.5a4 4 0 0 0 0 5" />
      <path d="M19.5 9.5a4 4 0 0 1 0 5" />
    </>
  ),
  flame: (
    // flamme (bonus de série)
    <>
      <path d="M12 22c4.4 0 7.5-3 7.5-7.2 0-3.1-1.8-5.4-3.4-7.3-.9-1-1.9-2.1-2.4-3.5-.2-.6-1-.7-1.3-.1C10.6 6.5 8.5 8.6 7 11c-.6 1-1 2.2-1 3.4C6 18.9 8.6 22 12 22z" />
      <path
        d="M12 22c-1.9 0-3.2-1.3-3.2-3.1 0-1.7 1.2-2.8 2.1-4 .3-.4.9-.4 1.2 0 .4.6 1.9 2.3 1.9 4 0 1.8-1.3 3.1-3 3.1z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  // nouveaux thèmes
  temple: (
    // temple grec (mythologie) : fronton + 3 colonnes
    <>
      <path d="M12 3 3.5 8h17L12 3z" />
      <line x1="5" y1="10.5" x2="5" y2="18" />
      <line x1="12" y1="10.5" x2="12" y2="18" />
      <line x1="19" y1="10.5" x2="19" y2="18" />
      <line x1="3" y1="20.5" x2="21" y2="20.5" />
      <line x1="3" y1="10.5" x2="21" y2="10.5" />
    </>
  ),
  flask: (
    // fiole de laboratoire (sciences)
    <>
      <path d="M10 2.5v6L4.6 18a2 2 0 0 0 1.8 3h11.2a2 2 0 0 0 1.8-3L14 8.5v-6" />
      <line x1="8.5" y1="2.5" x2="15.5" y2="2.5" />
      <line x1="7" y1="14.5" x2="17" y2="14.5" />
    </>
  ),
  planet: (
    // planète avec anneau (espace)
    <>
      <circle cx="12" cy="12" r="5.5" />
      <ellipse cx="12" cy="12" rx="10" ry="3.6" transform="rotate(-18 12 12)" />
    </>
  ),
  utensils: (
    // fourchette + couteau (cuisine)
    <>
      <path d="M4 2.5v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-6" />
      <line x1="6" y1="2.5" x2="6" y2="21.5" />
      <path d="M19 15V2.5a4.5 4.5 0 0 0-4.5 4.5v6a2 2 0 0 0 2 2H19zm0 0v6.5" />
    </>
  ),
  thumbsdown: (
    // pouce vers le bas (signaler une question)
    <>
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
      <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </>
  ),
  book: (
    // livre ouvert (mangas & animés)
    <>
      <path d="M2 4.5h6a4 4 0 0 1 4 4V20a3 3 0 0 0-3-3H2z" />
      <path d="M22 4.5h-6a4 4 0 0 0-4 4V20a3 3 0 0 1 3-3h7z" />
    </>
  ),
  scroll: (
    // parchemin (histoire)
    <>
      <path d="M19 17V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h1" />
      <path d="M8 21h11a2 2 0 0 0 2-2v-2a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v2a2 2 0 0 1-2 2z" />
      <line x1="7" y1="7.5" x2="13" y2="7.5" />
      <line x1="7" y1="11" x2="13" y2="11" />
    </>
  ),
  chip: (
    // puce électronique (technologie & internet)
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="10" y="10" width="4" height="4" rx="1" />
      <line x1="9" y1="2.5" x2="9" y2="6" />
      <line x1="15" y1="2.5" x2="15" y2="6" />
      <line x1="9" y1="18" x2="9" y2="21.5" />
      <line x1="15" y1="18" x2="15" y2="21.5" />
      <line x1="2.5" y1="9" x2="6" y2="9" />
      <line x1="2.5" y1="15" x2="6" y2="15" />
      <line x1="18" y1="9" x2="21.5" y2="9" />
      <line x1="18" y1="15" x2="21.5" y2="15" />
    </>
  ),
  paw: (
    // patte d'animal (nature & animaux)
    <>
      <circle cx="5.5" cy="10" r="2" />
      <circle cx="9.5" cy="5.5" r="2" />
      <circle cx="14.5" cy="5.5" r="2" />
      <circle cx="18.5" cy="10" r="2" />
      <path d="M12 11c-3 0-5.5 2.5-5.5 5a2.75 2.75 0 0 0 5.5.5 2.75 2.75 0 0 0 5.5-.5c0-2.5-2.5-5-5.5-5z" />
    </>
  ),
  coins: (
    // pièces empilées (économie & marques)
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
      <path d="M5 12v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6" />
    </>
  ),
  car: (
    // voiture (voitures & auto-moto)
    <>
      <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
      <path d="M3 11h18a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1" />
      <path d="M3 11a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1" />
      <circle cx="7.5" cy="17" r="2" />
      <circle cx="16.5" cy="17" r="2" />
      <line x1="9.5" y1="17" x2="14.5" y2="17" />
      <line x1="3" y1="13" x2="21" y2="13" />
    </>
  ),
};

interface IconProps {
  nom?: string;
  taille?: number;
  className?: string;
}

// <Icone nom="globe" taille={28} /> — couleur héritée de `currentColor`, trait épais (2.4).
export default function Icon({ nom, taille = 24, className = '' }: IconProps): ReactElement {
  return (
    <svg
      className={`icone ${className}`}
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {CHEMINS[nom ?? 'question'] || CHEMINS.question}
    </svg>
  );
}

interface BarsProps {
  actives: number;
  taille?: number;
  couleur?: string;
}

// Petite jauge de difficulté : 3 barres, les `actives` premières sont allumées.
export function Bars({ actives, taille = 20, couleur = 'currentColor' }: BarsProps): ReactElement {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" className="barres" aria-hidden="true">
      {[0, 1, 2].map((i) => {
        const h = (i + 1) * 5;
        return (
          <rect
            key={i}
            x={4 + i * 6}
            y={19 - h}
            width="4"
            height={h}
            rx="1.5"
            fill={i < actives ? couleur : 'rgba(255,255,255,0.14)'}
          />
        );
      })}
    </svg>
  );
}
