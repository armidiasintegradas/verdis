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
  navigate: (to: string) => void
}

const RouterContext = createContext<RouterContextValue | null>(null)

type RouterProviderProps = {
  children: ReactNode
  initialPath?: string
}

export function RouterProvider({ children, initialPath }: RouterProviderProps) {
  const [pathname, setPathname] = useState(
    () => initialPath ?? window.location.pathname ?? '/',
  )

  useEffect(() => {
    if (initialPath) return undefined

    const handlePopState = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [initialPath])

  const navigate = useCallback(
    (to: string) => {
      if (to === pathname) return

      if (!initialPath) {
        window.history.pushState({}, '', to)
      }
      setPathname(to)
    },
    [initialPath, pathname],
  )

  const value = useMemo(() => ({ pathname, navigate }), [pathname, navigate])

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
