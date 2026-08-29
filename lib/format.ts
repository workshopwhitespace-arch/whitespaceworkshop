const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const inrPreciseFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Rupees, rounded — for tiles, lists and totals at a glance. */
export function inr(value: number) {
  return inrFormatter.format(value)
}

/** Rupees with paise — for line items and invoice-style totals. */
export function inrExact(value: number) {
  return inrPreciseFormatter.format(value)
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateShort(value: Date | string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
