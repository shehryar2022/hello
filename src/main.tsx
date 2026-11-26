import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { recordAppError } from './firebase/errorLog.ts';
import './index.css';

interface BoundaryState {
  hasError: boolean;
  message: string;
  details: string;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, BoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '', details: '' };
  }

  static getDerivedStateFromError(err: unknown): BoundaryState {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : 'Unexpected application error',
      details: err instanceof Error && err.stack ? err.stack : String(err || ''),
    };
  }

  componentDidCatch(err: unknown, info: React.ErrorInfo) {
    console.error('App ErrorBoundary caught:', err);
    recordAppError({
      source: 'runtime',
      message: err instanceof Error ? err.message : 'Unexpected application error',
      details: info?.componentStack || (err instanceof Error ? err.stack : undefined),
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="modal" role="alert">
          <div className="card">
            <h2>⚠️ Something went wrong</h2>
            <p className="dim">{this.state.message}</p>
            {this.state.details && (
              <pre className="err-details" style={{ textAlign: 'left', marginBottom: 12 }}>
                {this.state.details}
              </pre>
            )}
            <div className="acts">
              <button
                type="button"
                className="btn mint"
                onClick={() => {
                  const text = `${this.state.message}\n\n${this.state.details}`;
                  void navigator.clipboard?.writeText(text).catch(() => {});
                }}
              >
                Copy Error
              </button>
              <button
                type="button"
                className="btn gold"
                onClick={() => window.location.reload()}
              >
                Reload Game
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
