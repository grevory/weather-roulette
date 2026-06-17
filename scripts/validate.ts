/**
 * End-to-end pipeline validation using synthetic data with known correct answers.
 *
 * Creates temp snapshot + observation files, runs the scoring logic, and asserts
 * expected outputs. Exits non-zero on any failure.
 *
 * Run: npm run validate
 */
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import type { ForecastSnapshot, WeatherObservation, Score } from './types/weather'
import { computeScore } from './lib/scoring'
import { summariseByLeadTime } from '../src/lib/stats'
import type { LeadTimeSummary } from '../src/lib/stats'

// ── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(label: string, actual: unknown, expected: unknown) {
  const ok =
    typeof expected === 'number' && typeof actual === 'number'
      ? Math.abs(actual - expected) < 0.0001
      : actual === expected
  if (ok) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ ${label}`)
    console.error(`    expected: ${JSON.stringify(expected)}`)
    console.error(`    actual:   ${JSON.stringify(actual)}`)
    failed++
  }
}

function assertNull(label: string, actual: unknown) {
  if (actual === null) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ ${label} — expected null, got ${JSON.stringify(actual)}`)
    failed++
  }
}

// ── Synthetic fixtures ────────────────────────────────────────────────────────

const TARGET = '2024-07-15'

const OBS: WeatherObservation = {
  targetDate: TARGET,
  fetchedAt: '2024-07-20T12:00:00Z',
  highTempC: 20,
  sky: 'partly-cloudy',
  precipMm: 2,
}

// Forecast 1d out: close, sky correct
const SNAP_1D: ForecastSnapshot = {
  capturedAt: '2024-07-14T06:00:00Z',
  targetDate: TARGET,
  leadTimeDays: 1,
  highTempC: 21,    // +1°C error
  sky: 'partly-cloudy',  // correct
  precipMm: 1,
  source: 'open-meteo',
}

// Forecast 7d out: worse, sky wrong
const SNAP_7D: ForecastSnapshot = {
  capturedAt: '2024-07-08T06:00:00Z',
  targetDate: TARGET,
  leadTimeDays: 7,
  highTempC: 25,    // +5°C error
  sky: 'clear',     // wrong
  precipMm: 0,
  source: 'open-meteo',
}

// Forecast 14d out: much worse
const SNAP_14D: ForecastSnapshot = {
  capturedAt: '2024-07-01T06:00:00Z',
  targetDate: TARGET,
  leadTimeDays: 14,
  highTempC: 28,    // +8°C error
  sky: 'overcast',  // wrong
  precipMm: 5,
  source: 'open-meteo',
}

// Baseline (historical average for July): 20.2°C, partly-cloudy — close to obs
const BASELINE: ForecastSnapshot = {
  capturedAt: '2024-07-14T06:00:00Z',
  targetDate: TARGET,
  leadTimeDays: 1,
  highTempC: 16,    // −4°C error
  sky: 'partly-cloudy',
  precipMm: 3.1,
  source: 'historical-average',
}

// ── Section 1: computeScore ───────────────────────────────────────────────────

console.log('\n── Section 1: computeScore ──')

const score1d = computeScore(SNAP_1D, BASELINE, OBS)
assert('1d targetDate', score1d.targetDate, TARGET)
assert('1d leadTimeDays', score1d.leadTimeDays, 1)
assert('1d forecast.tempErrorC', score1d.forecast.tempErrorC, 1)       // 21 - 20
assert('1d forecast.skyCorrect', score1d.forecast.skyCorrect, true)
assert('1d forecast.precipErrorMm', score1d.forecast.precipErrorMm, -1) // 1 - 2
assert('1d baseline.tempErrorC', score1d.baseline.tempErrorC, -4)      // 16 - 20
assert('1d baseline.skyCorrect', score1d.baseline.skyCorrect, true)
// skill = 1 - |1| / |-4| = 1 - 0.25 = 0.75
assert('1d skillScore', score1d.skillScore, 0.75)

const score7d = computeScore(SNAP_7D, BASELINE, OBS)
assert('7d forecast.tempErrorC', score7d.forecast.tempErrorC, 5)       // 25 - 20
assert('7d forecast.skyCorrect', score7d.forecast.skyCorrect, false)
// skill = 1 - |5| / |-4| = 1 - 1.25 = -0.25 (forecast LOSES)
assert('7d skillScore', score7d.skillScore, -0.25)

const score14d = computeScore(SNAP_14D, BASELINE, OBS)
assert('14d forecast.tempErrorC', score14d.forecast.tempErrorC, 8)     // 28 - 20
// skill = 1 - |8| / |-4| = 1 - 2 = -1 (forecast badly loses)
assert('14d skillScore', score14d.skillScore, -1)

// Null skill when baseline error is zero
const perfectBaseline: ForecastSnapshot = { ...BASELINE, highTempC: 20 }
const scoreNullSkill = computeScore(SNAP_1D, perfectBaseline, OBS)
assertNull('null skill when baseline error = 0', scoreNullSkill.skillScore)

// ── Section 2: skill degrades with lead time ──────────────────────────────────

console.log('\n── Section 2: skill degrades with lead time ──')

const skill1d = score1d.skillScore ?? -Infinity
const skill7d = score7d.skillScore ?? -Infinity
const skill14d = score14d.skillScore ?? -Infinity

assert('1d skill > 7d skill', skill1d > skill7d, true)
assert('7d skill > 14d skill', skill7d > skill14d, true)
assert('1d skill > 0 (forecast beats baseline)', skill1d > 0, true)
assert('14d skill < 0 (forecast loses to baseline)', skill14d < 0, true)

// ── Section 3: summariseByLeadTime ───────────────────────────────────────────

console.log('\n── Section 3: summariseByLeadTime (frontend stats) ──')

// Two dates, three lead times — different errors per lead time
const OBS2: WeatherObservation = { ...OBS, targetDate: '2024-07-16', highTempC: 18 }
const BASELINE2: ForecastSnapshot = { ...BASELINE, targetDate: '2024-07-16' }

// Date 2: forecast is 1°C off at 1d, 6°C off at 7d
const SNAP2_1D: ForecastSnapshot = { ...SNAP_1D, targetDate: '2024-07-16', highTempC: 19 }  // -1
const SNAP2_7D: ForecastSnapshot = { ...SNAP_7D, targetDate: '2024-07-16', highTempC: 24 }  // +6

const allScores: Score[] = [
  computeScore(SNAP_1D, BASELINE, OBS),   // 1d: |1| vs |4|
  computeScore(SNAP2_1D, BASELINE2, OBS2), // 1d: |-1| vs |2| (baseline: 16 vs obs 18 = -2)
  computeScore(SNAP_7D, BASELINE, OBS),   // 7d: |5| vs |4|
  computeScore(SNAP2_7D, BASELINE2, OBS2), // 7d: |6| vs |2|
]

const summaries: LeadTimeSummary[] = summariseByLeadTime(allScores)
const s1d = summaries.find((s) => s.leadTimeDays === 1)
const s7d = summaries.find((s) => s.leadTimeDays === 7)
const s2d = summaries.find((s) => s.leadTimeDays === 2)
const s14d = summaries.find((s) => s.leadTimeDays === 14)

// 1d: forecast MAE = (1+1)/2 = 1, baseline MAE = (4+2)/2 = 3, skill = 1 - 1/3 ≈ 0.667
assert('summarise: 1d count', s1d?.count, 2)
assert('summarise: 1d forecast MAE', s1d?.forecast.maeTempC, 1)
assert('summarise: 1d baseline MAE', s1d?.baseline.maeTempC, 3)
assert('summarise: 1d skill ≈ 0.667', Math.round((s1d?.skillScore ?? 0) * 1000) / 1000, 0.667)

// 7d: forecast MAE = (5+6)/2 = 5.5, baseline MAE = (4+2)/2 = 3, skill = 1 - 5.5/3 ≈ -0.833
assert('summarise: 7d count', s7d?.count, 2)
assert('summarise: 7d skill < 0 (worse than baseline)', (s7d?.skillScore ?? 0) < 0, true)

// 2d and 14d: no scores → count = 0, skillScore = null
assert('summarise: 2d count = 0', s2d?.count, 0)
assertNull('summarise: 2d skill = null', s2d?.skillScore ?? null)
assert('summarise: 14d count = 0', s14d?.count, 0)

// ── Section 4: file round-trip ────────────────────────────────────────────────

console.log('\n── Section 4: file round-trip (snapshot → score) ──')

const TMP = join(process.cwd(), 'data', '_validate_tmp')
const SNAP_DIR = join(TMP, 'snapshots')
const OBS_DIR = join(TMP, 'observations')

try {
  mkdirSync(SNAP_DIR, { recursive: true })
  mkdirSync(OBS_DIR, { recursive: true })

  const snapshots: ForecastSnapshot[] = [SNAP_1D, BASELINE]
  writeFileSync(join(SNAP_DIR, `${TARGET}.json`), JSON.stringify(snapshots, null, 2))
  writeFileSync(join(OBS_DIR, `${TARGET}.json`), JSON.stringify(OBS, null, 2))

  // Simulate what score.ts does
  const loaded = JSON.parse(
    readFileSync(join(SNAP_DIR, `${TARGET}.json`), 'utf-8')
  ) as ForecastSnapshot[]
  const loadedObs = JSON.parse(
    readFileSync(join(OBS_DIR, `${TARGET}.json`), 'utf-8')
  ) as WeatherObservation

  const bl = loaded.find((s) => s.source === 'historical-average')
  const fc = loaded.find((s) => s.source === 'open-meteo')

  assert('round-trip: baseline loaded', bl?.source, 'historical-average')
  assert('round-trip: forecast loaded', fc?.source, 'open-meteo')

  if (bl && fc) {
    const rt = computeScore(fc, bl, loadedObs)
    assert('round-trip: skill correct', rt.skillScore, 0.75)
    assert('round-trip: leadTimeDays', rt.leadTimeDays, 1)
  }
} finally {
  rmSync(TMP, { recursive: true, force: true })
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`)
console.log(`Passed: ${passed}  Failed: ${failed}`)

if (failed > 0) {
  console.error('\nValidation FAILED')
  process.exit(1)
} else {
  console.log('\nAll validations passed ✓')
}
