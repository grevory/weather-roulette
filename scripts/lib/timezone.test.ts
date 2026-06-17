import { todayInStJohns, addDays, monthOf } from './timezone'

describe('todayInStJohns', () => {
  it('returns YYYY-MM-DD format', () => {
    const result = todayInStJohns()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('uses St. John’s timezone for a known UTC time', () => {
    // 2024-03-10T03:00:00Z = 2024-03-09 23:30 NST (UTC-3:30)
    const utcDate = new Date('2024-03-10T03:00:00Z')
    expect(todayInStJohns(utcDate)).toBe('2024-03-09')
  })

  it('is the next calendar day when UTC is ahead of St. John’s midnight', () => {
    // 2024-06-15T02:00:00Z = 2024-06-14 23:30 NDT (UTC-2:30)
    const utcDate = new Date('2024-06-15T02:00:00Z')
    expect(todayInStJohns(utcDate)).toBe('2024-06-14')
  })
})

describe('addDays', () => {
  it('adds positive days', () => {
    expect(addDays('2024-01-30', 3)).toBe('2024-02-02')
  })

  it('handles month rollover', () => {
    expect(addDays('2024-01-31', 1)).toBe('2024-02-01')
  })

  it('handles year rollover', () => {
    expect(addDays('2024-12-31', 1)).toBe('2025-01-01')
  })
})

describe('monthOf', () => {
  it('returns correct month number', () => {
    expect(monthOf('2024-07-15')).toBe(7)
  })

  it('throws on invalid date', () => {
    expect(() => monthOf('not-a-date')).toThrow()
  })
})
