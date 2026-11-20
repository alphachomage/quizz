// SessionContext.js — compte local connecté (ou mode invité), consommé via useSession().
import { createContext, createElement, useCallback, useContext, useState } from 'react';

import { sessionActuelle, deconnecter } from '@lib/comptes.js';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(() => sessionActuelle());

  const deconnexion = useCallback(() => {
    deconnecter();
    setSession(null);
  }, []);

  const valeur = {
    session,
    setSession,
    deconnexion,
    estInvite: !!(session && session.invite), // invité : pas d'XP, badges, titres ni classement
  };
  return createElement(SessionContext.Provider, { value: valeur }, children);
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession doit être utilisé sous <SessionProvider>');
  return ctx;
}
