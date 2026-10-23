import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '24px',
            margin: '20px auto',
            maxWidth: '680px',
            backgroundColor: 'hsl(var(--hsl-b4))',
            borderRadius: '10px',
            border: '1px solid hsl(var(--hsl-red-2))',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'hsl(var(--hsl-red-3))',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '18px',
                flexShrink: 0,
              }}
            >
              <i className="fas fa-exclamation-triangle" />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                {this.props.fallbackTitle || 'Ocorreu um erro ao renderizar este componente'}
              </span>
              <span style={{ fontSize: '12px', color: 'hsl(var(--hsl-l2))' }}>
                Os dados foram protegidos e nenhuma alteração foi perdida.
              </span>
            </div>
          </div>

          {this.state.error && (
            <pre
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: 'hsl(var(--hsl-b6))',
                color: 'hsl(var(--hsl-red-1))',
                fontSize: '11px',
                fontFamily: 'AzeretMono, monospace',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                margin: 0,
              }}
            >
              {this.state.error.message || String(this.state.error)}
            </pre>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={this.handleReload}
              className="btn-osu-big btn-osu-big--rounded"
              style={{ padding: '8px 18px', width: 'auto' }}
            >
              <div className="btn-osu-big__content">
                <span className="btn-osu-big__icon-inline btn-osu-big__icon-inline--left">
                  <i className="fas fa-sync-alt" />
                </span>
                <span>Tentar Novamente</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-osu-big btn-osu-big--rounded-small"
              style={{ padding: '8px 16px', width: 'auto' }}
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
