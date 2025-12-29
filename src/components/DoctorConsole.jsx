import { useEffect, useMemo, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'
const DOCTOR_ID_STORAGE_KEY = 'curo-doctor-id'

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

const getStoredDoctorId = () => {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(DOCTOR_ID_STORAGE_KEY) ?? ''
}

export default function DoctorConsole() {
  const [doctorId, setDoctorId] = useState(() => getStoredDoctorId())
  const [status, setStatus] = useState({
    message: 'Identify yourself to pull the next AI summary.',
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
    if (doctorId) {
      window.localStorage.setItem(DOCTOR_ID_STORAGE_KEY, doctorId)
    } else {
      window.localStorage.removeItem(DOCTOR_ID_STORAGE_KEY)
    }
  }, [doctorId])

  useEffect(() => {
    const controller = new AbortController()
    const fetchOptions = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/prescriptions/options`, {
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
    fetchOptions()
    return () => controller.abort()
  }, [])

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
    if (!doctorId) {
      setStatus({ message: 'Enter your doctor ID before loading summaries.', tone: 'error' })
      return
    }
    setStatus({ message: 'Assigning the next summary…', tone: 'loading' })
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/patient-intake/next?doctorId=${encodeURIComponent(doctorId)}`,
      )
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
    if (!doctorId) {
      setStatus({ message: 'Enter your doctor ID before skipping.', tone: 'error' })
      return
    }
    setStatus({ message: 'Releasing summary back to the queue…', tone: 'loading' })
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/patient-intake/${encodeURIComponent(summary.callId)}/skip`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doctorId }),
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
    if (!doctorId) {
      setPrescriptionStatus({ message: 'Provide your doctor ID first.', tone: 'error' })
      return
    }
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

      const response = await fetch(`${API_BASE_URL}/api/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: summary.callId, doctorId, items, notes }),
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

  return (
    <section className="doctor-panel">
      <header>
        <p className="eyebrow">Doctor console</p>
        <h2>Review AI-generated intake, skip if needed, then prescribe with two taps.</h2>
        <p className="subtitle">
          Each assignment locks to your doctor ID. Skipping returns the intake to the queue, prescribing closes it for
          everyone else.
        </p>
      </header>

      <article className="card doctor-toolbar">
        <header>
          <h3>Assignment controls</h3>
          <p>Claim the next intake or hand it back to the queue.</p>
        </header>
        <div className="lookup-form">
          <label className="field-label" htmlFor="doctorIdInput">
            Doctor ID
          </label>
          <input
            id="doctorIdInput"
            name="doctorId"
            value={doctorId}
            onChange={(event) => setDoctorId(event.target.value)}
            placeholder="dr-aurora"
            autoComplete="off"
          />
          <div className="lookup-row">
            <button type="button" className="primary" onClick={fetchNextSummary}>
              Load next summary
            </button>
            <button type="button" className="ghost" onClick={handleSkipSummary} disabled={!summary}>
              Skip current summary
            </button>
          </div>
        </div>
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
            {summary && (
              <div className="tag-pill">
                <span>{summary.callId ?? 'Unknown call'}</span>
                <span className="divider">•</span>
                <span>{summary.status ?? 'open'}</span>
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
          <p className="call-status">{callStatus}</p>
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
        <p className={`summary-status tone-${prescriptionStatus.tone}`}>{prescriptionStatus.message}</p>
      </article>
    </section>
  )
}
