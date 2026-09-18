import { RouterLink } from '@/app/router'

type BreadcrumbItem = {
  label: string
  href?: string
}

type BreadcrumbProps = {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="v-breadcrumb">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} style={{ display: 'contents' }}>
            {index > 0 ? <span className="v-breadcrumb__separator">/</span> : null}
            {item.href ? <RouterLink to={item.href}>{item.label}</RouterLink> : <span>{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}
