import { useEffect, useState } from 'react'
import type { Score, ScoresFile } from './types/scores'
import { summariseByLeadTime } from './lib/stats'
import { LeadTimeCard } from './components/LeadTimeCard'
import { DayHistory } from './components/DayHistory'
import './App.css'

const SCORES_URL = `${import.meta.env.BASE_URL}data/scores.json`

function formatUpdated(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/St_Johns',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export default function App() {
  const [scores, setScores] = useState<Score[]>([])
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(SCORES_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<ScoresFile>
      })
      .then((data) => {
        setScores(data.scores)
        setUpdatedAt(data.updatedAt)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load scores')
        setLoading(false)
      })
  }, [])

  const summaries = summariseByLeadTime(scores)
  const hasScores = scores.length > 0

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Weather Roulatte</h1>
        <p className="app__subtitle">
          Professional forecast vs random guess — St.&nbsp;John&apos;s, NL
        </p>
      </header>

      <main className="app__main">
        {loading && <p className="status">Loading…</p>}
        {error && <p className="status status--error">Could not load scores: {error}</p>}

        {!loading && !error && !hasScores && (
          <p className="status">
            No scored days yet — the first results arrive after 2026-06-18.
          </p>
        )}

        {!loading && !error && (
          <>
            <div className="grid">
              {summaries.map((s) => (
                <LeadTimeCard key={s.leadTimeDays} summary={s} />
              ))}
            </div>

            <DayHistory scores={scores} />
          </>
        )}
      </main>

      <footer className="app__footer">
        <p>
          Data: <a href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a>
          {' · '}
          {updatedAt
            ? `Updated ${formatUpdated(updatedAt)} NST`
            : 'Updated daily by GitHub Actions'}
        </p>
      </footer>
    </div>
  )
}
