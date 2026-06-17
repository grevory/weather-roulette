interface Props {
  skill: number | null
}

export function SkillBadge({ skill }: Props) {
  if (skill === null) return <span className="badge badge--neutral">No data</span>

  const pct = Math.round(skill * 100)
  const cls = skill > 0.1 ? 'badge--win' : skill < -0.1 ? 'badge--lose' : 'badge--tie'
  const label = skill > 0.1 ? `+${pct}% skill` : skill < -0.1 ? `${pct}% skill` : 'Tied'

  return <span className={`badge ${cls}`}>{label}</span>
}
