export const safeText = (value) => {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    // When an empty object is passed it's likely the root cause of React "Objects are not valid"
    try {
      if (Object.keys(value).length === 0) {
        // Log once to help identify the source during dev
        // eslint-disable-next-line no-console
        console.warn('safeText: rendering empty object as string', value)
      }
      return JSON.stringify(value)
    } catch (_err) {
      return String(value)
    }
  }
  return String(value)
}
