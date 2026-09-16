import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'

type RouterContextValue = {
  pathname: string
  search: string
  navigate: (to: string) => void
}

type RouterLocation = {
  pathname: string
  search: string
}

const RouterContext = createContext<RouterContextValue | null>(null)

type RouterProviderProps = {
  children: ReactNode
  initialPath?: string
}

function parseLocation(to: string, base: string): RouterLocation {
  const url = new URL(to, base)
  return { pathname: url.pathname, search: url.search }
}

function browserLocation(): RouterLocation {
  return {
    pathname: window.location.pathname || '/',
    search: window.location.search,
  }
}

export function RouterProvider({ children, initialPath }: RouterProviderProps) {
  const [location, setLocation] = useState<RouterLocation>(() =>
    initialPath
      ? parseLocation(initialPath, 'http://verdis.local')
      : browserLocation(),
  )

  useEffect(() => {
    if (initialPath) return undefined

    const handlePopState = () => setLocation(browserLocation())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [initialPath])

  const navigate = useCallback(
    (to: string) => {
      const next = parseLocation(
        to,
        initialPath ? 'http://verdis.local' : window.location.origin,
      )

      if (next.pathname === location.pathname && next.search === location.search) {
        return
      }

      if (!initialPath) {
        window.history.pushState({}, '', `${next.pathname}${next.search}`)
      }

      setLocation(next)
    },
    [initialPath, location.pathname, location.search],
  )

  const value = useMemo(
    () => ({ pathname: location.pathname, search: location.search, navigate }),
    [location.pathname, location.search, navigate],
  )

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function useRouter() {
  const context = useContext(RouterContext)
  if (!context) {
    throw new Error('useRouter must be used inside RouterProvider')
  }
  return context
}

type RouterLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string
}

export function RouterLink({ to, onClick, ...props }: RouterLinkProps) {
  const { navigate } = useRouter()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    event.preventDefault()
    navigate(to)
  }

  return <a {...props} href={to} onClick={handleClick} />
}
