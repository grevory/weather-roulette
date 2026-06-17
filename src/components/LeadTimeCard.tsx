import type { LeadTimeSummary } from '../lib/stats'
import { SkillBadge } from './SkillBadge'

interface Props {
  summary: LeadTimeSummary
}

const LEAD_LABEL: Record<number, string> = {
  1: '24 h',
  2: '48 h',
  7: '7 days',
  14: '14 days',
}

export function LeadTimeCard({ summary }: Props) {
  const label = LEAD_LABEL[summary.leadTimeDays] ?? `${summary.leadTimeDays}d`

  if (summary.count === 0) {
    return (
      <div className="card card--empty">
        <h2 className="card__lead">{label}</h2>
        <p className="card__empty-msg">Collecting data…</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__lead">{label}</h2>
        <SkillBadge skill={summary.skillScore} />
      </div>

      <table className="card__table">
        <thead>
          <tr>
            <th />
            <th>Forecast</th>
            <th>Random guess</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Temp error (MAE)</td>
            <td>{summary.forecast.maeTempC.toFixed(1)}°C</td>
            <td>{summary.baseline.maeTempC.toFixed(1)}°C</td>
          </tr>
          <tr>
            <td>Sky conditions</td>
            <td>{Math.round(summary.forecast.skyPct * 100)}%</td>
            <td>{Math.round(summary.baseline.skyPct * 100)}%</td>
          </tr>
        </tbody>
      </table>

      <p className="card__count">{summary.count} day{summary.count !== 1 ? 's' : ''} scored</p>
    </div>
  )
}
