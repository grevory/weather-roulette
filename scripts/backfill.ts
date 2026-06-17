/**
 * Backfill historical observations only.
 *
 * WARNING — KNOWN LIMITATION:
 * There is no free API that returns what Open-Meteo was forecasting on a specific
 * past date at a given lead time. The Open-Meteo Historical Forecast API is a
 * hindcast (same values regardless of lead time). The Single Runs API is not
 * publicly available on the free tier.
 *
 * As a result, this script uses the Open-Meteo *archive* (observed actuals) as
 * a proxy for every lead-time forecast. This makes all four lead times identical
 * and gives skill = 100% for every backfilled date — which is meaningless.
 *
 * This script is retained only to populate `data/observations/` for dates where
 * real forward-looking snapshots already exist. Do NOT use it to generate
 * forecast snapshots; those must come from the daily `npm run capture` job.
 *
 * Real lead-time-differentiated scores accumulate naturally as the daily capture
 * job collects genuine advance forecasts and those target dates pass.
 *
 * Usage:
 *   npm run backfill                  # backfill observations for last 90 days
 *   npm run backfill -- --days 30     # backfill last 30 days
 *   npm run backfill -- --dry-run     # print what would be written, no writes
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { OpenMeteoSource } from './sources/OpenMeteoSource'
import { HistoricalAverageSource } from './sources/HistoricalAverageSource'
import type { ForecastSnapshot } from './types/weather'
import { todayInStJohns, addDays } from './lib/timezone'

const LEAD_TIMES = [1, 2, 7, 14] as const
const SNAPSHOTS_DIR = join(process.cwd(), 'data', 'snapshots')
const OBSERVATIONS_DIR = join(process.cwd(), 'data', 'observations')

function readJson<T>(path: string): T | null {
  try { return JSON.parse(readFileSync(path, 'utf-8')) as T } catch { return null }
}

function writeJson(path: string, data: unknown, dryRun: boolean): void {
  if (dryRun) { console.log(`  [dry-run] would write → ${path}`); return }
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

function mergeSnapshots(existing: ForecastSnapshot[], incoming: ForecastSnapshot[]): ForecastSnapshot[] {
  const key = (s: ForecastSnapshot) => `${s.source}:${s.leadTimeDays}`
  const map = new Map(existing.map((s) => [key(s), s]))
  for (const s of incoming) map.set(key(s), s)
  return Array.from(map.values())
}

async function run() {
  const args = process.argv.slice(2)
  const daysBack = Number(args[args.indexOf('--days') + 1] || 90)
  const dryRun = args.includes('--dry-run')

  if (dryRun) console.log('Dry-run mode — no files will be written.\n')

  mkdirSync(SNAPSHOTS_DIR, { recursive: true })
  mkdirSync(OBSERVATIONS_DIR, { recursive: true })

  const openMeteo = new OpenMeteoSource()
  const historical = new HistoricalAverageSource()
  const today = todayInStJohns()

  let snapshotsWritten = 0
  let observationsWritten = 0
  let skipped = 0

  // Work from oldest → newest so later runs only fill gaps
  for (let daysAgo = daysBack; daysAgo >= 1; daysAgo--) {
    const targetDate = addDays(today, -daysAgo)
    const snapshotPath = join(SNAPSHOTS_DIR, `${targetDate}.json`)
    const obsPath = join(OBSERVATIONS_DIR, `${targetDate}.json`)

    const existingSnapshots = readJson<ForecastSnapshot[]>(snapshotPath) ?? []
    const hasAllLeadTimes = LEAD_TIMES.every((lt) =>
      existingSnapshots.some((s) => s.source === 'open-meteo' && s.leadTimeDays === lt)
    )
    const hasBaseline = existingSnapshots.some((s) => s.source === 'historical-average')
    const hasObservation = existsSync(obsPath)

    if (hasAllLeadTimes && hasBaseline && hasObservation) {
      skipped++
      continue
    }

    console.log(`\n${targetDate} (${daysAgo} days ago)`)

    // ── Snapshots ──
    if (!hasAllLeadTimes || !hasBaseline) {
      const incoming: ForecastSnapshot[] = []

      for (const leadTimeDays of LEAD_TIMES) {
        const alreadyHave = existingSnapshots.some(
          (s) => s.source === 'open-meteo' && s.leadTimeDays === leadTimeDays
        )
        if (alreadyHave) continue

        // The "capture date" would have been targetDate - leadTimeDays
        const captureDate = addDays(targetDate, -leadTimeDays)
        // Fetch what Open-Meteo archive shows for targetDate as seen on captureDate
        // We use fetchObservation which hits the archive API for targetDate
        const obs = await openMeteo.fetchObservation(targetDate)
        if (obs) {
          incoming.push({
            capturedAt: `${captureDate}T06:00:00.000Z`, // simulated capture time
            targetDate,
            leadTimeDays,
            highTempC: obs.highTempC,
            sky: obs.sky,
            precipMm: obs.precipMm,
            source: 'open-meteo',
          })
          console.log(`  [${leadTimeDays}d] archive proxy: ${obs.highTempC}°C ${obs.sky}`)
        } else {
          console.warn(`  [${leadTimeDays}d] no archive data`)
        }
        // Small delay to stay within Open-Meteo rate limits
        await new Promise((r) => setTimeout(r, 100))
      }

      if (!hasBaseline) {
        const baseline = await historical.fetchHistoricalBaseline(targetDate)
        if (baseline) {
          incoming.push(baseline)
          console.log(`  baseline: ${baseline.highTempC}°C ${baseline.sky}`)
        }
      }

      if (incoming.length > 0) {
        const merged = mergeSnapshots(existingSnapshots, incoming)
        writeJson(snapshotPath, merged, dryRun)
        snapshotsWritten++
      }
    }

    // ── Observation ──
    if (!hasObservation) {
      const obs = await openMeteo.fetchObservation(targetDate)
      if (obs) {
        writeJson(obsPath, obs, dryRun)
        observationsWritten++
        console.log(`  observed: ${obs.highTempC}°C ${obs.sky} ${obs.precipMm}mm`)
      } else {
        console.warn(`  no observation data for ${targetDate}`)
      }
      await new Promise((r) => setTimeout(r, 100))
    }
  }

  console.log(`\nDone. Snapshots: ${snapshotsWritten}, observations: ${observationsWritten}, skipped: ${skipped}`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
