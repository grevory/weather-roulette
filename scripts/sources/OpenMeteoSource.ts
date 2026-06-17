import type { ForecastSnapshot, WeatherObservation, WeatherSource } from '../types/weather'
import { wmoCodeToSkyCondition } from '../types/wmo'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'
const LAT = 47.5615
const LON = -52.7126
const TZ = 'America%2FSt_Johns'
const DAILY_VARS = 'temperature_2m_max,weathercode,precipitation_sum'

interface DailyResponse {
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

  private async fetchDaily(url: string, targetDate: string): Promise<{
    highTempC: number
    weathercode: number
    precipMm: number
  } | null> {
    const res = await this.fetch(url)
    if (!res.ok) {
      throw new Error(`Open-Meteo error ${res.status}: ${await res.text()}`)
    }
    const data = (await res.json()) as DailyResponse

    const idx = data.daily.time.indexOf(targetDate)
    if (idx === -1) return null

    const highTempC = data.daily.temperature_2m_max[idx]
    const weathercode = data.daily.weathercode[idx]
    const precipMm = data.daily.precipitation_sum[idx]

    if (highTempC === null || highTempC === undefined) return null
    if (weathercode === null || weathercode === undefined) return null

    return { highTempC, weathercode, precipMm: precipMm ?? 0 }
  }

  async fetchForecast(
    targetDate: string,
    leadTimeDays: ForecastSnapshot['leadTimeDays'],
  ): Promise<ForecastSnapshot | null> {
    const url =
      `${FORECAST_URL}?latitude=${LAT}&longitude=${LON}` +
      `&daily=${DAILY_VARS}&timezone=${TZ}` +
      `&start_date=${targetDate}&end_date=${targetDate}`

    const row = await this.fetchDaily(url, targetDate)
    if (!row) return null

    return {
      capturedAt: new Date().toISOString(),
      targetDate,
      leadTimeDays,
      highTempC: row.highTempC,
      sky: wmoCodeToSkyCondition(row.weathercode),
      precipMm: row.precipMm,
      source: 'open-meteo',
    }
  }

  async fetchObservation(targetDate: string): Promise<WeatherObservation | null> {
    const url =
      `${ARCHIVE_URL}?latitude=${LAT}&longitude=${LON}` +
      `&daily=${DAILY_VARS}&timezone=${TZ}` +
      `&start_date=${targetDate}&end_date=${targetDate}`

    const row = await this.fetchDaily(url, targetDate)
    if (!row) return null

    return {
      targetDate,
      fetchedAt: new Date().toISOString(),
      highTempC: row.highTempC,
      sky: wmoCodeToSkyCondition(row.weathercode),
      precipMm: row.precipMm,
    }
  }

  fetchHistoricalBaseline(_targetDate: string): Promise<ForecastSnapshot | null> {
    return Promise.resolve(null)
  }
}
