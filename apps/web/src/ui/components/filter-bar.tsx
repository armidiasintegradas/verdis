import type { ReactNode } from 'react'
import { Card } from './card'

type FilterBarProps = {
  children: ReactNode
}

export function FilterBar({ children }: FilterBarProps) {
  return <Card className="v-filter-bar">{children}</Card>
}
