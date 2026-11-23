// useCarousel.ts — carrousel horizontal en boucle infinie (scroll-snap natif).
// La liste est rendue 3 fois [copie | originale | copie] ; quand le défilement s'arrête
// dans une copie, on recale instantanément sur la carte identique de la liste du milieu :
// l'utilisateur peut swiper à gauche ou à droite sans jamais arriver au bout.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/** Nombre de copies de la liste rendues dans la piste (la copie du milieu est l'originale). */
export const LOOP_COPIES = 3;

export interface CarouselState {
  trackRef: RefObject<HTMLDivElement>;
  /** Index (0..n-1) de la carte alignée au début de la zone visible : point actif. */
  active: number;
  onScroll: () => void;
  page: (dir: 1 | -1) => void;
  goTo: (index: number) => void;
}

export function useCarousel(itemCount: number): CarouselState {
  const trackRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const settle = useRef<ReturnType<typeof setTimeout>>();
  const [active, setActive] = useState(0);

  // Distance entre deux cartes et largeur d'une liste complète, mesurées sur le DOM
  const metrics = useCallback(() => {
    const el = trackRef.current;
    const kids = el?.children;
    if (!el || !kids || kids.length < itemCount * LOOP_COPIES || itemCount === 0) return null;
    const first = kids[0] as HTMLElement;
    const step = (kids[1] as HTMLElement | undefined)?.offsetLeft ?? 0;
    const set = (kids[itemCount] as HTMLElement).offsetLeft - first.offsetLeft;
    return { el, step: step - first.offsetLeft, set, start: first.offsetLeft };
  }, [itemCount]);

  // Saut instantané (sans animation) d'une liste entière vers la copie du milieu
  const recenter = useCallback(() => {
    const m = metrics();
    if (!m || m.set <= 0) return;
    const { el, set } = m;
    const x = el.scrollLeft;
    let target = x;
    if (x < set * 0.5) target = x + set;
    else if (x >= set * 1.5) target = x - set;
    if (target === x) return;
    const prev = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto';
    el.scrollLeft = target;
    el.style.scrollBehavior = prev;
  }, [metrics]);

  const measure = useCallback(() => {
    const m = metrics();
    if (!m || m.step <= 0) return;
    const i = Math.round(m.el.scrollLeft / m.step);
    setActive(((i % itemCount) + itemCount) % itemCount);
  }, [metrics, itemCount]);

  const onScroll = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(measure);
    // Recalage une fois le geste terminé (le snap a fini de se poser)
    clearTimeout(settle.current);
    settle.current = setTimeout(recenter, 140);
  }, [measure, recenter]);

  // Départ sur la liste du milieu, avant le premier affichage
  useLayoutEffect(() => {
    const m = metrics();
    if (!m) return;
    const prev = m.el.style.scrollBehavior;
    m.el.style.scrollBehavior = 'auto';
    m.el.scrollLeft = m.set;
    m.el.style.scrollBehavior = prev;
    setActive(0);
  }, [metrics]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      clearTimeout(settle.current);
    },
    []
  );

  const page = useCallback(
    (dir: 1 | -1) => {
      const m = metrics();
      if (!m) return;
      const perView = Math.max(1, Math.floor(m.el.clientWidth / m.step));
      m.el.scrollBy({ left: dir * perView * m.step });
    },
    [metrics]
  );

  // Va à la carte `index` par le chemin le plus court (on peut passer par une copie)
  const goTo = useCallback(
    (index: number) => {
      const m = metrics();
      if (!m) return;
      let delta = index - active;
      if (delta > itemCount / 2) delta -= itemCount;
      if (delta < -itemCount / 2) delta += itemCount;
      m.el.scrollBy({ left: delta * m.step });
    },
    [metrics, active, itemCount]
  );

  return { trackRef, active, onScroll, page, goTo };
}
