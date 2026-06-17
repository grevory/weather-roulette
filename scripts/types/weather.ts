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

/** Actual observed weather for a target date, fetched after the date passes. */
export interface WeatherObservation {
  targetDate: string
  fetchedAt: string
  highTempC: number
  sky: SkyCondition
  precipMm: number
}

/** Scores for one forecast vs the observation for a single target date + lead time. */
export interface Score {
  targetDate: string
  leadTimeDays: 1 | 2 | 7 | 14
  forecast: {
    tempErrorC: number       // signed: forecast - observed
    skyCorrect: boolean
    precipErrorMm: number
  }
  baseline: {
    tempErrorC: number
    skyCorrect: boolean
    precipErrorMm: number
  }
  /** 1 − |forecast temp error| / |baseline temp error|. Positive = forecast wins. */
  skillScore: number | null
}

export interface WeatherSource {
  fetchForecast(
    targetDate: string,
    leadTimeDays: ForecastSnapshot['leadTimeDays'],
  ): Promise<ForecastSnapshot | null>

  fetchHistoricalBaseline(targetDate: string): Promise<ForecastSnapshot | null>

  fetchObservation(targetDate: string): Promise<WeatherObservation | null>
}
