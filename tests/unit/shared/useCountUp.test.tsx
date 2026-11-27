// Tests du hook useCountUp (src/shared/hooks) : défilement du score final.
import { act, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCountUp } from '@shared/hooks/useCountUp.js';

function Sonde({ cible, actif }: { cible: number; actif: boolean }): ReactElement {
  return <div data-testid="v">{useCountUp(cible, actif)}</div>;
}

describe('useCountUp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('inactif (animations coupées) : affiche directement la valeur finale', () => {
    render(<Sonde cible={245} actif={false} />);
    expect(screen.getByTestId('v').textContent).toBe('245');
  });

  it('actif : part de 0, passe par des valeurs intermédiaires et finit sur la cible', () => {
    render(<Sonde cible={300} actif />);
    expect(screen.getByTestId('v').textContent).toBe('0');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const milieu = Number(screen.getByTestId('v').textContent);
    expect(milieu).toBeGreaterThan(0);
    expect(milieu).toBeLessThan(300);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('v').textContent).toBe('300');
  });
});
