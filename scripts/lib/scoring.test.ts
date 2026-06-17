import { computeScore, mae, rmse, skyAccuracy, aggregateSkillScore } from './scoring'
import type { ForecastSnapshot, WeatherObservation } from '../types/weather'

const obs: WeatherObservation = {
  targetDate: '2024-07-01',
  fetchedAt: '2024-07-06T12:00:00Z',
  highTempC: 20,
  sky: 'partly-cloudy',
  precipMm: 2,
}

const forecast: ForecastSnapshot = {
  capturedAt: '2024-06-30T06:00:00Z',
  targetDate: '2024-07-01',
  leadTimeDays: 1,
  highTempC: 22,
  sky: 'partly-cloudy',
  precipMm: 0,
  source: 'open-meteo',
}

const baseline: ForecastSnapshot = {
  capturedAt: '2024-06-30T06:00:00Z',
  targetDate: '2024-07-01',
  leadTimeDays: 1,
  highTempC: 16,
  sky: 'overcast',
  precipMm: 3.1,
  source: 'historical-average',
}

describe('computeScore', () => {
  it('computes signed temp errors correctly', () => {
    const score = computeScore(forecast, baseline, obs)
    expect(score.forecast.tempErrorC).toBeCloseTo(2)   // 22 - 20
    expect(score.baseline.tempErrorC).toBeCloseTo(-4)  // 16 - 20
  })

  it('scores sky conditions', () => {
    const score = computeScore(forecast, baseline, obs)
    expect(score.forecast.skyCorrect).toBe(true)   // partly-cloudy === partly-cloudy
    expect(score.baseline.skyCorrect).toBe(false)  // overcast !== partly-cloudy
  })

  it('computes skill score: 1 - |forecastErr| / |baselineErr|', () => {
    const score = computeScore(forecast, baseline, obs)
    // 1 - 2/4 = 0.5 (forecast is half the error of baseline)
    expect(score.skillScore).toBeCloseTo(0.5)
  })

  it('returns null skill score when baseline error is zero', () => {
    const perfectBaseline = { ...baseline, highTempC: 20 }
    const score = computeScore(forecast, perfectBaseline, obs)
    expect(score.skillScore).toBeNull()
  })

  it('returns negative skill score when forecast is worse than baseline', () => {
    const badForecast = { ...forecast, highTempC: 30 } // 10°C off vs baseline 4°C off
    const score = computeScore(badForecast, baseline, obs)
    expect(score.skillScore).toBeLessThan(0)
  })
})

describe('mae', () => {
  it('computes mean absolute error', () => {
    expect(mae([2, -4, 0])).toBeCloseTo(2)
  })

  it('returns 0 for empty array', () => {
    expect(mae([])).toBe(0)
  })
})

describe('rmse', () => {
  it('computes root mean squared error', () => {
    expect(rmse([3, -4])).toBeCloseTo(Math.sqrt((9 + 16) / 2))
  })
})

describe('skyAccuracy', () => {
  it('returns fraction correct', () => {
    expect(skyAccuracy([true, false, true, true])).toBeCloseTo(0.75)
  })

  it('returns 0 for empty', () => {
    expect(skyAccuracy([])).toBe(0)
  })
})

describe('aggregateSkillScore', () => {
  it('uses MAE ratio across multiple scores', () => {
    const score1 = computeScore(forecast, baseline, obs)
    const score2 = computeScore({ ...forecast, highTempC: 21 }, baseline, obs)
    const skill = aggregateSkillScore([score1, score2], 'forecast')
    // forecast MAE = (2 + 1) / 2 = 1.5, baseline MAE = 4, skill = 1 - 1.5/4
    expect(skill).toBeCloseTo(1 - 1.5 / 4)
  })
})
