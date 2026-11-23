// ErrorBoundary.jsx — filet de sécurité global de l'application.
// Si un composant plante pendant le rendu, on affiche un écran de secours
// en français (palette sobre, aucun emoji) au lieu d'un écran noir.
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { reloadPage } from '@lib/nav.js';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Détail d'erreur conservé pour le diagnostic (champ de classe, comme dans la version JS).
interface ErrorDetail {
  message: string;
  composant?: string;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private detail: ErrorDetail | null = null;
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      error: null,
    };
  }
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      error: error,
    };
  }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Détail de l'erreur conservé pour le diagnostic (pas de console en prod).
    this.detail = {
      message: String(error),
      composant: info.componentStack ?? undefined,
    };
  }
  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#0A1A40',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
            padding: '24px',
          }}
        >
          <div
            style={{
              background: '#1E3FA8',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '26px',
              padding: '32px',
              maxWidth: '420px',
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                fontWeight: 400,
                fontSize: '24px',
                margin: '0 0 12px',
              }}
            >
              Une erreur est survenue
            </h1>
            <p
              style={{
                color: '#B9C8F2',
                margin: '0 0 24px',
              }}
            >
              VoltQuiz a rencontré un problème inattendu. Tes données locales sont conservées :
              recharge simplement l'application.
            </p>
            <button
              onClick={() => reloadPage()}
              style={{
                background: '#FFD23F',
                color: '#141414',
                border: 'none',
                borderRadius: '999px',
                padding: '12px 28px',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              Recharger l'appli
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
