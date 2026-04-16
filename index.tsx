import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

interface EBState {
  hasError: boolean;
  error: unknown;
}

interface EBProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<EBProps, EBState> {
  state: EBState = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): EBState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 24,
            fontFamily: 'sans-serif',
            color: '#dc2626',
            background: '#fef2f2',
            minHeight: '100vh',
          }}
        >
          <h2>App crashed - error below:</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
            {String(this.state.error)}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('No #root element found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
