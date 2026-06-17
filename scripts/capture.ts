import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { OpenMeteoSource } from './sources/OpenMeteoSource'
import { HistoricalAverageSource } from './sources/HistoricalAverageSource'
import type { ForecastSnapshot } from './types/weather'
import { todayInStJohns, addDays } from './lib/timezone'

const LEAD_TIMES = [1, 2, 7, 14] as const
const DATA_DIR = join(process.cwd(), 'data', 'snapshots')

function loadExisting(targetDate: string): ForecastSnapshot[] {
  const filePath = join(DATA_DIR, `${targetDate}.json`)
  if (!existsSync(filePath)) return []
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as ForecastSnapshot[]
  } catch {
    return []
  }
}

function saveSnapshots(targetDate: string, snapshots: ForecastSnapshot[]): void {
  mkdirSync(DATA_DIR, { recursive: true })
  const filePath = join(DATA_DIR, `${targetDate}.json`)
  writeFileSync(filePath, JSON.stringify(snapshots, null, 2) + '\n', 'utf-8')
  console.log(`Wrote ${snapshots.length} snapshots → ${filePath}`)
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

async function run() {
  const today = todayInStJohns()
  console.log(`Capture run — St. John's date: ${today}`)

  const openMeteo = new OpenMeteoSource()
  const historical = new HistoricalAverageSource()

  // For each lead time, the target date is today + leadTimeDays
  // (we capture the forecast for a future date, lead time = days until it)
  for (const leadTimeDays of LEAD_TIMES) {
    const targetDate = addDays(today, leadTimeDays)
    console.log(`\nLead ${leadTimeDays}d → target ${targetDate}`)

    const existing = loadExisting(targetDate)
    const incoming: ForecastSnapshot[] = []

    const forecast = await openMeteo.fetchForecast(targetDate, leadTimeDays)
    if (forecast) {
      incoming.push(forecast)
      console.log(
        `  forecast: ${forecast.highTempC}°C, ${forecast.sky}, ${forecast.precipMm}mm`,
      )
    } else {
      console.warn(`  forecast: no data`)
    }

    // Add baseline only once per target date (keyed by source + leadTimeDays=1)
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
      saveSnapshots(targetDate, mergeSnapshots(existing, incoming))
    }
  }

  console.log('\nDone.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
