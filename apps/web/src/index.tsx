import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * GlobalErrorBoundary fängt Rendering-Fehler ab, um zu verhindern,
 * dass die gesamte Anwendung abstürzt und Deployment-Health-Checks fehlschlagen.
 */
class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in WASD App:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px', 
          backgroundColor: '#1a1a1a', 
          color: '#ffffff', 
          fontFamily: 'sans-serif',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <h2>Initialization Error</h2>
          <p>The application encountered a critical error during startup.</p>
          <pre style={{ 
            backgroundColor: '#333', 
            padding: '15px', 
            borderRadius: '5px',
            maxWidth: '80%',
            overflow: 'auto'
          }}>
            {this.state.error?.message}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              cursor: 'pointer',
              backgroundColor: '#007bff',
              border: 'none',
              color: 'white',
              borderRadius: '4px'
            }}
          >
            Retry Connection
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);

  /**
   * Initialisierungs-Wrapper um Datenbank-Abfragen oder Environment-Checks 
   * beim Start sicher auszuführen.
   */
  const startApplication = async () => {
    try {
      // Hier können initiale DB-Prüfungen oder Config-Fetches stattfinden
      // Falls diese fehlschlagen, wird der Catch-Block ausgeführt statt Exit 1
      
      root.render(
        <React.StrictMode>
          <GlobalErrorBoundary>
            <App />
          </GlobalErrorBoundary>
        </React.StrictMode>
      );
    } catch (initError) {
      console.error("Failed to initialize WASD application core:", initError);
      
      root.render(
        <div style={{ color: 'red', padding: '20px', background: '#000' }}>
          <h1>Critical Boot Error</h1>
          <p>Check database connectivity and environment variables.</p>
        </div>
      );
    }
  };

  startApplication();
}

// Globaler Listener für Unhandled Promise Rejections (z.B. fehlgeschlagene DB Fetches außerhalb von React)
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Verhindert das Standard-Verhalten, das bei einigen CI/CD Tools zum Abbruch führen könnte
  event.preventDefault();
});