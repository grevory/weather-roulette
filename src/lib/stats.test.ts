import { mae, skyAccuracy, summariseByLeadTime } from './stats'
import type { Score } from '../types/scores'

describe('mae', () => {
  it('returns mean absolute error', () => {
    expect(mae([2, -4, 0])).toBeCloseTo(2)
  })
  it('returns 0 for empty', () => {
    expect(mae([])).toBe(0)
  })
})

describe('skyAccuracy', () => {
  it('returns fraction correct', () => {
    expect(skyAccuracy([true, false, true, true])).toBeCloseTo(0.75)
  })
})

describe('summariseByLeadTime', () => {
  const makeScore = (lead: 1 | 2 | 7 | 14, fErr: number, bErr: number): Score => ({
    targetDate: '2024-07-01',
    leadTimeDays: lead,
    forecast: { tempErrorC: fErr, skyCorrect: true, precipErrorMm: 0 },
    baseline: { tempErrorC: bErr, skyCorrect: false, precipErrorMm: 1 },
    skillScore: null,
  })

  it('groups scores by lead time', () => {
    const scores = [makeScore(1, 2, 4), makeScore(7, 3, 6)]
    const summaries = summariseByLeadTime(scores)
    const lead1 = summaries.find((s) => s.leadTimeDays === 1)
    const lead7 = summaries.find((s) => s.leadTimeDays === 7)

    expect(lead1?.count).toBe(1)
    expect(lead1?.forecast.maeTempC).toBeCloseTo(2)
    expect(lead1?.skillScore).toBeCloseTo(0.5) // 1 - 2/4

    expect(lead7?.count).toBe(1)
    expect(lead7?.skillScore).toBeCloseTo(0.5) // 1 - 3/6
  })

  it('returns null skill when baseline MAE is zero', () => {
    const scores = [makeScore(1, 2, 0)]
    const summaries = summariseByLeadTime(scores)
    expect(summaries[0]?.skillScore).toBeNull()
  })

  it('returns zero-count entry for missing lead times', () => {
    const summaries = summariseByLeadTime([])
    expect(summaries).toHaveLength(4)
    expect(summaries.every((s) => s.count === 0)).toBe(true)
  })
})
