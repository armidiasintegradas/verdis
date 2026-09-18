import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'home'
  | 'receive'
  | 'stock'
  | 'sales'
  | 'document'
  | 'pending'
  | 'building'
  | 'search'
  | 'bell'
  | 'settings'
  | 'menu'
  | 'close'


type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  name: IconName
  size?: number
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  const paths = {
    home: <><path d="M4 10.5 12 4l8 6.5" /><path d="M6.5 9.5V20h11V9.5" /><path d="M10 20v-6h4v6" /></>,
    receive: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 8v8M8 12h8" /></>,
    stock: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.5 7.8 7.5 4.3 7.5-4.3M12 12.1V21" /></>,
    sales: <><path d="M4 9h16l-1.4-4H5.4L4 9Z" /><path d="M6 9v10h12V9" /><path d="M9 19v-5h6v5" /></>,
    document: <><path d="M7 3h7l4 4v14H7V3Z" /><path d="M14 3v5h5M10 12h5M10 16h5" /></>,
    pending: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 17h.01" /></>,
    building: <><path d="M5 21V5l7-2v18M12 8h7v13" /><path d="M8 8h1M8 12h1M8 16h1M15 11h1M15 15h1" /></>,
    search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
    bell: <><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 6 2.5 6 2.5 7.5H4c0-1.5 2.5-1.5 2.5-7.5Z" /><path d="M10 20h4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    close: <><path d="M18 6 6 18M6 6l12 12" /></>,
  } satisfies Record<IconName, ReactNode>


  return <svg {...common} {...props}>{paths[name]}</svg>
}
