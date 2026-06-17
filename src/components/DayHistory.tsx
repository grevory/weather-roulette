import type { Score } from '../types/scores'
import { SkillBadge } from './SkillBadge'

interface Props {
  scores: Score[]
}

const LEAD_LABEL: Record<number, string> = { 1: '24h', 2: '48h', 7: '7d', 14: '14d' }

function signed(n: number) {
  return n >= 0 ? `+${n.toFixed(1)}` : n.toFixed(1)
}

export function DayHistory({ scores }: Props) {
  if (scores.length === 0) return null

  // Group by targetDate, sort newest first
  const byDate = new Map<string, Score[]>()
  for (const s of scores) {
    const existing = byDate.get(s.targetDate) ?? []
    existing.push(s)
    byDate.set(s.targetDate, existing)
  }
  const dates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a))

  return (
    <section className="history">
      <h2 className="history__title">Day-by-day</h2>
      <div className="history__scroll">
        <table className="history__table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Lead</th>
              <th colSpan={2}>Temp error</th>
              <th colSpan={2}>Sky</th>
              <th colSpan={2}>Precip error</th>
              <th>Skill</th>
            </tr>
            <tr className="history__subhead">
              <th /><th />
              <th>Forecast</th><th>Guess</th>
              <th>Forecast</th><th>Guess</th>
              <th>Forecast</th><th>Guess</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {dates.map((date) => {
              const dayScores = (byDate.get(date) ?? [])
                .slice()
                .sort((a, b) => a.leadTimeDays - b.leadTimeDays)

              return dayScores.map((s, i) => (
                <tr key={`${date}-${s.leadTimeDays}`} className={i === 0 ? 'history__row--first' : ''}>
                  {i === 0 && (
                    <td rowSpan={dayScores.length} className="history__date">
                      {date}
                    </td>
                  )}
                  <td className="history__lead">{LEAD_LABEL[s.leadTimeDays]}</td>

                  <td className={s.forecast.tempErrorC < s.baseline.tempErrorC ? 'cell--win' : s.forecast.tempErrorC > s.baseline.tempErrorC ? 'cell--lose' : ''}>
                    {signed(s.forecast.tempErrorC)}°C
                  </td>
                  <td className={s.baseline.tempErrorC < s.forecast.tempErrorC ? 'cell--win' : s.baseline.tempErrorC > s.forecast.tempErrorC ? 'cell--lose' : ''}>
                    {signed(s.baseline.tempErrorC)}°C
                  </td>

                  <td className={s.forecast.skyCorrect && !s.baseline.skyCorrect ? 'cell--win' : !s.forecast.skyCorrect && s.baseline.skyCorrect ? 'cell--lose' : ''}>
                    {s.forecast.skyCorrect ? '✓' : '✗'}
                  </td>
                  <td className={s.baseline.skyCorrect && !s.forecast.skyCorrect ? 'cell--win' : !s.baseline.skyCorrect && s.forecast.skyCorrect ? 'cell--lose' : ''}>
                    {s.baseline.skyCorrect ? '✓' : '✗'}
                  </td>

                  <td className={Math.abs(s.forecast.precipErrorMm) < Math.abs(s.baseline.precipErrorMm) ? 'cell--win' : Math.abs(s.forecast.precipErrorMm) > Math.abs(s.baseline.precipErrorMm) ? 'cell--lose' : ''}>
                    {signed(s.forecast.precipErrorMm)} mm
                  </td>
                  <td className={Math.abs(s.baseline.precipErrorMm) < Math.abs(s.forecast.precipErrorMm) ? 'cell--win' : Math.abs(s.baseline.precipErrorMm) > Math.abs(s.forecast.precipErrorMm) ? 'cell--lose' : ''}>
                    {signed(s.baseline.precipErrorMm)} mm
                  </td>

                  <td><SkillBadge skill={s.skillScore} /></td>
                </tr>
              ))
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
