import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 32,
          background: 'var(--bg)', color: 'var(--text-primary)', textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'rgba(239,68,68,0.1)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 28, marginBottom: 20,
          }}>⚠️</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 24, lineHeight: 1.5 }}>
            The app encountered an unexpected error. Your data is safe.
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: '12px 32px', borderRadius: 12,
              background: 'var(--accent)', color: '#fff',
              border: 'none', fontSize: 14, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reload App
          </button>
          {import.meta.env.DEV && (
            <details style={{ marginTop: 20, fontSize: 11, color: 'var(--text-tertiary)', maxWidth: 300 }}>
              <summary style={{ cursor: 'pointer' }}>Error details (dev only)</summary>
              <pre style={{ marginTop: 8, textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {this.state.error?.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
