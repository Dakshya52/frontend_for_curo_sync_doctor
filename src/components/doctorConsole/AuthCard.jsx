import { normalizeField } from './formatters.js'

export default function AuthCard({ authMode, credentials, authStatus, onToggleMode, onCredentialChange, onSubmit }) {
  return (
    <section className="doctor-panel">
      <header>
        <p className="eyebrow">Doctor console</p>
        <h2>Create an account or log in to start reviewing summaries.</h2>
        <p className="subtitle">
          New here? Register with your name, work email, and a password. Returning doctors can sign in instantly.
        </p>
      </header>

      <article className="card auth-card">
        <header>
          <h3>Secure credentials</h3>
          <p>We store hashed passwords only. Keep them private.</p>
        </header>
        <div className="auth-toggle">
          <button type="button" className={authMode === 'login' ? 'primary' : 'ghost'} onClick={() => onToggleMode('login')}>
            Sign in
          </button>
          <button
            type="button"
            className={authMode === 'register' ? 'primary' : 'ghost'}
            onClick={() => onToggleMode('register')}
          >
            Register
          </button>
        </div>

        <form className="lookup-form" onSubmit={onSubmit}>
          {authMode === 'register' && (
            <>
              <label className="field-label" htmlFor="doctorName">
                Full name
              </label>
              <input
                id="doctorName"
                name="name"
                value={credentials.name}
                onChange={onCredentialChange}
                placeholder="Dr. Jane Doe"
                autoComplete="name"
              />
            </>
          )}

          <label className="field-label" htmlFor="doctorEmail">
            Work email
          </label>
          <input
            id="doctorEmail"
            name="email"
            value={credentials.email}
            onChange={onCredentialChange}
            placeholder="you@clinic.com"
            autoComplete="email"
          />

          <label className="field-label" htmlFor="doctorPassword">
            Password
          </label>
          <input
            id="doctorPassword"
            name="password"
            type="password"
            value={credentials.password}
            onChange={onCredentialChange}
            placeholder="Create a strong password"
            autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
          />

          <button type="submit" className="primary">
            {authMode === 'register' ? 'Create account & continue' : 'Sign in'}
          </button>
        </form>

        <p className={`summary-status tone-${authStatus.tone}`}>{normalizeField(authStatus.message)}</p>
      </article>
    </section>
  )
}
