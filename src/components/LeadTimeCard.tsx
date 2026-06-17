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

/** Returns CSS class to highlight which column won for a given metric. */
function winClass(forecastVal: number, baselineVal: number, lowerIsBetter: boolean) {
  if (forecastVal === baselineVal) return { f: '', b: '' }
  const forecastWins = lowerIsBetter ? forecastVal < baselineVal : forecastVal > baselineVal
  return forecastWins
    ? { f: 'cell--win', b: 'cell--lose' }
    : { f: 'cell--lose', b: 'cell--win' }
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

  const tempCls = winClass(summary.forecast.maeTempC, summary.baseline.maeTempC, true)
  const skyCls  = winClass(summary.forecast.skyPct,   summary.baseline.skyPct,   false)
  const prcpCls = winClass(summary.forecast.maePrecipMm, summary.baseline.maePrecipMm, true)

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
            <td className={tempCls.f}>{summary.forecast.maeTempC.toFixed(1)}°C</td>
            <td className={tempCls.b}>{summary.baseline.maeTempC.toFixed(1)}°C</td>
          </tr>
          <tr>
            <td>Sky correct</td>
            <td className={skyCls.f}>{Math.round(summary.forecast.skyPct * 100)}%</td>
            <td className={skyCls.b}>{Math.round(summary.baseline.skyPct * 100)}%</td>
          </tr>
          <tr>
            <td>Precip error (MAE)</td>
            <td className={prcpCls.f}>{summary.forecast.maePrecipMm.toFixed(1)} mm</td>
            <td className={prcpCls.b}>{summary.baseline.maePrecipMm.toFixed(1)} mm</td>
          </tr>
        </tbody>
      </table>

      <p className="card__count">{summary.count} day{summary.count !== 1 ? 's' : ''} scored</p>
    </div>
  )
}
