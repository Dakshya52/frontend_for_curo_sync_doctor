import DoctorConsole from './components/DoctorConsole.jsx'

export default function App() {
  return (
    <div className="app-shell">
      {/* <header className="hero" role="banner">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="tag">
              <img className="tag-logo" src="/curo_logo.svg" alt="Curo" />
              Curo Doctor Portal
            </p>
            <h1>Manage AI-generated summaries with live patient controls.</h1>
            <p className="lede">
              Review patient intake summaries, initiate calls, and prescribe medications through a streamlined interface.
            </p>
            <div className="badge-row" aria-label="Highlights">
              <span className="badge">Secure authentication</span>
              <span className="badge">Live call controls</span>
              <span className="badge">Prescription builder</span>
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <img className="hero-logo" src="/curo_logo.svg" alt="" />
          </div>
        </div>
      </header>
 */}
      <main className="viewport">
        <DoctorConsole />
      </main>
{/* 
      <footer className="app-footer">
        <p>
          This portal is for medical professionals only. All consultations must comply with Indian Telemedicine
          Practice Guidelines (2020) and relevant medical regulations.
        </p>
      </footer> */}
    </div>
  )
}
