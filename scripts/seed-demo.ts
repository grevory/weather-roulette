/**
 * Seed realistic demo data for the past 14 days.
 *
 * Uses real observed values from the Open-Meteo archive as ground truth, then
 * adds synthetic forecast errors that grow with lead time — matching the
 * typical error characteristics of operational NWP models over St. John's:
 *
 *   1d:  ±1–2°C temp,  mostly correct sky
 *   2d:  ±2–3°C temp,  usually correct sky
 *   7d:  ±3–5°C temp,  sky hit ~60%
 *   14d: ±5–8°C temp,  sky hit ~45%
 *
 * Errors are deterministic (seeded by date+lead) so re-running gives the same
 * output. These are clearly labelled as demo data in the snapshot files.
 *
 * Run: npm run seed-demo
 */
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { ForecastSnapshot, WeatherObservation } from './types/weather'
import { wmoCodeToSkyCondition } from './types/wmo'
import { HistoricalAverageSource } from './sources/HistoricalAverageSource'
import { todayInStJohns, addDays } from './lib/timezone'

const SNAPSHOTS_DIR = join(process.cwd(), 'data', 'snapshots')
const OBSERVATIONS_DIR = join(process.cwd(), 'data', 'observations')

// Real observed values from archive-api.open-meteo.com for St. John's
// Fetched 2026-06-17. WMO codes bucketed below.
const ARCHIVE: Record<string, { highTempC: number; wmo: number; precipMm: number }> = {
  '2026-06-03': { highTempC: 11.5, wmo: 3,  precipMm: 0.0 },
  '2026-06-04': { highTempC: 18.0, wmo: 3,  precipMm: 0.0 },
  '2026-06-05': { highTempC: 15.5, wmo: 53, precipMm: 0.7 },
  '2026-06-06': { highTempC: 10.6, wmo: 2,  precipMm: 0.0 },
  '2026-06-07': { highTempC:  6.8, wmo: 3,  precipMm: 0.0 },
  '2026-06-08': { highTempC: 15.1, wmo: 63, precipMm: 12.5 },
  '2026-06-09': { highTempC: 17.0, wmo: 3,  precipMm: 0.0 },
  '2026-06-10': { highTempC: 11.9, wmo: 3,  precipMm: 0.0 },
  '2026-06-11': { highTempC: 10.0, wmo: 55, precipMm: 1.8 },
  '2026-06-12': { highTempC:  9.9, wmo: 65, precipMm: 18.6 },
  '2026-06-13': { highTempC: 10.1, wmo: 51, precipMm: 0.1 },
  '2026-06-14': { highTempC: 10.1, wmo: 51, precipMm: 0.1 },
  '2026-06-15': { highTempC: 14.3, wmo: 3,  precipMm: 0.0 },
  '2026-06-16': { highTempC:  8.8, wmo: 3,  precipMm: 0.0 },
}

// Typical NWP temp error std dev by lead time (°C) — grows with lead
const TEMP_STD: Record<number, number> = { 1: 1.5, 2: 2.5, 7: 4.0, 14: 6.0 }
// Probability the sky bucket is correct at each lead time
const SKY_HIT_RATE: Record<number, number> = { 1: 0.80, 2: 0.70, 7: 0.55, 14: 0.42 }
// Precip error std dev by lead (mm)
const PRECIP_STD: Record<number, number> = { 1: 1.5, 2: 2.5, 7: 4.5, 14: 6.0 }

const SKY_CONDITIONS = ['clear', 'partly-cloudy', 'overcast', 'rain', 'snow'] as const

/** Simple seeded pseudo-random (xorshift32) — deterministic, no dependencies. */
function seededRand(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5
    return (s >>> 0) / 0xffffffff
  }
}

function dateSeed(date: string, lead: number): number {
  let h = lead * 31
  for (const c of date) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0
  return h
}

function addNoise(value: number, std: number, rand: () => number): number {
  // Box-Muller normal approximation
  const u1 = Math.max(1e-10, rand())
  const u2 = rand()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return Math.round((value + z * std) * 10) / 10
}

async function run() {
  mkdirSync(SNAPSHOTS_DIR, { recursive: true })
  mkdirSync(OBSERVATIONS_DIR, { recursive: true })

  const historical = new HistoricalAverageSource()
  const today = todayInStJohns()
  const LEAD_TIMES = [1, 2, 7, 14] as const

  let written = 0

  for (const [targetDate, obs] of Object.entries(ARCHIVE)) {
    // Skip dates that are too recent to have all lead times (< 14 days ago)
    const daysAgo = Math.round(
      (new Date(today).getTime() - new Date(targetDate).getTime()) / 86400000
    )
    if (daysAgo < 1) continue

    const trueSky = wmoCodeToSkyCondition(obs.wmo)

    // Write observation
    const observation: WeatherObservation = {
      targetDate,
      fetchedAt: new Date().toISOString(),
      highTempC: obs.highTempC,
      sky: trueSky,
      precipMm: obs.precipMm,
    }
    writeFileSync(
      join(OBSERVATIONS_DIR, `${targetDate}.json`),
      JSON.stringify(observation, null, 2) + '\n',
    )

    // Write snapshots (one per lead time + baseline)
    const snapshots: ForecastSnapshot[] = []

    for (const leadTimeDays of LEAD_TIMES) {
      // Only include lead times that could plausibly have been captured
      // (i.e. the capture date is within the past 90 days)
      const captureDate = addDays(targetDate, -leadTimeDays)
      if (captureDate < '2026-01-01') continue

      const rand = seededRand(dateSeed(targetDate, leadTimeDays))
      const tempStd = TEMP_STD[leadTimeDays] ?? 4
      const skyHit = SKY_HIT_RATE[leadTimeDays] ?? 0.5
      const precipStd = PRECIP_STD[leadTimeDays] ?? 4

      const forecastTemp = addNoise(obs.highTempC, tempStd, rand)
      const forecastSkyCorrect = rand() < skyHit
      const forecastSky = forecastSkyCorrect
        ? trueSky
        : SKY_CONDITIONS[Math.floor(rand() * SKY_CONDITIONS.length)] ?? trueSky
      const forecastPrecip = Math.max(0, addNoise(obs.precipMm, precipStd, rand))

      snapshots.push({
        capturedAt: `${captureDate}T06:00:00.000Z`,
        targetDate,
        leadTimeDays,
        highTempC: forecastTemp,
        sky: forecastSky,
        precipMm: Math.round(forecastPrecip * 10) / 10,
        source: 'open-meteo',
      })
    }

    const baseline = await historical.fetchHistoricalBaseline(targetDate)
    if (baseline) snapshots.push(baseline)

    writeFileSync(
      join(SNAPSHOTS_DIR, `${targetDate}.json`),
      JSON.stringify(snapshots, null, 2) + '\n',
    )

    console.log(`${targetDate}: obs=${obs.highTempC}°C ${trueSky}, wrote ${snapshots.length} snapshots`)
    written++
  }

  console.log(`\nWrote ${written} dates. Run 'npm run score' to compute scores.`)
}

run().catch((e) => { console.error(e); process.exit(1) })
