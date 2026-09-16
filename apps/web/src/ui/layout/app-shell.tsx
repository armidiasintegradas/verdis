import type { ReactNode } from 'react'
import { RouterLink, useRouter } from '@/app/router'
import { ScopeSelector } from '@/features/scope/scope-selector'
import { Avatar } from '@/ui/components/avatar'
import { Icon, type IconName } from '@/ui/components/icon'
import './app-shell.css'

const navItems = [
  ['Início', '/', 'home'],
  ['Recebimentos', '/recebimentos', 'receive'],
  ['Estoque', '/estoque', 'stock'],
  ['Vendas', '/vendas', 'sales'],
  ['Documentos', '/documentos', 'document'],
  ['Pendências', '/pendencias', 'pending'],
] as const satisfies ReadonlyArray<readonly [string, string, IconName]>

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
            {navItems.map(([label, href, icon]) => {
              const active = pathname === href
              return (
                <RouterLink
                  key={href}
                  to={href}
                  className={`v-shell__nav-link${active ? ' is-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="v-shell__nav-icon"><Icon name={icon} size={19} /></span>
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
          <span className="v-shell__settings" aria-label="Configurações" role="img"><Icon name="settings" size={18} /></span>
        </div>
      </aside>

      <div className="v-shell__main">
        <header className="v-shell__header">
          <div className="v-shell__unit">
            <span className="v-shell__header-icon"><Icon name="building" size={18} /></span>
            <span><small>UNIDADE OPERACIONAL</small><strong>Cooperativa Demo · M1 Pilot</strong></span>
            <div className="v-shell__scope-control"><ScopeSelector /></div>
          </div>

          <div className="v-shell__operation">
            <span className="v-shell__operation-dot" aria-hidden="true" />
            <span>OPERAÇÃO ATIVA · GALPÃO 01</span>
          </div>

          <label className="v-shell__search">
            <Icon name="search" size={18} />
            <span className="v-visually-hidden">Buscar na Verdis</span>
            <input type="search" placeholder="Buscar na Verdis..." />
          </label>

          <button className="v-shell__icon-button" type="button" aria-label="Notificações">
            <Icon name="bell" size={19} />
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
