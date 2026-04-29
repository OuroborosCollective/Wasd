import React, { Component, ComponentType, ErrorInfo, ReactNode } from 'react';

interface DebugMonitorState {
  hasError: boolean;
  error: Error | null;
}

/**
 * High-Order-Component zur Laufzeit-Überwachung und automatisierten Fehleranalyse.
 * Diese Komponente fängt Render-Fehler ab und leitet sie an den rekursiven Fix-Prozess weiter.
 */
export function withDebugMonitor<P extends object>(
  WrappedComponent: ComponentType<P>,
  componentName: string = WrappedComponent.displayName || WrappedComponent.name || 'AnonymousComponent'
) {
  return class DebugMonitor extends Component<P, DebugMonitorState> {
    constructor(props: P) {
      super(props);
      this.state = {
        hasError: false,
        error: null
      };
    }

    static getDerivedStateFromError(error: Error): DebugMonitorState {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
      this.reportErrorToFixProcess(error, errorInfo);
    }

    private async reportErrorToFixProcess(error: Error, errorInfo: ErrorInfo) {
      const errorLog = {
        source: 'DebugMonitorHOC',
        component: componentName,
        timestamp: new Date().toISOString(),
        errorMessage: error.message,
        errorStack: error.stack,
        componentStack: errorInfo.componentStack,
        propsAtCrash: this.props,
        stateAnalysis: this.analyzeStateInconsistency(error, errorInfo),
        remediationSuggestion: this.generateRemediationSuggestion(error)
      };

      // Ausgabe in die Konsole für lokale Entwicklung
      console.error(`[DEBUG-MONITOR][${componentName}] CRASH DETECTED:`, errorLog);

      // Persistierung im globalen Fehler-Log für den rekursiven Fix-Prozess
      try {
        const response = await fetch('/api/debug/recursive-fix-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorLog),
        });
        
        if (!response.ok) {
          throw new Error('Failed to send log to server');
        }
      } catch (e) {
        // Fallback: Schreiben in ein globales Window-Objekt, falls API nicht erreichbar
        (window as any).__RECURSIVE_FIX_INPUT__ = (window as any).__RECURSIVE_FIX_INPUT__ || [];
        (window as any).__RECURSIVE_FIX_INPUT__.push(errorLog);
      }
    }

    private analyzeStateInconsistency(error: Error, errorInfo: ErrorInfo): string {
      const stack = error.stack || '';
      const msg = error.message.toLowerCase();

      if (msg.includes('undefined') || msg.includes('null')) {
        return 'NULL_POINTER_DEREFERENCE: Accessing property of undefined state object.';
      }
      if (stack.includes('useState') || stack.includes('useEffect')) {
        return 'HOOK_EXECUTION_ERROR: Potential violation of hook rules or invalid dependency array.';
      }
      if (msg.includes('map is not a function')) {
        return 'TYPE_MISMATCH: State expected Array but received something else.';
      }
      return 'UNKNOWN_STATE_INCONSISTENCY: Requires deep inspection of render cycle.';
    }

    private generateRemediationSuggestion(error: Error): string {
      const msg = error.message.toLowerCase();

      if (msg.includes('undefined')) {
        return 'Apply optional chaining (?.) and provide default values for state initialization.';
      }
      if (msg.includes('render')) {
        return 'Check if component is attempting to render a plain object as a child.';
      }
      return 'Inspect component lifecycle for race conditions between async data fetching and rendering.';
    }

    render() {
      if (this.state.hasError) {
        return (
          <div style={{
            padding: '1rem',
            border: '2px solid #ff0000',
            backgroundColor: '#1a1a1a',
            color: '#ff4444',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}>
            <h3>[DebugMonitor] Runtime Error in {componentName}</h3>
            <p>{this.state.error?.message}</p>
            <small>Data sent to recursive-fix-engine.</small>
          </div>
        );
      }

      return <WrappedComponent {...this.props} />;
    }
  };
}

export default withDebugMonitor;