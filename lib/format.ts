export function formatINR(amount?: number | null): string {
  if (!amount || !Number.isFinite(amount)) return '—'
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)} Cr`
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(2)} L`
  return `₹${amount.toLocaleString('en-IN')}`
}

export function formatPerSqft(pricePerSqft?: number | null): string {
  if (!pricePerSqft || !Number.isFinite(pricePerSqft)) return '—'
  return `₹${Math.round(pricePerSqft).toLocaleString('en-IN')}/sqft`
}

export function formatSqft(n?: number | null): string {
  if (!n || !Number.isFinite(n)) return '—'
  return `${n.toLocaleString('en-IN')} sqft`
}

export function humanizeEnum(value?: string | null): string {
  if (!value) return '—'
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const diff = (Date.now() - t) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  if (diff < 2592000) return `${Math.round(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
