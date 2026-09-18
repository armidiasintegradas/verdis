import { Card } from './card'

export type MetricTone = 'neutral' | 'positive' | 'attention' | 'error'

type MetricCardProps = {
  label: string
  value: string
  detail?: string
  tone?: MetricTone
}

export function MetricCard({ label, value, detail, tone = 'neutral' }: MetricCardProps) {
  return (
    <Card className="v-metric-card" data-tone={tone}>
      <span className="v-metric-card__label">{label}</span>
      <strong className="v-metric-card__value">{value}</strong>
      {detail ? <span className="v-metric-card__detail">{detail}</span> : null}
    </Card>
  )
}
