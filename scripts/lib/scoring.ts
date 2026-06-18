import type { ForecastSnapshot, WeatherObservation, Score } from '../types/weather'

interface ScoredErrors {
  tempErrorC: number
  skyCorrect: boolean
  precipErrorMm: number
}

function scoreAgainst(snap: ForecastSnapshot, obs: WeatherObservation): ScoredErrors {
  return {
    tempErrorC: snap.highTempC - obs.highTempC,
    skyCorrect: snap.sky === obs.sky,
    precipErrorMm: snap.precipMm - obs.precipMm,
  }
}

/**
 * Compute a Score for one target date + lead time, given the forecast snapshot,
 * the baseline snapshot, and the actual observation.
 *
 * Returns null if any required input is missing.
 */
export function computeScore(
  forecast: ForecastSnapshot,
  baseline: ForecastSnapshot,
  obs: WeatherObservation,
): Score {
  const f = scoreAgainst(forecast, obs)
  const b = scoreAgainst(baseline, obs)

  const absForecastErr = Math.abs(f.tempErrorC)
  const absBaselineErr = Math.abs(b.tempErrorC)

  const skillScore =
    absBaselineErr === 0
      ? null // undefined when baseline error is zero (perfect baseline — rare)
      : 1 - absForecastErr / absBaselineErr

  return {
    targetDate: forecast.targetDate,
    leadTimeDays: forecast.leadTimeDays,
    source: forecast.source,
    forecast: { highTempC: forecast.highTempC, sky: forecast.sky, ...f },
    baseline: { highTempC: baseline.highTempC, sky: baseline.sky, ...b },
    observation: { highTempC: obs.highTempC, sky: obs.sky, precipMm: obs.precipMm },
    skillScore,
  }
}

/** Mean absolute error over an array of signed errors. */
export function mae(errors: number[]): number {
  if (errors.length === 0) return 0
  return errors.reduce((sum, e) => sum + Math.abs(e), 0) / errors.length
}

/** Root mean squared error. */
export function rmse(errors: number[]): number {
  if (errors.length === 0) return 0
  return Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / errors.length)
}

/** Percentage of correct sky condition calls (0–1). */
export function skyAccuracy(correct: boolean[]): number {
  if (correct.length === 0) return 0
  return correct.filter(Boolean).length / correct.length
}

/**
 * Aggregate skill score across multiple individual scores.
 * Uses MAE ratio rather than averaging individual skill scores.
 */
export function aggregateSkillScore(scores: Score[], target: 'forecast' | 'baseline'): number | null {
  const forecastErrors = scores.map((s) => s.forecast.tempErrorC)
  const baselineErrors = scores.map((s) => s.baseline.tempErrorC)

  const forecastMae = mae(forecastErrors)
  const baselineMae = mae(baselineErrors)

  if (target === 'forecast') {
    return baselineMae === 0 ? null : 1 - forecastMae / baselineMae
  }
  return forecastMae === 0 ? null : 1 - baselineMae / forecastMae
}
