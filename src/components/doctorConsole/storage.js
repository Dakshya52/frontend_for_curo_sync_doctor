const DOCTOR_AUTH_STORAGE_KEY = 'curo-doctor-auth'

const readStoredAuth = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DOCTOR_AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (_error) {
    return null
  }
}

const writeStoredAuth = (auth) => {
  if (typeof window === 'undefined') return
  if (auth) {
    window.localStorage.setItem(DOCTOR_AUTH_STORAGE_KEY, JSON.stringify(auth))
  } else {
    window.localStorage.removeItem(DOCTOR_AUTH_STORAGE_KEY)
  }
}

export { DOCTOR_AUTH_STORAGE_KEY, readStoredAuth, writeStoredAuth }
