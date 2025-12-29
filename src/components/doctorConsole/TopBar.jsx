import { normalizeField } from './formatters.js'

export default function TopBar({ email, onLogout }) {
  return (
    <header className="topbar">
      <div>
        <p className="tag">CuroSync</p>
        <h1>Doctor operations — AI-generated summaries with live controls.</h1>
      </div>
      <div className="session-pill">
        <div>
          <p className="field-label">Signed in</p>
          <strong>{normalizeField(email)}</strong>
        </div>
        <button type="button" className="ghost" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  )
}
