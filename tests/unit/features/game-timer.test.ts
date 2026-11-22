// Tests du minuteur de question (src/features/game/useTimer.ts) :
// le temps doit être calé sur l'horloge réelle (Date.now), pas sur un compteur
// de setInterval — sinon la barre affichée dérive par rapport au temps réel.
// Avec les fake timers de Vitest, advanceTimersByTime avance AUSSI Date.now().
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTimer } from '@features/game/useTimer.js';

describe('useTimer (calé sur Date.now)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0); // Date.now() = 0 au départ
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('décroît en temps réel : 1 s écoulée au mur = 1 s restante en moins', () => {
    const { result } = renderHook(() => useTimer(true, 10));
    expect(result.current.time).toBe(10);
    act(() => {
      vi.advanceTimersByTime(1000); // +1 s au mur (Date.now avance aussi)
    });
    expect(result.current.time).toBeGreaterThan(8.9);
    expect(result.current.time).toBeLessThanOrEqual(9.01);
  });

  it('ne dérive pas, même si les ticks sont retardés (onglet en arrière-plan)', () => {
    const { result } = renderHook(() => useTimer(true, 10));
    act(() => {
      vi.advanceTimersByTime(5000); // +5 s au mur
    });
    // le temps affiché colle au mur, sans cumul d'erreur d'intervalle
    expect(result.current.time).toBeGreaterThan(4.9);
    expect(result.current.time).toBeLessThanOrEqual(5.01);
  });

  it('appelle onExpire une seule fois à 0', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useTimer(true, 10, onExpire));
    act(() => {
      vi.advanceTimersByTime(10_500);
    });
    expect(result.current.time).toBe(0);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('reset() redémarre à la durée max, calé sur le mur', () => {
    const { result } = renderHook(() => useTimer(true, 10));
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.time).toBeLessThan(6.1);
    act(() => {
      result.current.reset(); // nouvelle question à t=4 s
      vi.advanceTimersByTime(200);
    });
    expect(result.current.time).toBeGreaterThan(9.7); // reparti de 10 s au mur
    expect(result.current.time).toBeLessThanOrEqual(9.81);
  });

  it('ne tourne pas quand active=false', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useTimer(false, 10, onExpire));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.time).toBe(10);
    expect(onExpire).not.toHaveBeenCalled();
  });
});
