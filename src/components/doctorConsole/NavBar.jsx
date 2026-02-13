import { useEffect, useMemo, useRef, useState } from 'react'

import { safeText } from './safeText.js'

const normalizePhone = (value) => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

const getInitials = (user) => {
  const name = typeof user?.name === 'string' ? user.name.trim() : ''
  const source = name || (typeof user?.email === 'string' ? user.email.trim() : '')
  if (!source) return 'U'

  const parts = source
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  const first = parts[0][0] ?? ''
  const last = parts[parts.length - 1][0] ?? ''
  const initials = `${first}${last}`.trim()
  return initials ? initials.toUpperCase() : 'U'
}

export default function NavBar({
  user,
  onLogout,
  onUpdateProfile,
}) {
  const popoverRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    name: user?.name ?? '',
    phoneNumber: user?.phoneNumber ?? '',
  })

  useEffect(() => {
    setDraft({ name: user?.name ?? '', phoneNumber: user?.phoneNumber ?? '' })
  }, [user?.name, user?.phoneNumber])

  useEffect(() => {
    if (!menuOpen) return

    const handlePointerDown = (event) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (!popoverRef.current) return
      if (!popoverRef.current.contains(target)) {
        setMenuOpen(false)
        setEditing(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [menuOpen])

  const displayName = useMemo(() => {
    const name = user?.name?.trim()
    if (name) return name
    const email = user?.email?.trim()
    if (email) return email
    return 'Profile'
  }, [user?.email, user?.name])

  const displayPhone = useMemo(() => normalizePhone(user?.phoneNumber), [user?.phoneNumber])
  const initials = useMemo(() => getInitials(user), [user])

  const handleSave = () => {
    const nextName = (draft.name ?? '').trim()
    const nextPhone = normalizePhone(draft.phoneNumber)

    onUpdateProfile?.({ name: nextName, phoneNumber: nextPhone })
    setEditing(false)
    setMenuOpen(false)
  }

  return (
    <header className="navbar" role="banner">
      <div className="navbar-inner">
        <div className="navbar-left">
          <div className="brand" aria-label="Curo">
            <img className="brand-logo" src="/curo_logo.svg" alt="Curo" />
            <span className="brand-name">Curo</span>
          </div>
        </div>

        <div className="navbar-right">
          <div className="profile" ref={popoverRef}>
            <button
              type="button"
              className="profile-button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={displayName}
              title={displayName}
            >
              <span className="profile-initials" aria-hidden="true">{safeText(initials)}</span>
            </button>

            {menuOpen && (
              <div className="profile-menu" role="menu" aria-label="Profile">
              {!editing ? (
                <>
                  <div className="profile-summary">
                    <p className="field-label">Signed in</p>
                    <strong>{safeText(displayName)}</strong>
                    {displayPhone ? (
                      <p className="muted username-label">
                        Phone number: <strong>{safeText(displayPhone)}</strong>
                      </p>
                    ) : null}
                  </div>

                  <div className="profile-actions">
                    <button type="button" className="ghost" onClick={() => setEditing(true)} role="menuitem">
                      Edit profile
                    </button>
                    <button type="button" className="ghost danger-ghost" onClick={onLogout} role="menuitem">
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <div className="profile-editor">
                  <p className="field-label">Edit profile</p>

                  <label className="field-label" htmlFor="profile-name">
                    Name
                  </label>
                  <input
                    id="profile-name"
                    value={draft.name}
                    onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Your name"
                    autoComplete="name"
                  />

                  <label className="field-label" htmlFor="profile-phone">
                    Phone number
                  </label>
                  <input
                    id="profile-phone"
                    value={draft.phoneNumber}
                    onChange={(event) => setDraft((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                    placeholder="Your phone number"
                    autoComplete="tel"
                  />

                  <div className="profile-actions">
                    <button type="button" className="ghost" onClick={() => setEditing(false)}>
                      Cancel
                    </button>
                    <button type="button" className="primary" onClick={handleSave}>
                      Save
                    </button>
                  </div>
                </div>
              )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
