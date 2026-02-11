import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            padding: '2rem',
            fontFamily: 'system-ui, sans-serif',
            background: '#0f0f12',
            color: '#f4f4f5',
          }}
        >
          <h1 style={{ color: '#f87171', marginTop: 0 }}>Something went wrong</h1>
          <pre
            style={{
              background: '#18181c',
              padding: '1rem',
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '0.875rem',
            }}
          >
            {this.state.error.message}
          </pre>
          <p style={{ color: '#a1a1aa' }}>
            Check the browser console (F12 → Console) for more details.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
