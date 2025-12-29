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

export { normalizeField, parseRedFlags, summaryDateFormatter }
