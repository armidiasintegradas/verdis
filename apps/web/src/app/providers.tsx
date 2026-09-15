import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/features/auth/auth-provider'
import { LoginPage } from '@/features/auth/login-page'
import { ScopeProvider, useScope } from '@/features/scope/scope-provider'
import { ScopeSelector } from '@/features/scope/scope-selector'

function ScopeBoundary({ children }: { children: ReactNode }) {
  const { memberships, activeScope, loading, error } = useScope()

  if (loading) {
    return <main><p>Carregando escopos de acesso…</p></main>
  }

  if (error) {
    return <main><p role="alert">Não foi possível carregar seus acessos: {error.message}</p></main>
  }

  if (memberships.length === 0 || !activeScope) {
    return <main><p>Nenhum escopo de acesso ativo foi encontrado para este usuário.</p></main>
  }

  return (
    <>
      <header>
        <ScopeSelector />
      </header>
      {children}
    </>
  )
}

function SessionBoundary({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return <main><p>Carregando sessão…</p></main>
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <ScopeProvider>
      <ScopeBoundary>{children}</ScopeBoundary>
    </ScopeProvider>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionBoundary>{children}</SessionBoundary>
      </AuthProvider>
    </QueryClientProvider>
  )
}
