// features/game/useLatest.ts — ref qui pointe toujours sur la dernière valeur rendue.
// Évite les closures périmées dans les callbacks de timers/effets sans relancer ces effets.
import { useRef } from 'react';
import type { MutableRefObject } from 'react';

export function useLatest<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
