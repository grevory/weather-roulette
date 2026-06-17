export type SkyCondition = 'clear' | 'partly-cloudy' | 'overcast' | 'rain' | 'snow'

export interface ScoresFile {
  updatedAt: string
  scores: Score[]
}

export interface Score {
  targetDate: string
  leadTimeDays: 1 | 2 | 7 | 14
  forecast: {
    tempErrorC: number
    skyCorrect: boolean
    precipErrorMm: number
  }
  baseline: {
    tempErrorC: number
    skyCorrect: boolean
    precipErrorMm: number
  }
  skillScore: number | null
}
