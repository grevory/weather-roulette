import { HistoricalAverageSource } from './HistoricalAverageSource'

describe('HistoricalAverageSource.fetchHistoricalBaseline', () => {
  const source = new HistoricalAverageSource()

  it('returns a snapshot for a summer date', async () => {
    const snapshot = await source.fetchHistoricalBaseline('2024-07-15')
    expect(snapshot).not.toBeNull()
    expect(snapshot?.targetDate).toBe('2024-07-15')
    expect(snapshot?.source).toBe('historical-average')
    expect(snapshot?.highTempC).toBeGreaterThan(15) // July avg is ~20°C
    expect(snapshot?.sky).toBe('partly-cloudy')
  })

  it('returns a snapshot for a winter date', async () => {
    const snapshot = await source.fetchHistoricalBaseline('2024-01-20')
    expect(snapshot).not.toBeNull()
    expect(snapshot?.highTempC).toBeLessThan(5) // January avg is ~-0.5°C
    expect(snapshot?.sky).toBe('overcast')
  })

  it('covers all 12 months without throwing', async () => {
    for (let m = 1; m <= 12; m++) {
      const date = `2024-${String(m).padStart(2, '0')}-15`
      const snapshot = await source.fetchHistoricalBaseline(date)
      expect(snapshot).not.toBeNull()
    }
  })

  it('is deterministic — same date always returns same values', async () => {
    const a = await source.fetchHistoricalBaseline('2024-08-10')
    const b = await source.fetchHistoricalBaseline('2024-08-10')
    expect(a?.highTempC).toBe(b?.highTempC)
    expect(a?.sky).toBe(b?.sky)
    expect(a?.precipMm).toBe(b?.precipMm)
  })
})

describe('HistoricalAverageSource.fetchForecast', () => {
  it('always returns null', async () => {
    const source = new HistoricalAverageSource()
    expect(await source.fetchForecast('2024-07-15', 1)).toBeNull()
  })
})
