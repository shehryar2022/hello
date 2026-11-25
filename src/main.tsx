import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface BoundaryState {
  hasError: boolean;
  message: string;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, BoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(err: unknown): BoundaryState {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : 'Unexpected application error',
    };
  }

  componentDidCatch(err: unknown) {
    console.error('App ErrorBoundary caught:', err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="modal" role="alert">
          <div className="card">
            <h2>⚠️ Something went wrong</h2>
            <p className="dim">{this.state.message}</p>
            <div className="acts">
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
