// useCarousel.ts — carrousel horizontal en boucle infinie, carte CENTRALE = sélection.
// La liste est rendue LOOP_COPIES fois ; quand le défilement s'arrête loin de la copie du
// milieu, on recale instantanément d'une liste entière (invisible pour l'utilisateur).
// `spinTo` fait tourner le carrousel façon roulette jusqu'à une carte (tirage aléatoire).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/** Nombre de copies de la liste dans la piste : assez pour un tour complet de roulette. */
export const LOOP_COPIES = 5;
const MIDDLE = Math.floor(LOOP_COPIES / 2);

export interface CarouselState {
  trackRef: RefObject<HTMLDivElement>;
  /** Index (0..n-1) de la carte au centre : c'est la carte sélectionnée. */
  active: number;
  /** true pendant un tirage animé. */
  spinning: boolean;
  onScroll: () => void;
  goTo: (index: number) => void;
  /** Fait défiler (au moins un tour) puis s'arrête sur `index`. Durée 0 = saut direct. */
  spinTo: (index: number, ms: number) => void;
}

// Démarre vite, ralentit longuement : comme une roue qui s'arrête
const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

export function useCarousel(itemCount: number): CarouselState {
  const trackRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const settle = useRef<ReturnType<typeof setTimeout>>();
  const spinningRef = useRef(false);
  const [active, setActive] = useState(0);
  const [spinning, setSpinning] = useState(false);

  // Mesures prises sur le DOM : pas entre deux cartes et largeur d'une liste complète
  const metrics = useCallback(() => {
    const el = trackRef.current;
    const kids = el?.children;
    if (!el || !kids || itemCount === 0 || kids.length < itemCount * LOOP_COPIES) return null;
    const first = kids[0] as HTMLElement;
    const step = (kids[1] as HTMLElement | undefined)
      ? (kids[1] as HTMLElement).offsetLeft - first.offsetLeft
      : 0;
    const set = (kids[itemCount] as HTMLElement).offsetLeft - first.offsetLeft;
    // Position de défilement qui centre la carte k de la piste
    const center = (k: number): number =>
      (kids[k] as HTMLElement).offsetLeft + first.offsetWidth / 2 - el.clientWidth / 2;
    return { el, step, set, center };
  }, [itemCount]);

  const jump = (el: HTMLElement, x: number): void => {
    const prev = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto';
    el.scrollLeft = x;
    el.style.scrollBehavior = prev;
  };

  // Index de piste (0..n*copies-1) de la carte la plus proche du centre
  const trackIndex = useCallback(() => {
    const m = metrics();
    if (!m || m.step <= 0) return null;
    return Math.round((m.el.scrollLeft - m.center(0)) / m.step);
  }, [metrics]);

  const measure = useCallback(() => {
    const k = trackIndex();
    if (k === null) return;
    setActive(((k % itemCount) + itemCount) % itemCount);
  }, [trackIndex, itemCount]);

  // Ramène la position dans la copie du milieu (saut d'une ou plusieurs listes entières)
  const recenter = useCallback(() => {
    const m = metrics();
    if (!m || m.set <= 0) return;
    const mid = m.center(MIDDLE * itemCount);
    const shift = Math.round((m.el.scrollLeft - mid) / m.set);
    if (shift !== 0) jump(m.el, m.el.scrollLeft - shift * m.set);
  }, [metrics, itemCount]);

  const onScroll = useCallback(() => {
    if (spinningRef.current) return;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(measure);
    clearTimeout(settle.current);
    settle.current = setTimeout(recenter, 140);
  }, [measure, recenter]);

  // Départ sur la 1re carte de la copie du milieu, avant le premier affichage
  useLayoutEffect(() => {
    const m = metrics();
    if (!m) return;
    jump(m.el, m.center(MIDDLE * itemCount));
    setActive(0);
  }, [metrics, itemCount]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      clearTimeout(settle.current);
    },
    []
  );

  // Va à la carte `index` par le chemin le plus court
  const goTo = useCallback(
    (index: number) => {
      const m = metrics();
      const k = trackIndex();
      if (!m || k === null) {
        setActive(index);
        return;
      }
      let delta = index - (((k % itemCount) + itemCount) % itemCount);
      if (delta > itemCount / 2) delta -= itemCount;
      if (delta < -itemCount / 2) delta += itemCount;
      m.el.scrollTo({ left: m.center(k + delta) });
    },
    [metrics, trackIndex, itemCount]
  );

  const spinTo = useCallback(
    (index: number, ms: number) => {
      const m = metrics();
      const k = trackIndex();
      if (!m || k === null || ms <= 0) {
        // Pas de mise en page (tests) ou animations coupées : sélection directe
        if (m && k !== null)
          jump(m.el, m.center(k - (((k % itemCount) + itemCount) % itemCount) + index));
        setActive(index);
        return;
      }
      recenter();
      const from = m.el.scrollLeft;
      const k0 = trackIndex() ?? k;
      const current = ((k0 % itemCount) + itemCount) % itemCount;
      // Un tour complet + la distance jusqu'à la carte tirée
      const forward = itemCount + ((index - current + itemCount) % itemCount);
      const to = m.center(k0 + forward);
      const el = m.el;
      const snap = el.style.scrollSnapType;
      el.style.scrollSnapType = 'none'; // sinon le navigateur recale pendant l'animation
      spinningRef.current = true;
      setSpinning(true);
      const t0 = performance.now();
      const tick = (now: number): void => {
        const t = Math.min(1, (now - t0) / ms);
        jump(el, from + (to - from) * easeOutQuart(t));
        if (t < 1) {
          frame.current = requestAnimationFrame(tick);
          return;
        }
        el.style.scrollSnapType = snap;
        spinningRef.current = false;
        setSpinning(false);
        setActive(index);
        recenter();
      };
      frame.current = requestAnimationFrame(tick);
    },
    [metrics, trackIndex, recenter, itemCount]
  );

  return { trackRef, active, spinning, onScroll, goTo, spinTo };
}
