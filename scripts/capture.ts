import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { OpenMeteoSource } from './sources/OpenMeteoSource'
import { HistoricalAverageSource } from './sources/HistoricalAverageSource'
import type { ForecastSnapshot } from './types/weather'
import { todayInStJohns, addDays } from './lib/timezone'

const LEAD_TIMES = [1, 2, 7, 14] as const
const SNAPSHOTS_DIR = join(process.cwd(), 'data', 'snapshots')
const OBSERVATIONS_DIR = join(process.cwd(), 'data', 'observations')

function readJson<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as T
  } catch {
    return null
  }
}

function writeJson(filePath: string, data: unknown): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

function mergeSnapshots(
  existing: ForecastSnapshot[],
  incoming: ForecastSnapshot[],
): ForecastSnapshot[] {
  const key = (s: ForecastSnapshot) => `${s.source}:${s.leadTimeDays}`
  const map = new Map(existing.map((s) => [key(s), s]))
  for (const s of incoming) map.set(key(s), s)
  return Array.from(map.values())
}

async function captureForecasts(
  today: string,
  openMeteo: OpenMeteoSource,
  historical: HistoricalAverageSource,
) {
  mkdirSync(SNAPSHOTS_DIR, { recursive: true })

  for (const leadTimeDays of LEAD_TIMES) {
    const targetDate = addDays(today, leadTimeDays)
    console.log(`\nLead ${leadTimeDays}d → target ${targetDate}`)

    const filePath = join(SNAPSHOTS_DIR, `${targetDate}.json`)
    const existing = readJson<ForecastSnapshot[]>(filePath) ?? []
    const incoming: ForecastSnapshot[] = []

    const forecast = await openMeteo.fetchForecast(targetDate, leadTimeDays)
    if (forecast) {
      incoming.push(forecast)
      console.log(`  forecast: ${forecast.highTempC}°C, ${forecast.sky}, ${forecast.precipMm}mm`)
    } else {
      console.warn(`  forecast: no data`)
    }

    const hasBaseline = existing.some((s) => s.source === 'historical-average')
    if (!hasBaseline) {
      const baseline = await historical.fetchHistoricalBaseline(targetDate)
      if (baseline) {
        incoming.push(baseline)
        console.log(
          `  baseline: ${baseline.highTempC}°C, ${baseline.sky}, ${baseline.precipMm}mm`,
        )
      }
    }

    if (incoming.length > 0) {
      const merged = mergeSnapshots(existing, incoming)
      writeJson(filePath, merged)
      console.log(`  saved ${merged.length} snapshots`)
    }
  }
}

async function captureObservations(today: string, openMeteo: OpenMeteoSource) {
  mkdirSync(OBSERVATIONS_DIR, { recursive: true })

  // Fetch observations for any past target dates that have snapshots but no observation yet.
  // Open-Meteo archive typically has a ~5 day lag, so we look back up to 30 days.
  for (let daysAgo = 6; daysAgo <= 30; daysAgo++) {
    const targetDate = addDays(today, -daysAgo)
    const snapshotPath = join(SNAPSHOTS_DIR, `${targetDate}.json`)
    if (!existsSync(snapshotPath)) continue

    const obsPath = join(OBSERVATIONS_DIR, `${targetDate}.json`)
    if (existsSync(obsPath)) continue // already have it

    console.log(`\nFetching observation for past date: ${targetDate}`)
    const obs = await openMeteo.fetchObservation(targetDate)
    if (obs) {
      writeJson(obsPath, obs)
      console.log(`  observed: ${obs.highTempC}°C, ${obs.sky}, ${obs.precipMm}mm`)
    } else {
      console.warn(`  no observation data yet for ${targetDate}`)
    }
  }
}

async function run() {
  const today = todayInStJohns()
  console.log(`Capture run — St. John's date: ${today}`)

  const openMeteo = new OpenMeteoSource()
  const historical = new HistoricalAverageSource()

  console.log('\n=== Forecasts ===')
  await captureForecasts(today, openMeteo, historical)

  console.log('\n=== Observations ===')
  await captureObservations(today, openMeteo)

  console.log('\nDone.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
