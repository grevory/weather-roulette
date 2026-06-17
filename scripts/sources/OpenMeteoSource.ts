import type { ForecastSnapshot, WeatherSource } from '../types/weather'
import { wmoCodeToSkyCondition } from '../types/wmo'

const BASE_URL = 'https://api.open-meteo.com/v1/forecast'
const LAT = 47.5615
const LON = -52.7126
const TZ = 'America%2FSt_Johns'

interface OpenMeteoResponse {
  daily: {
    time: string[]
    temperature_2m_max: (number | null)[]
    weathercode: (number | null)[]
    precipitation_sum: (number | null)[]
  }
}

export class OpenMeteoSource implements WeatherSource {
  private readonly fetch: typeof globalThis.fetch

  constructor(fetchFn: typeof globalThis.fetch = globalThis.fetch) {
    this.fetch = fetchFn
  }

  async fetchForecast(
    targetDate: string,
    leadTimeDays: ForecastSnapshot['leadTimeDays'],
  ): Promise<ForecastSnapshot | null> {
    const url =
      `${BASE_URL}?latitude=${LAT}&longitude=${LON}` +
      `&daily=temperature_2m_max,weathercode,precipitation_sum` +
      `&timezone=${TZ}` +
      `&start_date=${targetDate}&end_date=${targetDate}`

    const res = await this.fetch(url)
    if (!res.ok) {
      throw new Error(`Open-Meteo error ${res.status}: ${await res.text()}`)
    }
    const data = (await res.json()) as OpenMeteoResponse

    const idx = data.daily.time.indexOf(targetDate)
    if (idx === -1) return null

    const highTempC = data.daily.temperature_2m_max[idx]
    const weathercode = data.daily.weathercode[idx]
    const precipMm = data.daily.precipitation_sum[idx]

    if (highTempC === null || highTempC === undefined) return null
    if (weathercode === null || weathercode === undefined) return null

    return {
      capturedAt: new Date().toISOString(),
      targetDate,
      leadTimeDays,
      highTempC,
      sky: wmoCodeToSkyCondition(weathercode),
      precipMm: precipMm ?? 0,
      source: 'open-meteo',
    }
  }

  fetchHistoricalBaseline(_targetDate: string): Promise<ForecastSnapshot | null> {
    return Promise.resolve(null)
  }
}
