import { useEffect, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

const callActionMessages = {
  audio: 'Dialing patient via secure line…',
  video: 'Sending video consult invitation…',
  end: 'Consult marked as completed.',
  escalate: 'Escalation sent to physical visit coordinator.',
}

const summaryDateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const normalizeField = (value) => {
  if (value === null || value === undefined || value === '') {
    return '—'
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch (_error) {
      return '[object]'
    }
  }
  return value
}

const parseRedFlags = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  return String(value)
    .split(/[\,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export default function DoctorConsole() {
  const [callId, setCallId] = useState('')
  const [status, setStatus] = useState({ message: 'Enter a call ID or load the latest record.', tone: 'idle' })
  const [summary, setSummary] = useState(null)
  const [callStatus, setCallStatus] = useState('Standing by for the next action.')

  const setSummaryState = (message, tone = 'idle') => setStatus({ message, tone })

  const requestSummary = async (endpoint, loadingMessage) => {
    try {
      setSummaryState(loadingMessage, 'loading')
      const response = await fetch(endpoint)
      if (!response.ok) {
        const details = await response.json().catch(() => ({}))
        throw new Error(details.error ?? 'Unable to fetch patient summary')
      }
      const payload = await response.json()
      setSummary(payload.intake)
      setSummaryState('Summary synced from MongoDB', 'success')
    } catch (error) {
      setSummary(null)
      setSummaryState(error.message ?? 'Unable to fetch summary', 'error')
    }
  }

  const handleLookup = (event) => {
    event.preventDefault()
    if (!callId.trim()) {
      setSummaryState('Enter a call ID before fetching a summary.', 'error')
      return
    }
    requestSummary(
      `${API_BASE_URL}/api/patient-intake/by-call/${encodeURIComponent(callId.trim())}`,
      `Fetching summary for ${callId.trim()}…`,
    )
  }

  useEffect(() => {
    requestSummary(`${API_BASE_URL}/api/patient-intake/latest`, 'Loading most recent intake…')
  }, [])

  const handleCallAction = (action) => {
    setCallStatus(callActionMessages[action] ?? 'Action triggered.')
  }

  return (
    <section className="doctor-panel">
      <header>
        <p className="eyebrow">Doctor console</p>
        <h2>Review AI-generated intake and control the call.</h2>
        <p className="subtitle">
          Fetch summaries from MongoDB, validate with medical judgment, and execute one-tap call actions.
        </p>
      </header>

      <article className="card doctor-toolbar">
        <header>
          <h3>Patient summary lookup</h3>
          <p>Pull records by call ID or grab the latest intake.</p>
        </header>
        <form className="lookup-form" onSubmit={handleLookup}>
          <label className="field-label" htmlFor="callIdInput">
            Call ID
          </label>
          <div className="lookup-row">
            <input
              id="callIdInput"
              name="callId"
              value={callId}
              onChange={(event) => setCallId(event.target.value)}
              autoComplete="off"
              placeholder="call_simple_001"
            />
            <button type="submit" className="primary">
              Fetch summary
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => requestSummary(`${API_BASE_URL}/api/patient-intake/latest`, 'Loading most recent intake…')}
            >
              Load latest
            </button>
          </div>
        </form>
        <p className={`summary-status tone-${status.tone}`}>{status.message}</p>
      </article>

      <div className="doctor-grid">
        <article className={`card summary-card tone-${status.tone}`}>
          <header>
            <p className="eyebrow">AI-generated patient summary</p>
            <h3>{summary ? normalizeField(summary.patientName) : 'Waiting for record…'}</h3>
            <p className="meta">
              {summary?.collectedAt
                ? `Updated ${summaryDateFormatter.format(new Date(summary.collectedAt))}`
                : 'No intake timestamp'}
            </p>
          </header>

          <div className="summary-focus">
            <div>
              <p className="field-label">Severity</p>
              <span className="severity-pill">{normalizeField(summary?.severity)}</span>
            </div>
            <div>
              <p className="field-label">Symptoms</p>
              <p>{normalizeField(summary?.symptoms)}</p>
            </div>
          </div>

          <div className="summary-grid">
            <div>
              <p className="field-label">Chief complaint</p>
              <p>{normalizeField(summary?.chiefComplaint)}</p>
            </div>
            <div>
              <p className="field-label">Duration</p>
              <p>{normalizeField(summary?.duration)}</p>
            </div>
            <div>
              <p className="field-label">Associated symptoms</p>
              <p>{normalizeField(summary?.associatedSymptoms)}</p>
            </div>
            <div>
              <p className="field-label">Relevant history</p>
              <p>{normalizeField(summary?.relevantHistory)}</p>
            </div>
            <div>
              <p className="field-label">Current meds</p>
              <p>{normalizeField(summary?.currentMedications)}</p>
            </div>
            <div>
              <p className="field-label">Additional details</p>
              <p>{normalizeField(summary?.additionalDetails)}</p>
            </div>
          </div>

          <div className="redflags">
            <p className="field-label">Red flags</p>
            <ul>
              {parseRedFlags(summary?.redFlags).length === 0 && <li className="muted">No red flags reported</li>}
              {parseRedFlags(summary?.redFlags).map((flag) => (
                <li key={flag}>❌ {flag}</li>
              ))}
            </ul>
          </div>

          <p className="summary-alert">
            The data is generated by AI for scripting only. Please use clinical expertise before diagnosing.
          </p>
        </article>

        <article className="card call-controls">
          <header>
            <p className="eyebrow">Call controls</p>
            <h3>One-tap actions</h3>
            <p className="meta">Always visible for every consult.</p>
          </header>
          <div className="call-actions">
            <button className="primary" onClick={() => handleCallAction('audio')}>
              Call patient
            </button>
            <button className="secondary" onClick={() => handleCallAction('video')}>
              Request video
            </button>
            <button className="ghost" onClick={() => handleCallAction('end')}>
              End consult
            </button>
            <button className="danger" onClick={() => handleCallAction('escalate')}>
              Escalate to physical visit
            </button>
          </div>
          <p className="call-status">{callStatus}</p>
        </article>
      </div>
    </section>
  )
}
