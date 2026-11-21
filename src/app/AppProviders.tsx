// AppProviders.tsx — compose les 3 providers de l'application (règle R9 : 3 contexts max).
import type { ReactNode } from 'react';
import { SessionProvider } from './contexts/SessionContext.js';
import { PrefsProvider } from './contexts/PrefsContext.js';
import { ThemesProvider } from './contexts/ThemesContext.js';

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <SessionProvider>
      <PrefsProvider>
        <ThemesProvider>{children}</ThemesProvider>
      </PrefsProvider>
    </SessionProvider>
  );
}
