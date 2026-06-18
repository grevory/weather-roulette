import type { SkyCondition } from '../types/scores'

interface Props {
  leadLabel: string
  isGuess: boolean
  tempC: number
  sky: SkyCondition
  tempErrorC: number
  maxErrorC?: number
}

const SKY_COLORS: Record<SkyCondition, string> = {
  'clear': 'var(--clear)',
  'partly-cloudy': 'var(--cloud)',
  'overcast': 'var(--cloud)',
  'rain': 'var(--rain)',
  'snow': 'var(--snow)',
}

const SKY_LABELS: Record<SkyCondition, string> = {
  'clear': 'Clear',
  'partly-cloudy': 'Partly cloudy',
  'overcast': 'Overcast',
  'rain': 'Rain',
  'snow': 'Snow',
}

function SkyIcon({ sky, size = 34 }: { sky: SkyCondition; size?: number }) {
  const s = `${size}`
  const color = SKY_COLORS[sky]
  if (sky === 'clear') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
      </svg>
    )
  }
  if (sky === 'rain') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.5 14a4 4 0 0 0 .3-8 6 6 0 0 0-11.5 1.4A3.5 3.5 0 0 0 6.5 14z" />
        <path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2" />
      </svg>
    )
  }
  if (sky === 'snow') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.5 14a4 4 0 0 0 .3-8 6 6 0 0 0-11.5 1.4A3.5 3.5 0 0 0 6.5 14z" />
        <path d="M8 19l.5 1.5M12 19l.5 1.5M16 19l.5 1.5" />
      </svg>
    )
  }
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 17a4 4 0 0 0 .3-8 6 6 0 0 0-11.5 1.4A3.5 3.5 0 0 0 6.5 17z" />
    </svg>
  )
}

function DiceIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="9" cy="9" r="1.5" fill="#fff" stroke="none" />
      <circle cx="15" cy="15" r="1.5" fill="#fff" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="#fff" stroke="none" />
    </svg>
  )
}

export function GlowCard({ leadLabel, isGuess, tempC, sky, tempErrorC, maxErrorC = 8 }: Props) {
  const absErr = Math.abs(tempErrorC)

  // Accuracy: 0=worst(red), 1=best(green) — clamp err to [0, maxErrorC]
  const accuracy = Math.max(0, 1 - absErr / maxErrorC)

  // Gauge position: 0% = red (left), 100% = green (right)
  const gaugePos = `${Math.round(accuracy * 100)}%`

  let glowColor: string
  let verdictText: string
  if (accuracy >= 0.75) {
    glowColor = 'var(--good)'
    verdictText = 'NAILED IT'
  } else if (accuracy >= 0.4) {
    glowColor = 'var(--warn)'
    verdictText = 'CLOSE'
  } else {
    glowColor = 'var(--bad)'
    verdictText = 'WAY OFF'
  }

  const glowEdge = `color-mix(in srgb, ${glowColor} 45%, var(--bd))`
  const glowFill = `color-mix(in srgb, ${glowColor} 24%, transparent)`

  const offLabel = `${absErr.toFixed(1)}° off`

  return (
    <div
      className="glow-card"
      style={{ border: `1px solid ${glowEdge}` }}
    >
      <div className="glow-card__bg" style={{ background: `radial-gradient(circle, ${glowFill}, transparent 70%)` }} />
      <div className="glow-card__inner">
        {isGuess ? (
          <div className="glow-card__pill glow-card__pill--guess">
            <DiceIcon />
            BLIND · GUESS
          </div>
        ) : (
          <div className="glow-card__pill glow-card__pill--lead">{leadLabel}</div>
        )}

        <div className="glow-card__main">
          <div className="glow-card__temp">{tempC > 0 ? '+' : ''}{Math.round(tempC)}°</div>
          <SkyIcon sky={sky} />
        </div>
        <div className="glow-card__cond">{SKY_LABELS[sky]}</div>

        <div className="glow-card__gauge-row">
          <div className="glow-card__gauge">
            <div className="glow-card__gauge-dot" style={{ left: gaugePos }} />
          </div>
          <span className="glow-card__off">{offLabel}</span>
        </div>

        <div className="glow-card__verdict">
          <span className="glow-card__verdict-dot" style={{ background: glowColor }} />
          <span className="glow-card__verdict-text" style={{ color: glowColor }}>{verdictText}</span>
        </div>
      </div>
    </div>
  )
}
