import type { ForecastSnapshot, SkyCondition, WeatherSource } from '../types/weather'
import { monthOf } from '../lib/timezone'

/**
 * St. John's climate normals 1981–2010 (Environment Canada).
 * Index 0 = January, index 11 = December.
 * highTempC: average daily high in °C
 * precipMm: average daily precipitation in mm (monthly total / days)
 * sky: dominant condition for the month
 */
const MONTHLY_NORMALS: Array<{
  highTempC: number
  precipMm: number
  sky: SkyCondition
}> = [
  { highTempC: -0.5, precipMm: 4.3, sky: 'overcast' },  // Jan
  { highTempC: -1.1, precipMm: 3.6, sky: 'overcast' },  // Feb
  { highTempC:  2.2, precipMm: 3.5, sky: 'overcast' },  // Mar
  { highTempC:  6.4, precipMm: 3.5, sky: 'partly-cloudy' }, // Apr
  { highTempC: 11.2, precipMm: 3.2, sky: 'partly-cloudy' }, // May
  { highTempC: 16.1, precipMm: 3.0, sky: 'partly-cloudy' }, // Jun
  { highTempC: 20.2, precipMm: 3.1, sky: 'partly-cloudy' }, // Jul
  { highTempC: 20.5, precipMm: 3.5, sky: 'partly-cloudy' }, // Aug
  { highTempC: 15.9, precipMm: 4.0, sky: 'partly-cloudy' }, // Sep
  { highTempC:  9.7, precipMm: 4.6, sky: 'overcast' },  // Oct
  { highTempC:  4.6, precipMm: 4.7, sky: 'overcast' },  // Nov
  { highTempC:  1.3, precipMm: 4.5, sky: 'overcast' },  // Dec
]

export class HistoricalAverageSource implements WeatherSource {
  fetchForecast(
    _targetDate: string,
    _leadTimeDays: ForecastSnapshot['leadTimeDays'],
  ): Promise<ForecastSnapshot | null> {
    // This source only provides the historical baseline, not lead-time forecasts
    return Promise.resolve(null)
  }

  fetchHistoricalBaseline(targetDate: string): Promise<ForecastSnapshot | null> {
    const month = monthOf(targetDate)
    const normal = MONTHLY_NORMALS[month - 1]
    if (!normal) return Promise.resolve(null)

    return Promise.resolve({
      capturedAt: new Date().toISOString(),
      targetDate,
      leadTimeDays: 1, // baseline is not tied to a lead time; 1 is a placeholder
      highTempC: normal.highTempC,
      sky: normal.sky,
      precipMm: normal.precipMm,
      source: 'historical-average',
    })
  }
}
