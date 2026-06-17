const TZ = 'America/St_Johns'

/** Returns the current date in St. John's local time as YYYY-MM-DD. */
export function todayInStJohns(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/**
 * Adds `days` calendar days to a YYYY-MM-DD date string.
 * Arithmetic is done in UTC noon to avoid DST edge cases.
 */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number]
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Returns the 1-based month number (1–12) for a YYYY-MM-DD date string. */
export function monthOf(date: string): number {
  const month = Number(date.split('-')[1])
  if (!month) throw new Error(`Invalid date: ${date}`)
  return month
}
