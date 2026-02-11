import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SignUp() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [signedUp, setSignedUp] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    setLoading(false)
    if (authError) {
      setError(authError.message)
      return
    }
    setSignedUp(true)
  }

  if (signedUp) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-subtitle auth-confirm-message">
            We’ve sent a confirmation link to <strong>{email}</strong>. Please confirm your
            email address to sign in.
          </p>
          <p className="auth-footer" style={{ marginTop: '1rem' }}>
            <Link to="/login">Go to log in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Sign up</h1>
        <p className="auth-subtitle">Create your Gradly account</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error" role="alert">{error}</div>}
          <label className="auth-label">
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="auth-input"
              autoComplete="name"
              required
            />
          </label>
          <label className="auth-label">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="auth-input"
              autoComplete="email"
              required
            />
          </label>
          <label className="auth-label">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="auth-input"
              autoComplete="new-password"
              required
              minLength={6}
            />
          </label>
          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}
