import { useEffect, useMemo, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'
const DOCTOR_AUTH_STORAGE_KEY = 'curo-doctor-auth'

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

const createEmptyPrescriptionItem = (options) => ({
  medicineCode: '',
  frequency: '',
  durationKey:
    options?.durations?.length ? `${options.durations[0].value}|${options.durations[0].unit}` : '',
})

const readStoredAuth = (storageKey) => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : null
  } catch (_error) {
    return null
  }
}

export default function DoctorConsole() {
  const [auth, setAuth] = useState(() => readStoredAuth(DOCTOR_AUTH_STORAGE_KEY))
  const [authMode, setAuthMode] = useState('login')
  const [credentials, setCredentials] = useState(() => ({
    name: '',
    email: auth?.user?.email ?? '',
    password: '',
  }))
  const [authStatus, setAuthStatus] = useState({
    message: 'Enter your work email and password to continue.',
    tone: 'idle',
  })
  const [status, setStatus] = useState({
    message: 'Load the next AI summary when you are ready.',
    tone: 'idle',
  })
  const [summary, setSummary] = useState(null)
  const [callStatus, setCallStatus] = useState('Standing by for the next action.')
  const [options, setOptions] = useState({
    medicines: [],
    frequencies: [],
    durations: [],
    maxItemsPerPrescription: 1,
  })
  const [prescriptionItems, setPrescriptionItems] = useState([])
  const [notes, setNotes] = useState('')
  const [prescriptionStatus, setPrescriptionStatus] = useState({
    message: 'Select medicines to compile a prescription.',
    tone: 'idle',
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (auth) {
      window.localStorage.setItem(DOCTOR_AUTH_STORAGE_KEY, JSON.stringify(auth))
    } else {
      window.localStorage.removeItem(DOCTOR_AUTH_STORAGE_KEY)
    }
  }, [auth])

  useEffect(() => {
    if (auth?.user?.email) {
      setCredentials((prev) => ({ ...prev, email: auth.user.email }))
    }
  }, [auth])

  const handleLogout = () => {
    setAuth(null)
    setAuthMode('login')
    setCredentials({ name: '', email: '', password: '' })
    setAuthStatus({ message: 'Enter your work email and password to continue.', tone: 'idle' })
    setStatus({ message: 'Load the next AI summary when you are ready.', tone: 'idle' })
    setSummary(null)
    setPrescriptionItems([])
    setNotes('')
    setPrescriptionStatus({ message: 'Select medicines to compile a prescription.', tone: 'idle' })
  }

  const authorizedFetch = async (url, options = {}) => {
    if (!auth?.token) {
      throw new Error('Login required before calling this endpoint.')
    }
    const headers = {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${auth.token}`,
    }
    const response = await fetch(url, { ...options, headers })
    if (response.status === 401) {
      handleLogout()
      throw new Error('Session expired. Please log in again.')
    }
    return response
  }

  useEffect(() => {
    if (!auth?.token) return
    const controller = new AbortController()
    const loadOptions = async () => {
      try {
        const response = await authorizedFetch(`${API_BASE_URL}/api/prescriptions/options`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error('Unable to load prescription options')
        }
        const data = await response.json()
        setOptions(data)
      } catch (error) {
        console.error('Failed to load options', error)
      }
    }
    loadOptions()
    return () => controller.abort()
  }, [auth])

  useEffect(() => {
    if (!options.medicines.length || prescriptionItems.length > 0) return
    setPrescriptionItems([createEmptyPrescriptionItem(options)])
  }, [options, prescriptionItems.length])

  const medicineMap = useMemo(
    () => new Map(options.medicines.map((medicine) => [medicine.code, medicine])),
    [options.medicines],
  )

  const durationOptions = useMemo(
    () =>
      options.durations.map((duration) => ({
        key: `${duration.value}|${duration.unit}`,
        label: `${duration.value} ${duration.unit}`,
      })),
    [options.durations],
  )

  const completedItems = useMemo(
    () => prescriptionItems.filter((item) => item.medicineCode && item.frequency && item.durationKey),
    [prescriptionItems],
  )

  const isPrescriptionReady = Boolean(summary) && completedItems.length > 0
  const maxItems = options.maxItemsPerPrescription ?? 1
  const canAddRow = prescriptionItems.length < maxItems

  const resetPrescriptionForm = () => {
    if (!options.medicines.length) {
      setPrescriptionItems([])
    } else {
      setPrescriptionItems([createEmptyPrescriptionItem(options)])
    }
    setNotes('')
    setPrescriptionStatus({
      message: 'Select medicines to compile a prescription.',
      tone: 'idle',
    })
  }

  const fetchNextSummary = async () => {
    if (!auth) {
      setStatus({ message: 'Login is required before reviewing summaries.', tone: 'error' })
      return
    }
    setStatus({ message: 'Assigning the next summary…', tone: 'loading' })
    try {
      const response = await authorizedFetch(`${API_BASE_URL}/api/patient-intake/next`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to fetch the next summary')
      }
      setSummary(payload.intake)
      resetPrescriptionForm()
      setStatus({
        message: `Reviewing ${payload.intake.patientName ?? payload.intake.callId}`,
        tone: 'success',
      })
    } catch (error) {
      setSummary(null)
      setStatus({ message: error.message ?? 'Unable to fetch the next summary', tone: 'error' })
    }
  }

  const handleSkipSummary = async () => {
    if (!summary) {
      setStatus({ message: 'No active summary to skip.', tone: 'error' })
      return
    }
    setStatus({ message: 'Releasing summary back to the queue…', tone: 'loading' })
    try {
      const response = await authorizedFetch(
        `${API_BASE_URL}/api/patient-intake/${encodeURIComponent(summary.callId)}/skip`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      )
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to skip the summary')
      }
      setSummary(null)
      resetPrescriptionForm()
      setStatus({ message: 'Summary skipped. Loading a fresh record…', tone: 'success' })
      await fetchNextSummary()
    } catch (error) {
      setStatus({ message: error.message ?? 'Unable to skip summary', tone: 'error' })
    }
  }

  const handleCredentialChange = (event) => {
    const { name, value } = event.target
    setCredentials((prev) => ({ ...prev, [name]: value }))
  }

  const toggleAuthMode = (nextMode) => {
    setAuthMode(nextMode)
    setAuthStatus({
      message:
        nextMode === 'register'
          ? 'Share a few details to create your workspace login.'
          : 'Enter your email and password to continue.',
      tone: 'idle',
    })
  }

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    const trimmedEmail = credentials.email.trim()
    const trimmedName = credentials.name.trim()
    if (!trimmedEmail || !credentials.password.trim()) {
      setAuthStatus({ message: 'Email and password are required.', tone: 'error' })
      return
    }
    if (authMode === 'register' && !trimmedName) {
      setAuthStatus({ message: 'Add your name so the care team recognizes you.', tone: 'error' })
      return
    }
    const endpoint = authMode === 'register' ? 'register' : 'login'
    const body = {
      email: trimmedEmail,
      password: credentials.password,
      role: 'doctor',
    }
    if (authMode === 'register') {
      body.name = trimmedName
    }
    setAuthStatus({
      message: authMode === 'register' ? 'Creating your account…' : 'Signing you in…',
      tone: 'loading',
    })
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error ?? 'Authentication failed')
      }
      setAuth(payload)
      setCredentials((prev) => ({ ...prev, password: '' }))
      setAuthStatus({
        message:
          authMode === 'register'
            ? 'Welcome aboard! You are signed in and can start reviewing summaries.'
            : 'Welcome back. Load the next summary when you are ready.',
        tone: 'success',
      })
      setAuthMode('login')
    } catch (error) {
      setAuthStatus({ message: error.message ?? 'Authentication failed', tone: 'error' })
    }
  }

  const handleCallAction = (action) => {
    setCallStatus(callActionMessages[action] ?? 'Action triggered.')
  }

  const updateItemField = (index, field, value) => {
    setPrescriptionItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)))
  }

  const addPrescriptionRow = () => {
    if (!canAddRow) return
    setPrescriptionItems((prev) => [...prev, createEmptyPrescriptionItem(options)])
  }

  const removePrescriptionRow = (index) => {
    setPrescriptionItems((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSendPrescription = async () => {
    if (!summary) {
      setPrescriptionStatus({ message: 'No active summary selected.', tone: 'error' })
      return
    }
    if (!isPrescriptionReady) {
      setPrescriptionStatus({ message: 'Select medicine, frequency, and duration first.', tone: 'error' })
      return
    }

    try {
      setPrescriptionStatus({ message: 'Sending prescription to patient…', tone: 'loading' })
      const items = completedItems.map((item) => {
        const medicine = medicineMap.get(item.medicineCode)
        const [durationValueRaw, durationUnit] = item.durationKey.split('|')
        return {
          medicineCode: item.medicineCode,
          dosage: medicine?.defaultDosage ?? '',
          frequency: item.frequency,
          durationValue: Number(durationValueRaw ?? 0),
          durationUnit,
        }
      })

      const response = await authorizedFetch(`${API_BASE_URL}/api/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: summary.callId, items, notes }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to create prescription')
      }

      setPrescriptionStatus({ message: 'Prescription sent to the patient portal.', tone: 'success' })
      setSummary(null)
      resetPrescriptionForm()
      await fetchNextSummary()
    } catch (error) {
      setPrescriptionStatus({ message: error.message ?? 'Unable to send prescription', tone: 'error' })
    }
  }

  if (!auth) {
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
            <button
              type="button"
              className={authMode === 'login' ? 'primary' : 'ghost'}
              onClick={() => toggleAuthMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={authMode === 'register' ? 'primary' : 'ghost'}
              onClick={() => toggleAuthMode('register')}
            >
              Register
            </button>
          </div>

          <form className="lookup-form" onSubmit={handleAuthSubmit}>
            {authMode === 'register' && (
              <>
                <label className="field-label" htmlFor="doctorName">
                  Full name
                </label>
                <input
                  id="doctorName"
                  name="name"
                  value={credentials.name}
                  onChange={handleCredentialChange}
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
              onChange={handleCredentialChange}
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
              onChange={handleCredentialChange}
              placeholder="Create a strong password"
              autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
            />

            <button type="submit" className="primary">
              {authMode === 'register' ? 'Create account & continue' : 'Sign in'}
            </button>
          </form>

          <p className={`summary-status tone-${authStatus.tone}`}>
            {normalizeField(authStatus.message)}
          </p>
        </article>
      </section>
    )
  }

  return (
    <section className="doctor-panel">
      <header className="topbar">
        <div>
          <p className="tag">CuroSync</p>
          <h1>Doctor operations — AI-generated summaries with live controls.</h1>
        </div>
        <div className="session-pill">
          <div>
            <p className="field-label">Signed in</p>
            <strong>{normalizeField(auth.user?.email)}</strong>
          </div>
          <button type="button" className="ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <article className="card doctor-toolbar">
        <header>
          <h3>Assignment controls</h3>
          <p>Claim the next intake or hand it back to the queue.</p>
        </header>
        <div className="lookup-form">
          <div className="lookup-row">
            <button type="button" className="primary" onClick={fetchNextSummary}>
              Load next summary
            </button>
            <button type="button" className="ghost" onClick={handleSkipSummary} disabled={!summary}>
              Skip current summary
            </button>
          </div>
        </div>
        <p className={`summary-status tone-${status.tone}`}>
          {normalizeField(status.message)}
        </p>
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
            {summary && (
              <div className="tag-pill">
                <span>{normalizeField(summary.callId ?? 'Unknown call')}</span>
                <span className="divider">•</span>
                <span>{normalizeField(summary.status ?? 'open')}</span>
              </div>
            )}
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
          <p className="call-status">{normalizeField(callStatus)}</p>
        </article>
      </div>

      <article className="card prescription-card">
        <header>
          <p className="eyebrow">Prescription builder</p>
          <h3>Send structured medication plans</h3>
          <p className="meta">
            Choose from the approved formulary, set the dosing cadence, and push the plan to the patient portal.
          </p>
        </header>

        <div className="prescription-grid">
          {prescriptionItems.map((item, index) => (
            <div key={`rx-${index}`} className="prescription-row">
              <div>
                <label className="field-label" htmlFor={`medicine-${index}`}>
                  Medicine
                </label>
                <select
                  id={`medicine-${index}`}
                  value={item.medicineCode}
                  onChange={(event) => updateItemField(index, 'medicineCode', event.target.value)}
                >
                  <option value="">Select medicine</option>
                  {options.medicines.map((medicine) => (
                    <option key={medicine.code} value={medicine.code}>
                      {medicine.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor={`frequency-${index}`}>
                  Frequency
                </label>
                <select
                  id={`frequency-${index}`}
                  value={item.frequency}
                  onChange={(event) => updateItemField(index, 'frequency', event.target.value)}
                >
                  <option value="">Select frequency</option>
                  {options.frequencies.map((frequency) => (
                    <option key={frequency.code} value={frequency.code}>
                      {frequency.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor={`duration-${index}`}>
                  Duration
                </label>
                <select
                  id={`duration-${index}`}
                  value={item.durationKey}
                  onChange={(event) => updateItemField(index, 'durationKey', event.target.value)}
                >
                  <option value="">Select duration</option>
                  {durationOptions.map((duration) => (
                    <option key={duration.key} value={duration.key}>
                      {duration.label}
                    </option>
                  ))}
                </select>
              </div>
              {prescriptionItems.length > 1 && (
                <button type="button" className="ghost" onClick={() => removePrescriptionRow(index)}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="inline-actions">
          <button type="button" className="secondary" onClick={addPrescriptionRow} disabled={!canAddRow}>
            Add another medicine
          </button>
          <span className="muted">
            {prescriptionItems.length}/{maxItems} entries
          </span>
        </div>

        <label className="field-label" htmlFor="notesInput">
          Additional notes (optional)
        </label>
        <textarea
          id="notesInput"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Hydrate well, report if fever crosses 101°F…"
        />

        <div className="lookup-row">
          <button type="button" className="primary" onClick={handleSendPrescription} disabled={!isPrescriptionReady}>
            Send prescription to patient
          </button>
        </div>
        <p className={`summary-status tone-${prescriptionStatus.tone}`}>
          {normalizeField(prescriptionStatus.message)}
        </p>
      </article>
    </section>
  )
}
