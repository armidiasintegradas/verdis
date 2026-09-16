import type { ReactNode } from 'react'

export type StatusTone = 'neutral' | 'positive' | 'processing' | 'attention' | 'error'

type StatusBadgeProps = {
  children: ReactNode
  tone?: StatusTone
}

export function StatusBadge({ children, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span className="v-status-badge" data-tone={tone}>
      {children}
    </span>
  )
}
