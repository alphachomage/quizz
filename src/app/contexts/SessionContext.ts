// SessionContext.ts — compte local connecté (ou mode invité), consommé via useSession().
import { createContext, createElement, useCallback, useContext, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { currentSession, disconnect } from '@lib/accounts.js';
import type { Session } from '@lib/types.js';

// Session telle que persistée : le mode invité pose `guest: true` (champ historique
// de accounts.ts, non exporté là-bas, redéclaré ici).
export type SessionStockee = Session & { guest?: boolean };

/** Contrat du context consommé via useSession(). */
export interface SessionContextValue {
  session: SessionStockee | null;
  setSession: Dispatch<SetStateAction<SessionStockee | null>>;
  deconnexion: () => void;
  isGuest: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [session, setSession] = useState<SessionStockee | null>(() => currentSession());
  const deconnexion = useCallback(() => {
    disconnect();
    setSession(null);
  }, []);
  const value: SessionContextValue = {
    session,
    setSession,
    deconnexion,
    isGuest: !!(session && session.guest), // invité : pas d'XP, badges, titres ni classement
  };
  return createElement(
    SessionContext.Provider,
    {
      value: value,
    },
    children
  );
}
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession doit être utilisé sous <SessionProvider>');
  return ctx;
}
