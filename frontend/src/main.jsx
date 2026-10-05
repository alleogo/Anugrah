import React, { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted fonts (no Google Fonts request)
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/cinzel';
import './index.css';
import App from './App.jsx';
import ToastProvider from './components/ToastProvider';
import { STORAGE_KEYS, storage } from './utils/helpers';

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    storage.remove(STORAGE_KEYS.user, STORAGE_KEYS.token);
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0c0a07',
            color: '#f9fafb',
            padding: '24px',
            fontFamily:
              "'Plus Jakarta Sans Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: '460px',
              width: '100%',
              background: 'rgba(28, 22, 16, 0.9)',
              border: '1px solid rgba(220, 160, 40, 0.25)',
              borderRadius: '16px',
              padding: '32px 28px',
              textAlign: 'center',
              boxShadow: '0 24px 50px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                fontSize: '24px',
              }}
            >
              ⚠️
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 10px 0', color: '#f3f4f6' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#9ca3af', lineHeight: 1.5, margin: '0 0 24px 0' }}>
              {this.state.error?.message ||
                'An unexpected rendering error occurred. You can reload the page or clear your session cache.'}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-primary"
                style={{ padding: '9px 20px', fontSize: '0.85rem' }}
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="btn-secondary"
                style={{ padding: '9px 18px', fontSize: '0.85rem' }}
              >
                Reset Session
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>
);
