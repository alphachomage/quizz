// AppProviders.jsx — compose les 3 providers de l'application (règle R9 : 3 contexts max).
import { SessionProvider } from './contexts/SessionContext.js';
import { PrefsProvider } from './contexts/PrefsContext.js';
import { ThemesProvider } from './contexts/ThemesContext.js';

export default function AppProviders({ children }) {
  return (
    <SessionProvider>
      <PrefsProvider>
        <ThemesProvider>{children}</ThemesProvider>
      </PrefsProvider>
    </SessionProvider>
  );
}
