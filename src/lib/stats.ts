import type { Score } from '../types/scores'

export function mae(errors: number[]): number {
  if (errors.length === 0) return 0
  return errors.reduce((sum, e) => sum + Math.abs(e), 0) / errors.length
}

export function skyAccuracy(correct: boolean[]): number {
  if (correct.length === 0) return 0
  return correct.filter(Boolean).length / correct.length
}

export interface LeadTimeSummary {
  leadTimeDays: 1 | 2 | 7 | 14
  count: number
  forecast: { maeTempC: number; skyPct: number }
  baseline: { maeTempC: number; skyPct: number }
  skillScore: number | null
}

export function summariseByLeadTime(scores: Score[]): LeadTimeSummary[] {
  const leads = [1, 2, 7, 14] as const
  return leads.map((lead) => {
    const group = scores.filter((s) => s.leadTimeDays === lead)
    if (group.length === 0) {
      return { leadTimeDays: lead, count: 0, forecast: { maeTempC: 0, skyPct: 0 }, baseline: { maeTempC: 0, skyPct: 0 }, skillScore: null }
    }

    const fMae = mae(group.map((s) => s.forecast.tempErrorC))
    const bMae = mae(group.map((s) => s.baseline.tempErrorC))

    return {
      leadTimeDays: lead,
      count: group.length,
      forecast: {
        maeTempC: fMae,
        skyPct: skyAccuracy(group.map((s) => s.forecast.skyCorrect)),
      },
      baseline: {
        maeTempC: bMae,
        skyPct: skyAccuracy(group.map((s) => s.baseline.skyCorrect)),
      },
      skillScore: bMae === 0 ? null : 1 - fMae / bMae,
    }
  })
}
