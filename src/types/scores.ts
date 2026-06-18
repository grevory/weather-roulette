export type SkyCondition = 'clear' | 'partly-cloudy' | 'overcast' | 'rain' | 'snow'

export interface ScoresFile {
  updatedAt: string
  scores: Score[]
}

export interface Score {
  targetDate: string
  leadTimeDays: 1 | 2 | 7 | 14
  source: 'open-meteo' | 'historical-average'
  forecast: {
    highTempC: number
    sky: SkyCondition
    tempErrorC: number
    skyCorrect: boolean
    precipErrorMm: number
  }
  baseline: {
    highTempC: number
    sky: SkyCondition
    tempErrorC: number
    skyCorrect: boolean
    precipErrorMm: number
  }
  observation: {
    highTempC: number
    sky: SkyCondition
    precipMm: number
  }
  skillScore: number | null
}
