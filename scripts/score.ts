import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { ForecastSnapshot, WeatherObservation, Score } from './types/weather'
import { computeScore } from './lib/scoring'

const SNAPSHOTS_DIR = join(process.cwd(), 'data', 'snapshots')
const OBSERVATIONS_DIR = join(process.cwd(), 'data', 'observations')
const SCORES_OUT = join(process.cwd(), 'data', 'scores.json')
const SCORES_PUBLIC = join(process.cwd(), 'public', 'data', 'scores.json')

interface ScoresFile {
  updatedAt: string
  scores: Score[]
}

function readJson<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T
  } catch {
    return null
  }
}

function run() {
  if (!existsSync(SNAPSHOTS_DIR)) {
    console.log('No snapshots directory found.')
    return
  }

  const scores: Score[] = []
  const files = readdirSync(SNAPSHOTS_DIR).filter((f) => f.endsWith('.json')).sort()

  for (const file of files) {
    const targetDate = file.replace('.json', '')
    const obsPath = join(OBSERVATIONS_DIR, `${targetDate}.json`)
    if (!existsSync(obsPath)) continue

    const snapshots = readJson<ForecastSnapshot[]>(join(SNAPSHOTS_DIR, file))
    const obs = readJson<WeatherObservation>(obsPath)
    if (!snapshots || !obs) continue

    const baseline = snapshots.find((s) => s.source === 'historical-average')
    if (!baseline) continue

    for (const snap of snapshots.filter((s) => s.source === 'open-meteo')) {
      scores.push(computeScore(snap, baseline, obs))
    }
  }

  const output: ScoresFile = { updatedAt: new Date().toISOString(), scores }
  const json = JSON.stringify(output, null, 2) + '\n'
  writeFileSync(SCORES_OUT, json, 'utf-8')
  mkdirSync(join(process.cwd(), 'public', 'data'), { recursive: true })
  writeFileSync(SCORES_PUBLIC, json, 'utf-8')
  console.log(`Wrote ${scores.length} scores → ${SCORES_OUT} + ${SCORES_PUBLIC}`)
}

run()
