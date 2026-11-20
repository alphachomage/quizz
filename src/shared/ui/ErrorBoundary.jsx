// ErrorBoundary.jsx — filet de sécurité global de l'application.
// Si un composant plante pendant le rendu, on affiche un écran de secours
// en français (palette sobre, aucun emoji) au lieu d'un écran noir.
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { erreur: null };
  }

  static getDerivedStateFromError(erreur) {
    return { erreur };
  }

  componentDidCatch(erreur, info) {
    // Détail de l'erreur conservé pour le diagnostic (pas de console en prod).
    this.detail = { message: String(erreur), composant: info?.componentStack };
  }

  render() {
    if (this.state.erreur) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#000000',
            color: '#ECECEC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
            padding: '24px',
          }}
        >
          <div
            style={{
              background: '#26262B',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: '26px',
              padding: '32px',
              maxWidth: '420px',
              textAlign: 'center',
            }}
          >
            <h1 style={{ fontWeight: 400, fontSize: '24px', margin: '0 0 12px' }}>
              Une erreur est survenue
            </h1>
            <p style={{ color: '#9C9C94', margin: '0 0 24px' }}>
              VoltQuiz a rencontré un problème inattendu. Tes données locales sont conservées :
              recharge simplement l'application.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#D9D0B8',
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
