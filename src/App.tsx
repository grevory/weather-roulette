import { useEffect, useState } from 'react'
import type { Score, ScoresFile, SkyCondition } from './types/scores'
import { summariseByLeadTime } from './lib/stats'
import { GlowCard } from './components/GlowCard'
import './App.css'

const SCORES_URL = `${import.meta.env.BASE_URL}data/scores.json`

const LEAD_LABELS: Record<number, string> = { 1: '24 HRS OUT', 2: '48 HRS OUT', 7: '7 DAYS OUT', 14: '14 DAYS OUT' }
const LEAD_SHORT: Record<number, string> = { 1: '24h', 2: '48h', 7: '7d', 14: '14d' }
const LEAD_TIMES = [1, 2, 7, 14] as const

function DiceIcon({ color = '#fff', size = 15 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="9" cy="9" r="1.4" fill={color} stroke="none" />
      <circle cx="15" cy="15" r="1.4" fill={color} stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill={color} stroke="none" />
    </svg>
  )
}

function RainIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.92)" strokeWidth="1.4" strokeLinecap="round">
      <path d="M17.5 16.5a4 4 0 0 0 .3-8 6 6 0 0 0-11.5 1.4A3.5 3.5 0 0 0 6.5 16.5z" />
      <line x1="8" y1="19.5" x2="7" y2="22" />
      <line x1="12" y1="19.5" x2="11" y2="22" />
      <line x1="16" y1="19.5" x2="15" y2="22" />
    </svg>
  )
}

function skyLabel(s: SkyCondition): string {
  const m: Record<SkyCondition, string> = {
    clear: 'Clear', 'partly-cloudy': 'Partly cloudy', overcast: 'Overcast', rain: 'Rainy', snow: 'Snowy',
  }
  return m[s]
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/St_Johns', dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(iso))
}

// ── Most recent scored day ──────────────────────────────────────────────────

interface DayData {
  targetDate: string
  observation: { tempC: number; sky: SkyCondition; precipMm: number }
  forecasts: { lead: number; tempC: number; sky: SkyCondition; tempErrorC: number }[]
  baseline: { tempC: number; sky: SkyCondition; tempErrorC: number } | null
}

function extractLatestDay(scores: Score[]): DayData | null {
  if (scores.length === 0) return null
  const dates = [...new Set(scores.map(s => s.targetDate))].sort((a, b) => b.localeCompare(a))
  const targetDate = dates[0]
  if (!targetDate) return null
  const dayScores = scores.filter(s => s.targetDate === targetDate)
  const first = dayScores[0]
  if (!first) return null

  const forecasts = dayScores
    .filter(s => s.source === 'open-meteo')
    .map(s => ({
      lead: s.leadTimeDays,
      tempC: s.forecast.highTempC,
      sky: s.forecast.sky,
      tempErrorC: s.forecast.tempErrorC,
    }))
    .sort((a, b) => a.lead - b.lead)

  const baselineScore = dayScores.find(s => s.source === 'historical-average')
  const baseline = baselineScore ? {
    tempC: baselineScore.baseline.highTempC,
    sky: baselineScore.baseline.sky,
    tempErrorC: baselineScore.baseline.tempErrorC,
  } : null

  return {
    targetDate,
    observation: { tempC: first.observation.highTempC, sky: first.observation.sky, precipMm: first.observation.precipMm },
    forecasts,
    baseline,
  }
}

// ── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [scores, setScores] = useState<Score[]>([])
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    fetch(SCORES_URL)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<ScoresFile> })
      .then(data => { setScores(data.scores); setUpdatedAt(data.updatedAt); setLoading(false) })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : 'Failed to load'); setLoading(false) })
  }, [])

  const summaries = summariseByLeadTime(scores)
  const latest = extractLatestDay(scores)
  const hasScores = scores.length > 0

  // max temp error across all scored entries — for gauge scaling
  const maxErr = Math.max(8, ...scores.map(s => Math.abs(s.forecast.tempErrorC)))

  return (
    <div className="app" data-theme={theme}>
      <div className="app__inner">

        {/* TOPBAR */}
        <header className="topbar">
          <div className="topbar__brand">
            <div className="topbar__logo">
              <DiceIcon color="#fff" size={22} />
            </div>
            <div>
              <h1 className="topbar__name">Weather Roulette</h1>
              <div className="topbar__sub">A random guess vs. the professional forecast</div>
            </div>
          </div>
          <div className="topbar__controls">
            <button
              className="topbar__btn topbar__btn--icon"
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              <svg width="17" height="17" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" fill="currentColor" />
                <circle cx="15.5" cy="9.5" r="8" fill="var(--card)" />
              </svg>
            </button>
          </div>
        </header>

        {loading && <p className="status">Loading…</p>}
        {error && <p className="status status--error">Could not load scores: {error}</p>}

        {!loading && !error && !hasScores && (
          <p className="status">No scored days yet — check back after the first observation lands.</p>
        )}

        {!loading && !error && hasScores && latest && (
          <>
            {/* HERO */}
            <section className="hero">
              <div className="hero__rain" />
              <div className="hero__glow" />
              <div className="hero__body">
                <div style={{ maxWidth: 560 }}>
                  <div className="hero__eyebrow">ST. JOHN&apos;S, NL · {latest.targetDate}</div>
                  <p className="hero__headline">
                    Two weeks ago, we spun the wheel<br />
                    {latest.baseline
                      ? `and guessed ${latest.baseline.tempC > 0 ? '+' : ''}${Math.round(latest.baseline.tempC)}° & ${skyLabel(latest.baseline.sky).toLowerCase()}.`
                      : 'and let the historical average decide.'}
                  </p>
                  <p className="hero__desc">
                    A random draw from 30 years of historical averages — no satellites, no supercomputers.
                    The actual result was <b>{Math.round(latest.observation.tempC)}° and {skyLabel(latest.observation.sky).toLowerCase()}</b>.
                    The question Weather Roulette asks every day: <b>did the professional forecasts do any better?</b>
                  </p>
                </div>
                <div className="hero__actual">
                  <div className="hero__actual-label">ACTUAL</div>
                  <div className="hero__actual-row">
                    <RainIcon />
                    <div>
                      <div className="hero__temp">{Math.round(latest.observation.tempC)}°</div>
                      <div className="hero__sky">{skyLabel(latest.observation.sky)}</div>
                    </div>
                  </div>
                  {latest.observation.precipMm > 0 && (
                    <div className="hero__chips">
                      <span className="hero__chip">{latest.observation.precipMm.toFixed(1)} mm</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* FORECAST GLOW CARDS */}
            <section className="section">
              <h2 className="section__title">The spin vs. the pros — {latest.targetDate}</h2>
              <p className="section__desc">
                Weather-widget glow shows how close each call landed. Actual: <b>{Math.round(latest.observation.tempC)}° · {skyLabel(latest.observation.sky)}</b>
              </p>
              <div className="glow-cards">
                {latest.baseline && (
                  <GlowCard
                    leadLabel="BLIND · GUESS"
                    isGuess
                    tempC={latest.baseline.tempC}
                    sky={latest.baseline.sky}
                    tempErrorC={latest.baseline.tempErrorC}
                    maxErrorC={maxErr}
                  />
                )}
                {latest.forecasts.map(f => (
                  <GlowCard
                    key={f.lead}
                    leadLabel={LEAD_LABELS[f.lead] ?? `${f.lead}D`}
                    isGuess={false}
                    tempC={f.tempC}
                    sky={f.sky}
                    tempErrorC={f.tempErrorC}
                    maxErrorC={maxErr}
                  />
                ))}
              </div>
            </section>

            {/* SEASON STATS */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-card__header">
                  <div className="stat-card__icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="stat-card__title">Daily high temp</div>
                    <div className="stat-card__subtitle">average miss in °C</div>
                  </div>
                </div>
                {summaries.filter(s => s.count > 0).slice(0, 1).map(s => {
                  const fMae = s.forecast.maeTempC
                  const bMae = s.baseline.maeTempC
                  const maxMae = Math.max(fMae, bMae, 0.1)
                  return (
                    <div key={s.leadTimeDays}>
                      <p className="stat-card__lede">
                        At 24h, pros land <b style={{ color: 'var(--good)' }}>{(bMae - fMae).toFixed(1)}° closer</b> than a random guess.
                      </p>
                      <div className="stat-card__bars">
                        <div>
                          <div className="stat-bar__label">
                            <span style={{ color: 'var(--acc)' }}>Forecast 24h</span>
                            <span className="stat-bar__val">{fMae.toFixed(1)}° off</span>
                          </div>
                          <div className="stat-bar__track">
                            <div className="stat-bar__fill" style={{ width: `${(fMae / maxMae) * 100}%`, background: 'var(--acc)' }} />
                          </div>
                        </div>
                        <div>
                          <div className="stat-bar__label">
                            <span style={{ color: 'var(--spin)' }}>Random guess</span>
                            <span className="stat-bar__val">{bMae.toFixed(1)}° off</span>
                          </div>
                          <div className="stat-bar__track">
                            <div className="stat-bar__fill" style={{ width: `${(bMae / maxMae) * 100}%`, background: 'var(--spin)' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <p className="stat-card__note">Shorter bar = closer. Edge fades at longer lead times.</p>
              </div>

              <div className="stat-card">
                <div className="stat-card__header">
                  <div className="stat-card__icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.5 17a4 4 0 0 0 .3-8 6 6 0 0 0-11.5 1.4A3.5 3.5 0 0 0 6.5 17z" />
                    </svg>
                  </div>
                  <div>
                    <div className="stat-card__title">Sky conditions</div>
                    <div className="stat-card__subtitle">% called correctly</div>
                  </div>
                </div>
                {summaries.filter(s => s.count > 0).slice(0, 1).map(s => {
                  const fPct = Math.round(s.forecast.skyPct * 100)
                  const bPct = Math.round(s.baseline.skyPct * 100)
                  return (
                    <div key={s.leadTimeDays}>
                      <p className="stat-card__lede">Pros nail the sky <b style={{ color: 'var(--good)' }}>{fPct}%</b> of the time at 24h.</p>
                      <div className="stat-card__bars">
                        <div>
                          <div className="stat-bar__label">
                            <span style={{ color: 'var(--acc)' }}>Forecast 24h</span>
                            <span className="stat-bar__val">{fPct}%</span>
                          </div>
                          <div className="stat-bar__track">
                            <div className="stat-bar__fill" style={{ width: `${fPct}%`, background: 'var(--acc)' }} />
                          </div>
                        </div>
                        <div>
                          <div className="stat-bar__label">
                            <span style={{ color: 'var(--spin)' }}>Random guess</span>
                            <span className="stat-bar__val">{bPct}%</span>
                          </div>
                          <div className="stat-bar__track">
                            <div className="stat-bar__fill" style={{ width: `${bPct}%`, background: 'var(--spin)' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <p className="stat-card__note">Longer bar = better. Lead times reduce sky accuracy.</p>
              </div>

              <div className="stat-card">
                <div className="stat-card__header">
                  <div className="stat-card__icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.5 14a4 4 0 0 0 .3-8 6 6 0 0 0-11.5 1.4A3.5 3.5 0 0 0 6.5 14z" />
                      <path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2" />
                    </svg>
                  </div>
                  <div>
                    <div className="stat-card__title">Precipitation</div>
                    <div className="stat-card__subtitle">average miss in mm</div>
                  </div>
                </div>
                {summaries.filter(s => s.count > 0).slice(0, 1).map(s => {
                  const fMae = s.forecast.maePrecipMm
                  const bMae = s.baseline.maePrecipMm
                  const maxMae = Math.max(fMae, bMae, 0.1)
                  return (
                    <div key={s.leadTimeDays}>
                      <p className="stat-card__lede">At 24h, forecast precip error is <b style={{ color: 'var(--good)' }}>{fMae.toFixed(1)} mm</b>.</p>
                      <div className="stat-card__bars">
                        <div>
                          <div className="stat-bar__label">
                            <span style={{ color: 'var(--acc)' }}>Forecast 24h</span>
                            <span className="stat-bar__val">{fMae.toFixed(1)} mm</span>
                          </div>
                          <div className="stat-bar__track">
                            <div className="stat-bar__fill" style={{ width: `${(fMae / maxMae) * 100}%`, background: 'var(--acc)' }} />
                          </div>
                        </div>
                        <div>
                          <div className="stat-bar__label">
                            <span style={{ color: 'var(--spin)' }}>Random guess</span>
                            <span className="stat-bar__val">{bMae.toFixed(1)} mm</span>
                          </div>
                          <div className="stat-bar__track">
                            <div className="stat-bar__fill" style={{ width: `${(bMae / maxMae) * 100}%`, background: 'var(--spin)' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <p className="stat-card__note">Shorter bar = closer to actual precipitation.</p>
              </div>
            </div>

            {/* STANDINGS TABLE */}
            <div className="standings-grid">
              <section className="section">
                <h2 className="section__title">Season standings</h2>
                <p className="section__desc">Every predictor scored so far ({scores.length > 0 ? `${[...new Set(scores.map(s => s.targetDate))].length} days` : '—'}).</p>
                <table className="standings-table">
                  <thead>
                    <tr>
                      <th>Predictor</th>
                      <th>Avg miss</th>
                      <th>Sky %</th>
                      <th>vs guess</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LEAD_TIMES.map((lead, i) => {
                      const s = summaries.find(x => x.leadTimeDays === lead)
                      if (!s || s.count === 0) return null
                      const beats = s.skillScore !== null && s.skillScore > 0
                      const opacity = [1, 0.75, 0.6, 0.5][i] ?? 0.5
                      return (
                        <tr key={lead}>
                          <td>
                            <span className="row-dot">
                              <span className="row-dot__dot" style={{ opacity }} />
                              Forecast · {LEAD_SHORT[lead]}
                            </span>
                          </td>
                          <td>{s.forecast.maeTempC.toFixed(1)}°</td>
                          <td>{Math.round(s.forecast.skyPct * 100)}%</td>
                          <td>
                            <span className={`badge ${beats ? 'badge--win' : 'badge--lose'}`}>
                              {beats ? 'beats it' : 'loses'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                    {summaries[0] && summaries[0].count > 0 && (
                      <tr className="guess-row" style={{ background: 'var(--spin-soft)' }}>
                        <td>
                          <span className="row-dot" style={{ color: 'var(--spin)' }}>
                            <DiceIcon color="var(--spin)" size={14} />
                            Random guess
                          </span>
                        </td>
                        <td style={{ color: 'var(--spin)' }}>{summaries[0].baseline.maeTempC.toFixed(1)}°</td>
                        <td style={{ color: 'var(--spin)' }}>{Math.round(summaries[0].baseline.skyPct * 100)}%</td>
                        <td><span className="badge badge--spin">the bar</span></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>

              <section className="section">
                <h2 className="section__title">Skill by lead time</h2>
                <p className="section__desc">Positive = forecast beats the random guess on temperature.</p>
                <table className="standings-table" style={{ marginTop: 14 }}>
                  <thead>
                    <tr>
                      <th>Lead</th>
                      <th>Days</th>
                      <th>Skill score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map(s => {
                      const skill = s.skillScore
                      const pct = skill !== null ? `${(skill * 100).toFixed(0)}%` : '—'
                      const beats = skill !== null && skill > 0
                      return (
                        <tr key={s.leadTimeDays}>
                          <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{LEAD_SHORT[s.leadTimeDays]}</td>
                          <td>{s.count}</td>
                          <td>
                            {s.count > 0 ? (
                              <span className={`badge ${beats ? 'badge--win' : skill !== null ? 'badge--lose' : ''}`}>{pct}</span>
                            ) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </section>
            </div>
          </>
        )}

        {/* FOOTER */}
        <footer className="app__footer">
          <span>Data: Open-Meteo (CC BY 4.0) · St. John&apos;s, NL · tz America/St_Johns (UTC−2:30)</span>
          <span>
            {updatedAt ? `Updated ${formatDate(updatedAt)} NST` : 'Updated daily by GitHub Actions'}
          </span>
        </footer>

      </div>
    </div>
  )
}
