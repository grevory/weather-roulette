import { OpenMeteoSource } from './OpenMeteoSource'

const MOCK_RESPONSE = {
  daily: {
    time: ['2024-06-22', '2024-06-23', '2024-06-24'],
    temperature_2m_max: [18.5, 19.0, 17.2],
    weathercode: [2, 61, 0],
    precipitation_sum: [0, 5.2, 0],
  },
}

function makeFetch(body: unknown, status = 200): typeof globalThis.fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(String(status)),
  })
}

describe('OpenMeteoSource.fetchForecast', () => {
  it('returns a snapshot when the target date is in the response', async () => {
    const source = new OpenMeteoSource(makeFetch(MOCK_RESPONSE))
    const snapshot = await source.fetchForecast('2024-06-22', 1)

    expect(snapshot).not.toBeNull()
    expect(snapshot?.targetDate).toBe('2024-06-22')
    expect(snapshot?.highTempC).toBe(18.5)
    expect(snapshot?.sky).toBe('partly-cloudy') // WMO 2
    expect(snapshot?.precipMm).toBe(0)
    expect(snapshot?.source).toBe('open-meteo')
    expect(snapshot?.leadTimeDays).toBe(1)
  })

  it('returns null when target date is not in response', async () => {
    const source = new OpenMeteoSource(makeFetch(MOCK_RESPONSE))
    const snapshot = await source.fetchForecast('2024-06-30', 1)
    expect(snapshot).toBeNull()
  })

  it('maps rain WMO code correctly', async () => {
    const source = new OpenMeteoSource(makeFetch(MOCK_RESPONSE))
    const snapshot = await source.fetchForecast('2024-06-23', 2)
    expect(snapshot?.sky).toBe('rain') // WMO 61
  })

  it('throws on non-OK HTTP response', async () => {
    const source = new OpenMeteoSource(makeFetch('rate limited', 429))
    await expect(source.fetchForecast('2024-06-22', 1)).rejects.toThrow('429')
  })

  it('returns null when temp is missing', async () => {
    const body = {
      daily: {
        ...MOCK_RESPONSE.daily,
        temperature_2m_max: [null, null, null],
      },
    }
    const source = new OpenMeteoSource(makeFetch(body))
    const snapshot = await source.fetchForecast('2024-06-22', 1)
    expect(snapshot).toBeNull()
  })
})

describe('OpenMeteoSource.fetchHistoricalBaseline', () => {
  it('always returns null (baseline is from HistoricalAverageSource)', async () => {
    const source = new OpenMeteoSource(makeFetch(MOCK_RESPONSE))
    expect(await source.fetchHistoricalBaseline('2024-06-22')).toBeNull()
  })
})
