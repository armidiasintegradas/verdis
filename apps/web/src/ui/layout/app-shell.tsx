import type { ReactNode } from 'react'
import { RouterLink, useRouter } from '@/app/router'
import { ScopeSelector } from '@/features/scope/scope-selector'
import { Avatar } from '@/ui/components/avatar'
import './app-shell.css'

const navItems = [
  ['Início', '/'],
  ['Recebimentos', '/recebimentos'],
  ['Estoque', '/estoque'],
  ['Vendas', '/vendas'],
  ['Documentos', '/documentos'],
  ['Pendências', '/pendencias'],
] as const

const navGlyphs: Record<(typeof navItems)[number][0], string> = {
  Início: '⌂',
  Recebimentos: '⊞',
  Estoque: '◇',
  Vendas: '▱',
  Documentos: '▤',
  Pendências: '!',
}

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { pathname } = useRouter()

  return (
    <div className="v-shell">
      <aside className="v-shell__sidebar">
        <div>
          <div className="v-shell__brand">verdis.</div>
          <div className="v-shell__environment">
            <span className="v-shell__environment-dot" aria-hidden="true" />
            <span><small>AMBIENTE</small>M1 Cooperative Pilot</span>
          </div>

          <nav className="v-shell__nav" aria-label="Navegação principal">
            {navItems.map(([label, href]) => {
              const active = pathname === href
              return (
                <RouterLink
                  key={href}
                  to={href}
                  className={`v-shell__nav-link${active ? ' is-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="v-shell__nav-icon" aria-hidden="true">{navGlyphs[label]}</span>
                  <span>{label}</span>
                  {label === 'Pendências' ? <span className="v-shell__nav-count" aria-hidden="true">3</span> : null}
                </RouterLink>
              )
            })}
          </nav>
        </div>

        <div className="v-shell__sidebar-user">
          <Avatar size={32} />
          <span className="v-shell__sidebar-user-copy"><strong>Maria</strong><small>Gestora</small></span>
          <span className="v-shell__settings" aria-label="Configurações" role="img">⚙</span>
        </div>
      </aside>

      <div className="v-shell__main">
        <header className="v-shell__header">
          <div className="v-shell__unit">
            <span className="v-shell__header-icon" aria-hidden="true">▥</span>
            <span><small>UNIDADE OPERACIONAL</small><strong>Cooperativa Demo · M1 Pilot</strong></span>
            <div className="v-shell__scope-control"><ScopeSelector /></div>
          </div>

          <div className="v-shell__operation">
            <span className="v-shell__operation-dot" aria-hidden="true" />
            <span>OPERAÇÃO ATIVA · GALPÃO 01</span>
          </div>

          <label className="v-shell__search">
            <span aria-hidden="true">⌕</span>
            <span className="v-visually-hidden">Buscar na Verdis</span>
            <input type="search" placeholder="Buscar na Verdis..." />
          </label>

          <button className="v-shell__icon-button" type="button" aria-label="Notificações">
            <span aria-hidden="true">♢</span>
            <span className="v-shell__notification-dot" aria-hidden="true" />
          </button>

          <div className="v-shell__identity">
            <Avatar />
            <span><strong>Maria — Gestora</strong><small><i aria-hidden="true" />Sessão conectada</small></span>
          </div>
        </header>

        <main className="v-shell__content">{children}</main>
      </div>
    </div>
  )
}
