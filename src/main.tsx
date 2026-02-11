import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from './ErrorBoundary'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'

function showFatalError(message: string) {
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `
      <div style="min-height:100vh;padding:2rem;background:#0f0f12;color:#f4f4f5;font-family:system-ui,sans-serif;">
        <h1 style="color:#f87171;">Gradly failed to start</h1>
        <pre style="background:#18181c;padding:1rem;border-radius:8px;overflow:auto;font-size:14px;">${message.replace(/</g, '&lt;')}</pre>
        <p style="color:#a1a1aa;">Open DevTools (F12) → Console for details.</p>
      </div>
    `
  }
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  showFatalError('Root element #root not found')
} else {
  try {
    createRoot(rootEl).render(
      <StrictMode>
        <ErrorBoundary>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </StrictMode>,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    showFatalError(message)
    console.error('Gradly bootstrap error:', err)
  }
}
