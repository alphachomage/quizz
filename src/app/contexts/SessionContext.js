// SessionContext.js — compte local connecté (ou mode invité), consommé via useSession().
import { createContext, createElement, useCallback, useContext, useState } from 'react';

import { currentSession, disconnect } from '@lib/accounts.js';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(() => currentSession());

  const deconnexion = useCallback(() => {
    disconnect();
    setSession(null);
  }, []);

  const valeur = {
    session,
    setSession,
    deconnexion,
    estInvite: !!(session && session.guest), // invité : pas d'XP, badges, titres ni classement
  };
  return createElement(SessionContext.Provider, { value: valeur }, children);
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession doit être utilisé sous <SessionProvider>');
  return ctx;
}
