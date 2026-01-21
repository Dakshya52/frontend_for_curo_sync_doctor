import { useEffect, useMemo, useState } from 'react'

import AssignmentControlsCard from './doctorConsole/AssignmentControlsCard.jsx'
import AuthCard from './doctorConsole/AuthCard.jsx'
import CallControlsCard from './doctorConsole/CallControlsCard.jsx'
import PrescriptionBuilderCard from './doctorConsole/PrescriptionBuilderCard.jsx'
import SummaryCard from './doctorConsole/SummaryCard.jsx'
import TopBar from './doctorConsole/TopBar.jsx'

import { callActionMessages } from './doctorConsole/constants.js'
import { normalizeField } from './doctorConsole/formatters.js'
import { readStoredAuth, writeStoredAuth } from './doctorConsole/storage.js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

const createEmptyPrescriptionItem = (options) => ({
  medicineCode: '',
  frequency: '',
  durationKey:
    options?.durations?.length ? `${options.durations[0].value}|${options.durations[0].unit}` : '',
  dosage: '',
  customLabel: '',
})

export default function DoctorConsole() {
  const [auth, setAuth] = useState(() => readStoredAuth())
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
    writeStoredAuth(auth)
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
        if (controller.signal.aborted || error?.name === 'AbortError') return
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
      if (!payload.intake) {
        setSummary((prev) => {
          if (prev && prev.status === 'closed') return prev
          return null
        })
        resetPrescriptionForm()
        setStatus({
          message: payload.message ?? 'No available patient intake records',
          tone: 'idle',
        })
        return
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

  const handleDebugSnapshot = async () => {
    try {
      const response = await authorizedFetch(`${API_BASE_URL}/api/patient-intake/debug/snapshot`)
      const payload = await response.json().catch(() => ({}))
      console.log('Doctor intake debug snapshot:', payload)
      setStatus({ message: 'Debug snapshot logged to console.', tone: 'success' })
    } catch (error) {
      setStatus({ message: error.message ?? 'Unable to fetch debug snapshot', tone: 'error' })
    }
  }

  const handleSkipSummary = async () => {
    if (!summary) {
      setStatus({ message: 'No active summary to skip.', tone: 'error' })
      return
    }
    if (!summary.id) {
      setStatus({ message: 'This summary is missing an intake ID.', tone: 'error' })
      return
    }
    setStatus({ message: 'Releasing summary back to the queue…', tone: 'loading' })
    try {
      const response = await authorizedFetch(
        `${API_BASE_URL}/api/patient-intake/by-id/${encodeURIComponent(summary.id)}/skip`,
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
    setPrescriptionItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item
        if (field === 'medicineCode') {
          const medicine = medicineMap.get(value)
          return {
            ...item,
            medicineCode: value,
            // prefill dosage for known meds; keep existing for custom
            dosage: value === 'custom' ? item.dosage : medicine?.defaultDosage ?? item.dosage,
          }
        }
        return { ...item, [field]: value }
      }),
    )
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
    if (!summary.id) {
      setPrescriptionStatus({ message: 'This summary is missing an intake ID.', tone: 'error' })
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
          medicineCode: item.medicineCode || 'custom',
          customLabel: item.medicineCode === 'custom' ? item.customLabel : undefined,
          dosage: item.dosage || medicine?.defaultDosage || 'As directed',
          frequency: item.frequency,
          durationValue: Number(durationValueRaw ?? 0),
          durationUnit,
        }
      })

      const response = await authorizedFetch(`${API_BASE_URL}/api/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          intakeId: summary.id,
          items, 
          notes 
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to create prescription')
      }

      setPrescriptionStatus({ message: 'Prescription sent. Consult marked closed.', tone: 'success' })
      setSummary((prev) => (prev ? { ...prev, status: 'closed' } : prev))
      resetPrescriptionForm()
      await fetchNextSummary()
    } catch (error) {
      setPrescriptionStatus({ message: error.message ?? 'Unable to send prescription', tone: 'error' })
    }
  }

  if (!auth) {
    return (
      <AuthCard
        authMode={authMode}
        credentials={credentials}
        authStatus={authStatus}
        onToggleMode={toggleAuthMode}
        onCredentialChange={handleCredentialChange}
        onSubmit={handleAuthSubmit}
      />
    )
  }

  return (
    <section className="doctor-panel">
      <TopBar email={auth.user?.email} onLogout={handleLogout} />

      <AssignmentControlsCard
        status={status}
        summary={summary}
        onLoadNext={fetchNextSummary}
        onSkip={handleSkipSummary}
        onDebug={handleDebugSnapshot}
      />

      <div className="doctor-grid">
        <SummaryCard summary={summary} statusTone={status.tone} />
        <CallControlsCard callStatus={callStatus} onAction={handleCallAction} />
      </div>

      <PrescriptionBuilderCard
        prescriptionItems={prescriptionItems}
        options={options}
        durationOptions={durationOptions}
        maxItems={maxItems}
        canAddRow={canAddRow}
        isPrescriptionReady={isPrescriptionReady}
        notes={notes}
        prescriptionStatus={prescriptionStatus}
        onUpdateItemField={updateItemField}
        onAddRow={addPrescriptionRow}
        onRemoveRow={removePrescriptionRow}
        onNotesChange={(event) => setNotes(event.target.value)}
        onSend={handleSendPrescription}
      />
    </section>
  )
}
