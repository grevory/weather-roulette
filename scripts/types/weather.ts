export type SkyCondition = 'clear' | 'partly-cloudy' | 'overcast' | 'rain' | 'snow'

export interface ForecastSnapshot {
  capturedAt: string
  targetDate: string
  leadTimeDays: 1 | 2 | 7 | 14
  highTempC: number
  sky: SkyCondition
  precipMm: number
  source: 'open-meteo' | 'historical-average'
}

export interface WeatherSource {
  fetchForecast(
    targetDate: string,
    leadTimeDays: ForecastSnapshot['leadTimeDays'],
  ): Promise<ForecastSnapshot | null>

  fetchHistoricalBaseline(targetDate: string): Promise<ForecastSnapshot | null>
}
