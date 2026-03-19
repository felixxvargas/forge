import { createRoot } from 'react-dom/client';
import { Component, ReactNode } from 'react';

class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: '#1c1228', color: '#f87171', minHeight: '100vh', padding: 40, fontFamily: 'monospace', fontSize: 14 }}>
          <div style={{ color: '#b8d84e', fontSize: 24, marginBottom: 20 }}>⚡ Forge — Runtime Error</div>
          <div style={{ color: '#fbbf24', marginBottom: 10 }}>{(this.state.error as any).message}</div>
          <pre style={{ color: '#f87171', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {(this.state.error as any).stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

async function init() {
  try {
    const { default: App } = await import('./app/App.tsx');
    const root = document.getElementById('root');
    if (root) {
      createRoot(root).render(
        <RootErrorBoundary>
          <App />
        </RootErrorBoundary>
      );
    }
  } catch (e: any) {
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `
        <div style="background:#1c1228;color:#f87171;min-height:100vh;padding:40px;font-family:monospace;font-size:14px;">
          <div style="color:#b8d84e;font-size:24px;margin-bottom:20px;">⚡ Forge — Import Error</div>
          <div style="color:#fbbf24;margin-bottom:10px;">${e.message}</div>
          <pre style="color:#f87171;white-space:pre-wrap;word-break:break-all;">${e.stack}</pre>
        </div>
      `;
    }
  }
}

init();
