// useCarousel.ts — état d'un carrousel horizontal (scroll-snap natif) : position de la
// jauge de progression, flèches précédent/suivant actives ou non, défilement par page.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export interface CarouselState {
  trackRef: RefObject<HTMLDivElement>;
  /** Part visible de la piste (0-1) : largeur du curseur de la jauge. */
  visible: number;
  /** Position du curseur (0-1) dans l'espace restant de la jauge. */
  progress: number;
  canPrev: boolean;
  canNext: boolean;
  onScroll: () => void;
  page: (dir: 1 | -1) => void;
}

export function useCarousel(itemCount: number): CarouselState {
  const trackRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const [state, setState] = useState({ visible: 1, progress: 0, canPrev: false, canNext: false });

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setState({
      visible: el.scrollWidth > 0 ? Math.min(1, el.clientWidth / el.scrollWidth) : 1,
      progress: max > 0 ? el.scrollLeft / max : 0,
      canPrev: el.scrollLeft > 4,
      canNext: el.scrollLeft < max - 4,
    });
  }, []);

  // Une seule mesure par image affichée, même si l'événement scroll arrive en rafale
  const onScroll = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(measure);
  }, [measure]);

  useEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, [measure, itemCount]);

  // Défile d'environ une largeur visible ; le scroll-snap recale sur la carte la plus proche
  const page = useCallback((dir: 1 | -1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85 });
  }, []);

  return { trackRef, ...state, onScroll, page };
}
