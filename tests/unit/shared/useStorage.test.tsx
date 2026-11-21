// Tests du hook useStorage (src/shared/hooks) + stabilité des snapshots de read()
// (src/lib/storage.js). Régression : un snapshot qui change de référence à chaque
// appel de getSnapshot fait boucler useSyncExternalStore -> erreur React #185
// « Maximum update depth exceeded » (appli KO en prod, voir CHANGELOG).
import { act, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { useStorage } from '@shared/hooks/useStorage.js';
import { STORAGE_KEYS, read, write, remove } from '@lib/storage.js';

function Sonde({ cle, defaut }: { cle: string; defaut?: Record<string, number> }): ReactElement {
  const v = useStorage<Record<string, number>>(cle, defaut ?? null);
  return <div data-testid="v">{JSON.stringify(v)}</div>;
}

describe('useStorage (snapshot stable)', () => {
  it('valeur objet stockée : rendu sans boucle infinie (régression #185)', () => {
    window.localStorage.setItem(STORAGE_KEYS.records, JSON.stringify({ a: 1 }));
    render(<Sonde cle={STORAGE_KEYS.records} />);
    expect(screen.getByTestId('v').textContent).toBe('{"a":1}');
  });

  it('valeur absente : renvoie la valeur par défaut', () => {
    render(<Sonde cle={STORAGE_KEYS.records} defaut={{}} />);
    expect(screen.getByTestId('v').textContent).toBe('{}');
  });

  it('read() renvoie la MÊME référence tant que la chaîne brute ne change pas', () => {
    window.localStorage.setItem(STORAGE_KEYS.xp, JSON.stringify({ histoire: 12 }));
    const a = read(STORAGE_KEYS.xp, null);
    const b = read(STORAGE_KEYS.xp, null);
    expect(a).toBe(b);
  });

  it('read() renvoie une nouvelle référence après write()', () => {
    window.localStorage.setItem(STORAGE_KEYS.xp, JSON.stringify({ histoire: 12 }));
    const a = read(STORAGE_KEYS.xp, null);
    write(STORAGE_KEYS.xp, { histoire: 20 });
    const b = read(STORAGE_KEYS.xp, null);
    expect(b).not.toBe(a);
    expect(b).toEqual({ histoire: 20 });
  });

  it('read() renvoie la chaîne brute de l’ancien format (non JSON)', () => {
    window.localStorage.setItem(STORAGE_KEYS.session, 'chaine-brute');
    expect(read(STORAGE_KEYS.session, null)).toBe('chaine-brute');
  });

  it('remove() fait retomber sur la valeur par défaut', () => {
    window.localStorage.setItem(STORAGE_KEYS.xp, JSON.stringify({ histoire: 12 }));
    expect(read(STORAGE_KEYS.xp, null)).toEqual({ histoire: 12 });
    remove(STORAGE_KEYS.xp);
    expect(read(STORAGE_KEYS.xp, 'defaut')).toBe('defaut');
  });

  it('le composant se met à jour quand write() notifie (pas de boucle)', () => {
    window.localStorage.setItem(STORAGE_KEYS.records, JSON.stringify({ a: 1 }));
    render(<Sonde cle={STORAGE_KEYS.records} />);
    expect(screen.getByTestId('v').textContent).toBe('{"a":1}');
    act(() => {
      write(STORAGE_KEYS.records, { a: 2 });
    });
    expect(screen.getByTestId('v').textContent).toBe('{"a":2}');
  });
});
