'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import type { Locale } from '@/lib/i18n';

type Props = { children: ReactNode; locale?: Locale };
type State = { error: Error | null; runtimeErrors: string[] };

export class AdminErrorBoundary extends Component<Props, State> {
  state: State = { error: null, runtimeErrors: [] };

  private onWindowError = (ev: ErrorEvent) => {
    const msg = `${ev.message}${ev.filename ? `  @ ${ev.filename}:${ev.lineno}:${ev.colno}` : ''}`;
    this.setState((s) => ({ runtimeErrors: [...s.runtimeErrors, msg].slice(-5) }));
  };

  private onUnhandledRejection = (ev: PromiseRejectionEvent) => {
    const reason: unknown = ev.reason;
    let msg: string;
    if (reason instanceof Error) msg = `Unhandled: ${reason.message}\n${reason.stack ?? ''}`;
    else msg = `Unhandled: ${String(reason)}`;
    this.setState((s) => ({ runtimeErrors: [...s.runtimeErrors, msg].slice(-5) }));
  };

  componentDidMount() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.onWindowError);
      window.addEventListener('unhandledrejection', this.onUnhandledRejection);
    }
  }

  componentWillUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('error', this.onWindowError);
      window.removeEventListener('unhandledrejection', this.onUnhandledRejection);
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[admin]', error, info.componentStack);
  }

  render() {
    const isEn = this.props.locale === 'en';
    const runtimeBanner = this.state.runtimeErrors.length > 0 ? (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2147483647,
          background: '#dc2626',
          color: '#fff',
          padding: '10px 14px',
          fontSize: 12,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          maxHeight: '40vh',
          overflow: 'auto',
          boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
          whiteSpace: 'pre-wrap',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          [admin runtime error]{' '}
          <button
            type="button"
            onClick={() => this.setState({ runtimeErrors: [] })}
            style={{ marginLeft: 8, background: '#fff', color: '#dc2626', border: 'none', padding: '2px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
          >
            dismiss
          </button>
        </div>
        {this.state.runtimeErrors.map((m, i) => (
          <div key={i} style={{ marginBottom: 6, borderTop: i ? '1px solid rgba(255,255,255,0.3)' : 'none', paddingTop: i ? 6 : 0 }}>{m}</div>
        ))}
      </div>
    ) : null;

    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
            background: '#fafafa',
          }}
        >
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, color: '#18181b' }}>
              {isEn ? 'Panel error' : 'Грешка в панела'}
            </h1>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#71717a', lineHeight: 1.5 }}>
              {this.state.error.message || (isEn ? 'Please reload the page.' : 'Моля, презареди страницата.')}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
              style={{
                border: 'none',
                borderRadius: 999,
                background: '#18181b',
                color: '#fff',
                padding: '12px 22px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isEn ? 'Reload' : 'Презареди'}
            </button>
          </div>
        </div>
      );
    }
    return (
      <>
        {runtimeBanner}
        {this.props.children}
      </>
    );
  }
}
