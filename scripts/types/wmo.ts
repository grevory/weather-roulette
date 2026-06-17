import type { SkyCondition } from './weather'

/**
 * Map Open-Meteo WMO 4677 codes to 5-bucket SkyCondition.
 * Code 3 is 'overcast' (not 'partly-cloudy') per Open-Meteo description.
 * Thunderstorm codes 95–99 are treated as rain for scoring.
 */
export function wmoCodeToSkyCondition(code: number): SkyCondition {
  if (code === 0) return 'clear'
  if (code === 1 || code === 2) return 'partly-cloudy'
  if (code === 3 || code === 45 || code === 48) return 'overcast'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95 && code <= 99) return 'rain'
  throw new Error(`Unknown WMO code: ${code}`)
}
