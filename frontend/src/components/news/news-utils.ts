export function relativeTime(value: string) {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export function categoryAccent(category: string) {
  switch (category) {
    case 'mergers':
      return 'var(--accent-cyan)'
    case 'earnings':
      return 'var(--accent-amber)'
    case 'geopolitics':
      return 'var(--accent-rose)'
    case 'markets':
      return 'var(--accent-violet)'
    case 'macro':
      return 'var(--accent-primary)'
    case 'privateequity':
      return 'var(--accent-emerald)'
    case 'fintech':
      return 'var(--accent-cyan)'
    case 'ipo':
      return 'var(--accent-amber)'
    default:
      return 'var(--text-secondary)'
  }
}

export function categoryLabel(category: string) {
  switch (category) {
    case 'mergers':
      return 'M&A'
    case 'privateequity':
      return 'PE & LBO'
    default:
      return category.charAt(0).toUpperCase() + category.slice(1)
  }
}
