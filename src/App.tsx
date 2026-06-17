import { useEffect, useState } from 'react'
import type { Score } from './types/scores'
import { summariseByLeadTime } from './lib/stats'
import { LeadTimeCard } from './components/LeadTimeCard'
import './App.css'

const SCORES_URL = `${import.meta.env.BASE_URL}data/scores.json`

export default function App() {
  const [scores, setScores] = useState<Score[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(SCORES_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<Score[]>
      })
      .then((data) => {
        setScores(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load scores')
        setLoading(false)
      })
  }, [])

  const summaries = summariseByLeadTime(scores)
  const totalScored = scores.length > 0
    ? Math.max(...summaries.map((s) => s.count))
    : 0

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Weather Roulatte</h1>
        <p className="app__subtitle">
          Professional forecast vs random guess — St.&nbsp;John&apos;s, NL
        </p>
      </header>

      <main className="app__main">
        {loading && <p className="status">Loading scores…</p>}
        {error && <p className="status status--error">Could not load scores: {error}</p>}

        {!loading && !error && totalScored === 0 && (
          <p className="status">
            No scored days yet — check back after the first target dates pass.
          </p>
        )}

        {!loading && !error && (
          <div className="grid">
            {summaries.map((s) => (
              <LeadTimeCard key={s.leadTimeDays} summary={s} />
            ))}
          </div>
        )}
      </main>

      <footer className="app__footer">
        <p>
          Data: <a href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a>
          {' · '}Updated daily by GitHub Actions
        </p>
      </footer>
    </div>
  )
}
