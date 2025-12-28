import DoctorConsole from './components/DoctorConsole.jsx'

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="tag">CuroSync</p>
          <h1>Doctor operations — AI-generated summaries with live controls.</h1>
        </div>
      </header>

      <main className="viewport">
        <DoctorConsole />
      </main>
    </div>
  )
}
