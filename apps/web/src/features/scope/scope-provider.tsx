import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { activeScopeSchema, type ActiveScope } from '@/domain/scope'
import { loadActiveMembershipScopes } from './load-active-membership-scopes'

const STORAGE_KEY = 'verdis.activeScope'

export type ScopeMembership = ActiveScope & {
  membershipId: string
  roleId: string
}

type ScopeContextValue = {
  memberships: ScopeMembership[]
  activeScope: ActiveScope | null
  loading: boolean
  error: Error | null
  selectScope: (scope: ActiveScope) => boolean
  reload: () => Promise<void>
}

const ScopeContext = createContext<ScopeContextValue | null>(null)

function scopeFromMembership(membership: ScopeMembership): ActiveScope {
  return {
    tenantId: membership.tenantId,
    organizationId: membership.organizationId,
    unitId: membership.unitId,
  }
}

function scopesMatch(left: ActiveScope, right: ActiveScope) {
  return (
    left.tenantId === right.tenantId &&
    left.organizationId === right.organizationId &&
    left.unitId === right.unitId
  )
}

function readPersistedScope(): ActiveScope | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const result = activeScopeSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data : null
  } catch {
    return null
  }
}

function persistScope(scope: ActiveScope) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scope))
}

type ScopeProviderProps = {
  children: ReactNode
  loadMemberships?: () => Promise<ScopeMembership[]>
}

export function ScopeProvider({
  children,
  loadMemberships = loadActiveMembershipScopes,
}: ScopeProviderProps) {
  const [memberships, setMemberships] = useState<ScopeMembership[]>([])
  const [activeScope, setActiveScope] = useState<ActiveScope | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const nextMemberships = await loadMemberships()
      setMemberships(nextMemberships)

      if (nextMemberships.length === 0) {
        setActiveScope(null)
        localStorage.removeItem(STORAGE_KEY)
        return
      }

      const persisted = readPersistedScope()
      const persistedIsAllowed =
        persisted !== null &&
        nextMemberships.some((membership) =>
          scopesMatch(scopeFromMembership(membership), persisted),
        )

      const nextScope = persistedIsAllowed
        ? persisted
        : scopeFromMembership(nextMemberships[0])

      setActiveScope(nextScope)
      persistScope(nextScope)
    } catch (cause) {
      setMemberships([])
      setActiveScope(null)
      setError(cause instanceof Error ? cause : new Error('Unable to load access scopes'))
    } finally {
      setLoading(false)
    }
  }, [loadMemberships])

  useEffect(() => {
    void reload()
  }, [reload])

  const selectScope = useCallback(
    (scope: ActiveScope) => {
      const parsed = activeScopeSchema.safeParse(scope)
      if (!parsed.success) return false

      const allowed = memberships.some((membership) =>
        scopesMatch(scopeFromMembership(membership), parsed.data),
      )
      if (!allowed) return false

      setActiveScope(parsed.data)
      persistScope(parsed.data)
      return true
    },
    [memberships],
  )

  const value = useMemo<ScopeContextValue>(
    () => ({ memberships, activeScope, loading, error, selectScope, reload }),
    [memberships, activeScope, loading, error, selectScope, reload],
  )

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
}

export function useScope() {
  const context = useContext(ScopeContext)
  if (!context) {
    throw new Error('useScope must be used inside ScopeProvider')
  }
  return context
}
